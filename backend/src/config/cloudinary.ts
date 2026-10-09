import logger from './logger';

let cloudinaryInstance: any = null;
let configured = false;

export const getCloudinary = (): any => {
  if (cloudinaryInstance && configured) {
    return cloudinaryInstance;
  }

  const { v2: cloudinary } = require('cloudinary');
  const cleanVal = (val?: string) =>
    val
      ? val
          .trim()
          .replace(/^["']|["']$/g, '')
          .trim()
      : '';

  let cloudName = cleanVal(process.env.CLOUDINARY_CLOUD_NAME);
  let apiKey = cleanVal(process.env.CLOUDINARY_API_KEY);
  let apiSecret = cleanVal(process.env.CLOUDINARY_API_SECRET);

  if ((!cloudName || !apiKey || !apiSecret) && process.env.CLOUDINARY_URL) {
    const match = cleanVal(process.env.CLOUDINARY_URL).match(
      /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/,
    );
    if (match) {
      apiKey = apiKey || match[1];
      apiSecret = apiSecret || match[2];
      cloudName = cloudName || match[3];
    }
  }

  if (!cloudName || !apiKey || !apiSecret) {
    logger.error(
      `[CLOUDINARY CONFIG ERROR] Cloudinary credentials missing! cloud_name=${cloudName ? 'OK' : 'MISSING'}, api_key=${apiKey ? 'OK' : 'MISSING'}, api_secret=${apiSecret ? 'OK' : 'MISSING'}`,
    );
  } else if (!configured) {
    logger.info(
      `[CLOUDINARY INITIALIZATION] Cloudinary SDK configured. cloud_name=${cloudName}, key=${apiKey.slice(0, 4)}***`,
    );
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    configured = true;
  }

  cloudinaryInstance = cloudinary;
  return cloudinaryInstance!;
};

export default getCloudinary;
