import api from '../api';
import axios from 'axios';
import logger from '../../utils/core/logger';
import { EXTERNAL_URLS } from '../../config/constants';

let imageCompression = null;
const getImageCompression = async () => {
  if (!imageCompression) {
    const mod = await import('browser-image-compression');
    imageCompression = mod.default;
  }
  return imageCompression;
};

const DEFAULT_COMPRESSION_OPTIONS = {
  maxSizeMB: 1, // maximum size in MB
  maxWidthOrHeight: 1920, // max resolution
  useWebWorker: true, // Use multi-threading
  initialQuality: 0.8, // default quality
};

export const uploadWithRetry = async (uploadFn, formData, retries = 3, delayMs = 1500) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFn(formData);
    } catch (error) {
      lastError = error;
      logger.warn(
        `[UPLOAD RETRY] Frontend upload attempt ${attempt}/${retries} failed. Retrying...`,
        error,
      );
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError || new Error(`Upload failed after ${retries} attempts`);
};

export const uploadDirectToCloudinary = async (
  formData,
  isSingle = false,
  targetFolder = null,
  onProgress = null,
) => {
  const url = targetFolder
    ? `/upload/signed-url?folder=${encodeURIComponent(targetFolder)}`
    : '/upload/signed-url';
  const sigRes = await api.get(url);
  logger.debug('SIGNED URL RESPONSE:', sigRes);
  const { signature, timestamp, cloudName, apiKey, folder, uploadUrl } =
    sigRes.data?.data || sigRes.data || {};

  const files = [];
  for (let value of formData.values()) {
    if (value instanceof File || value instanceof Blob) {
      // Compress if it's a valid image exceeding 1.5MB (skip SVGs, GIFs, and already-compressed mobile files)
      if (
        value.type.startsWith('image/') &&
        !value.type.includes('svg') &&
        !value.type.includes('gif') &&
        value.size > 1.5 * 1024 * 1024
      ) {
        try {
          const compressor = await getImageCompression();
          const compressedFile = await compressor(value, DEFAULT_COMPRESSION_OPTIONS);
          logger.debug(
            `[UPLOAD] Compressed ${value.name}: ${(value.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
          );
          files.push(compressedFile);
        } catch (error) {
          logger.error('[UPLOAD] Error compressing image, using original file', error);
          files.push(value);
        }
      } else {
        files.push(value);
      }
    } else if (typeof value === 'string' && value.startsWith('http')) {
      // Handle direct URLs (Cloudinary supports uploading from remote URLs)
      const urls = value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.startsWith('http'));

      for (const u of urls) {
        // Push the URL string directly. Cloudinary natively supports uploading from a remote URL,
        // avoiding client-side CORS issues entirely.
        files.push(u);
      }
    }
  }

  if (files.length === 0) {
    throw new Error('No valid files or URLs provided for upload.');
  }

  const uploadPromises = files.map(async (file) => {
    const cloudinaryData = new FormData();
    cloudinaryData.append('file', file);
    cloudinaryData.append('api_key', apiKey);
    cloudinaryData.append('timestamp', timestamp);
    cloudinaryData.append('signature', signature);
    cloudinaryData.append('folder', folder);

    const res = await axios.post(
      uploadUrl || `${EXTERNAL_URLS.CLOUDINARY_UPLOAD_BASE}/${cloudName}/image/upload`,
      cloudinaryData,
      {
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(file.name, percent);
          }
        },
      },
    );
    return res.data;
  });

  let results;
  try {
    results = await Promise.all(uploadPromises);
  } catch (directErr) {
    const directErrorMessage =
      directErr.response?.data?.error?.message || directErr.message || 'Direct upload failed';
    logger.warn(
      '[UPLOAD] Direct Cloudinary upload failed, attempting fallback to backend upload:',
      directErrorMessage,
    );
    try {
      const backendFormData = new FormData();
      for (const f of files) {
        if (f instanceof File || f instanceof Blob) {
          backendFormData.append('images', f, f.name || 'image.jpg');
        }
      }
      const backendRes = await api.post('/upload/products', backendFormData);
      if (backendRes.data?.success && backendRes.data?.images) {
        return {
          success: true,
          url: backendRes.data.images[0],
          images: backendRes.data.images,
        };
      }
    } catch (fallbackErr) {
      const fallbackErrorMessage =
        fallbackErr.response?.data?.message || fallbackErr.message || 'Backend upload failed';
      logger.error('[UPLOAD] Fallback upload also failed:', fallbackErrorMessage, fallbackErr);
      const combinedError = new Error(
        fallbackErr.response?.data?.message ||
          directErr.response?.data?.error?.message ||
          fallbackErr.message ||
          directErr.message ||
          'Failed to upload images',
      );
      combinedError.response = fallbackErr.response || directErr.response;
      throw combinedError;
    }
    const finalErr = new Error(directErrorMessage);
    finalErr.response = directErr.response;
    throw finalErr;
  }

  const urls = results.map((r) => r.secure_url || r.url);

  if (isSingle) {
    return { success: true, url: urls[0] };
  } else {
    return { success: true, images: urls };
  }
};
