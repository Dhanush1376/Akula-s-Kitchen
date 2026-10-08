export const isHeicFile = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
};

export const compressImage = async (file, maxDimension = 1600) => {
  if (!file) return file;
  const isHeic = isHeicFile(file);
  const initialSize = file.size || 0;

  // If file is already small (< 500KB) AND is already a standard web format (not HEIC), skip recompression.
  if (initialSize < 500 * 1024 && !isHeic && (file.type || '').startsWith('image/')) {
    return file;
  }

  // Determine quality dynamically based on file size
  let quality = 0.8;
  if (initialSize > 5 * 1024 * 1024) {
    quality = 0.65;
  } else if (initialSize > 2 * 1024 * 1024) {
    quality = 0.75;
  }

  const rawName = file.name || 'product_photo';
  const dotIdx = rawName.lastIndexOf('.');
  const baseName = dotIdx > 0 ? rawName.substring(0, dotIdx) : rawName;
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'product_photo';
  const mimeType = 'image/jpeg';

  const drawAndExport = (drawable, origWidth, origHeight) => {
    return new Promise((resolve) => {
      let width = origWidth || 1200;
      let height = origHeight || 1200;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

      // White background for transparent PNGs or converted images
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(drawable, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          // If original was HEIC, we MUST return JPEG even if larger
          if (blob.size >= initialSize && !isHeic) {
            resolve(file);
          } else {
            const newFile = new File([blob], `${cleanBaseName}.jpg`, {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(newFile);
          }
        },
        mimeType,
        quality,
      );
    });
  };

  // Strategy 1: createImageBitmap (handles HEIC natively in modern Safari/iOS and is fast & non-blocking)
  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file);
      const res = await drawAndExport(bitmap, bitmap.width, bitmap.height);
      bitmap.close?.();
      return res;
    } catch (_bitmapErr) {
      // Fallback to Image element
    }
  }

  // Strategy 2: Image object with FileReader
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = async () => {
        try {
          const res = await drawAndExport(
            img,
            img.width || img.naturalWidth,
            img.height || img.naturalHeight,
          );
          resolve(res);
        } catch (_err) {
          resolve(file);
        }
      };

      img.onerror = () => {
        resolve(file); // Safe fallback
      };
    };

    reader.onerror = () => {
      resolve(file); // Safe fallback
    };
  });
};

export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
