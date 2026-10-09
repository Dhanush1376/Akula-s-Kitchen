import dotenv from 'dotenv';
import { validateEnv } from './envSchema';

// 1. Immediately parse environment variables
dotenv.config({ path: '.env.local' }); // Local overrides (ignored by git)
dotenv.config(); // Standard fallback

const cleanVal = (val?: string) =>
  val
    ? val
        .trim()
        .replace(/^["']|["']$/g, '')
        .trim()
    : '';

// Support CLOUDINARY_URL (e.g. cloudinary://api_key:api_secret@cloud_name)
if (process.env.CLOUDINARY_URL) {
  const parsed = cleanVal(process.env.CLOUDINARY_URL);
  const match = parsed.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (match) {
    if (!process.env.CLOUDINARY_API_KEY) process.env.CLOUDINARY_API_KEY = match[1];
    if (!process.env.CLOUDINARY_API_SECRET) process.env.CLOUDINARY_API_SECRET = match[2];
    if (!process.env.CLOUDINARY_CLOUD_NAME) process.env.CLOUDINARY_CLOUD_NAME = match[3];
  }
}

// Strip accidental surrounding quotes or whitespace from credentials
if (process.env.CLOUDINARY_CLOUD_NAME) {
  process.env.CLOUDINARY_CLOUD_NAME = cleanVal(process.env.CLOUDINARY_CLOUD_NAME);
}
if (process.env.CLOUDINARY_API_KEY) {
  process.env.CLOUDINARY_API_KEY = cleanVal(process.env.CLOUDINARY_API_KEY);
}
if (process.env.CLOUDINARY_API_SECRET) {
  process.env.CLOUDINARY_API_SECRET = cleanVal(process.env.CLOUDINARY_API_SECRET);
}

// 2. Validate all mandatory backend settings
validateEnv();
