import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const uploadStream = vi.fn();

vi.mock('../../src/config/cloudinary', () => ({
  default: () => ({ uploader: { upload_stream: uploadStream } }),
}));

import { CloudinaryAdapter } from '../../src/services/media/CloudinaryAdapter';

const failWith = (err: any) => {
  uploadStream.mockImplementation((_opts: any, cb: (e: any, r: any) => void) => ({
    end: () => cb(err, null),
  }));
};

const localUploadDir = () => path.resolve(process.cwd(), 'uploads', 'akulas-kitchen', 'products');

describe('CloudinaryAdapter.upload storage failure handling', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    uploadStream.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects with 503 in production instead of writing to local disk', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_LOCAL_MEDIA_FALLBACK = 'true'; // must be ignored in production
    failWith({ http_code: 401, message: 'api_secret mismatch' });
    const publicId = `regression-prod-${Date.now()}`;

    await expect(
      CloudinaryAdapter.upload(Buffer.from('x'), {
        folder: 'akulas-kitchen/products',
        publicId,
        resourceType: 'image',
      }),
    ).rejects.toMatchObject({ statusCode: 503 });

    const dir = localUploadDir();
    const leaked = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.startsWith(publicId))
      : [];
    expect(leaked).toEqual([]);
  });

  it('rejects in development unless local fallback is explicitly enabled', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_LOCAL_MEDIA_FALLBACK;
    failWith(new Error('ETIMEDOUT'));

    await expect(
      CloudinaryAdapter.upload(Buffer.from('x'), {
        folder: 'products',
        publicId: `regression-dev-${Date.now()}`,
        resourceType: 'image',
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it('only allows the local fallback with explicit opt-in outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_LOCAL_MEDIA_FALLBACK = 'true';
    expect(CloudinaryAdapter.isLocalFallbackAllowed()).toBe(true);

    process.env.NODE_ENV = 'production';
    expect(CloudinaryAdapter.isLocalFallbackAllowed()).toBe(false);

    process.env.NODE_ENV = 'development';
    process.env.ALLOW_LOCAL_MEDIA_FALLBACK = 'false';
    expect(CloudinaryAdapter.isLocalFallbackAllowed()).toBe(false);
  });

  it('returns the durable secure URL on success', async () => {
    uploadStream.mockImplementation((_opts: any, cb: (e: any, r: any) => void) => ({
      end: () =>
        cb(null, {
          public_id: 'akulas-kitchen/products/p1',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/akulas-kitchen/products/p1.webp',
          width: 10,
          height: 10,
          format: 'webp',
          bytes: 1,
          resource_type: 'image',
        }),
    }));

    const result = await CloudinaryAdapter.upload(Buffer.from('x'), {
      folder: 'akulas-kitchen/products',
      publicId: 'p1',
      resourceType: 'image',
    });
    expect(result.secureUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  });
});
