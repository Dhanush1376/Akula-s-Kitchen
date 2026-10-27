/**
 * Re-hosts product images that were saved to a server's local disk (relative
 * `/uploads/...` URLs) onto Cloudinary, and points the product at the durable URL.
 *
 * Why: a failed Cloudinary upload used to fall back silently to local disk. Those
 * files live only on one machine (and are wiped on every Render deploy), so other
 * devices see "Image unavailable".
 *
 * Safety:
 *  - Dry run by default: reports what it would do, uploads and writes nothing.
 *  - Verifies Cloudinary credentials (api.ping) before uploading anything.
 *  - Each product field is updated only if it still holds the exact old URL.
 *  - Local files are never deleted. References whose file cannot be found are
 *    reported and left untouched (they must be re-uploaded through the admin UI).
 *  - Safe to re-run: migrated references no longer match `/uploads/`.
 *
 * Dry run:  npx tsx scripts/migrations/migrate-local-images-to-cloudinary.ts
 * Apply:    npx tsx scripts/migrations/migrate-local-images-to-cloudinary.ts --apply
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const APPLY = process.argv.includes('--apply');
const BACKEND_ROOT = path.join(__dirname, '..', '..');
const SEARCH_ROOTS = [
  path.join(BACKEND_ROOT, 'uploads'),
  path.join(BACKEND_ROOT, '..', 'frontend', 'public', 'uploads'),
];

const isLocalUpload = (url: unknown): url is string =>
  typeof url === 'string' && url.startsWith('/uploads/');

const findLocalFile = (url: string): string | null => {
  const relative = url.replace(/^\/uploads\//, '').split('?')[0];
  if (relative.includes('..')) return null;
  for (const root of SEARCH_ROOTS) {
    const candidate = path.join(root, relative);
    if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) return candidate;
  }
  return null;
};

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set; refusing to guess a database.');
  }

  // Imported lazily so dotenv has populated the Cloudinary variables first.
  const { default: getCloudinary } = await import('../../src/config/cloudinary');
  const cloudinary = getCloudinary();

  try {
    await cloudinary.api.ping();
  } catch (err: any) {
    const reason = err?.error?.message || err?.message || 'unknown error';
    throw new Error(`Cloudinary credentials rejected (${reason}). Fix them before migrating.`);
  }

  await mongoose.connect(mongoUri);
  const products = mongoose.connection.collection('products');
  const docs = await products
    .find(
      { $or: [{ imageSrc: /^\/uploads\// }, { images: /^\/uploads\// }] },
      { projection: { title: 1, imageSrc: 1, images: 1 } },
    )
    .toArray();

  console.log(
    `${APPLY ? 'APPLY' : 'DRY RUN'} — database "${mongoose.connection.db?.databaseName}"`,
  );
  console.log(`Products with local image references: ${docs.length}`);

  const uploaded = new Map<string, string>();
  const missing = new Set<string>();
  let updatedFields = 0;

  const migrateUrl = async (url: string): Promise<string | null> => {
    if (uploaded.has(url)) return uploaded.get(url)!;
    const file = findLocalFile(url);
    if (!file) {
      missing.add(url);
      return null;
    }
    if (!APPLY) {
      uploaded.set(url, `<would upload ${path.basename(file)}>`);
      return uploaded.get(url)!;
    }
    const result = await cloudinary.uploader.upload(file, {
      folder: 'akulas-kitchen/products',
      resource_type: 'image',
      overwrite: false,
      unique_filename: true,
    });
    uploaded.set(url, result.secure_url);
    return result.secure_url;
  };

  for (const doc of docs) {
    const label = String(doc.title || doc._id);

    if (isLocalUpload(doc.imageSrc)) {
      const next = await migrateUrl(doc.imageSrc);
      if (next) {
        console.log(`  [imageSrc] ${label}: ${doc.imageSrc} -> ${next}`);
        if (APPLY) {
          const res = await products.updateOne(
            { _id: doc._id, imageSrc: doc.imageSrc },
            { $set: { imageSrc: next } },
          );
          updatedFields += res.modifiedCount;
        }
      }
    }

    for (const img of (doc.images || []) as unknown[]) {
      if (!isLocalUpload(img)) continue;
      const next = await migrateUrl(img);
      if (next) {
        console.log(`  [images]   ${label}: ${img} -> ${next}`);
        if (APPLY) {
          const res = await products.updateOne(
            { _id: doc._id, images: img },
            { $set: { 'images.$': next } },
          );
          updatedFields += res.modifiedCount;
        }
      }
    }
  }

  console.log(`\nFiles ${APPLY ? 'uploaded' : 'to upload'}: ${uploaded.size}`);
  if (APPLY) console.log(`Product fields updated: ${updatedFields}`);
  if (missing.size > 0) {
    console.log(
      `\nUnrecoverable (file not found locally — re-upload via admin UI): ${missing.size}`,
    );
    for (const url of missing) console.log(`  ${url}`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(`[migrate-local-images] ${err.message}`);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
