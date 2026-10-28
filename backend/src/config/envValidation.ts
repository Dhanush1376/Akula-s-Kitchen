/**
 * Shared environment variable validation (startup + CI).
 */

const baseRequiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'FIELD_ENCRYPTION_KEY',
  'JWT_EXPIRES_IN',
  'ADMIN_EMAIL',
];

const productionRequiredEnvVars = [
  'ADMIN_PASSWORD',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'REDIS_URL',
];

export const collectMissingEnvVars = (options?: { ciMode?: boolean }): string[] => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredEnvVars = isProduction
    ? [...baseRequiredEnvVars, ...productionRequiredEnvVars]
    : baseRequiredEnvVars;

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (isProduction || options?.ciMode) {
    const brevoKey = process.env.BREVO_API_KEY?.trim();
    const hasBrevo = Boolean(brevoKey);
    const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasBrevo && !hasSmtp) {
      missingVars.push('BREVO_API_KEY (or SMTP_USER + SMTP_PASS)');
    } else if (brevoKey?.startsWith('xsmtpsib-')) {
      process.stdout.write(
        '\x1b[33m⚠️ WARNING: BREVO_API_KEY starts with "xsmtpsib-" (SMTP key). Cloud hosts like Render block SMTP ports. Generate a Brevo REST API key ("xkeysib-...") for port 443 delivery.\x1b[0m\n',
      );
    }

    const smsProvider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
    if (smsProvider === 'fast2sms' && !process.env.FAST2SMS_API_KEY) {
      missingVars.push('FAST2SMS_API_KEY (required when SMS_PROVIDER is set to fast2sms)');
    }
  }

  const encKey = process.env.FIELD_ENCRYPTION_KEY;
  if (!encKey || encKey.length < 32) {
    missingVars.push(
      'FIELD_ENCRYPTION_KEY (must be min 32 chars/bytes for secure AES-256 entropy)',
    );
  }
  if (encKey && encKey === process.env.JWT_SECRET) {
    missingVars.push('FIELD_ENCRYPTION_KEY (must be distinct from JWT_SECRET)');
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    missingVars.push('REDIS_URL (must start with redis:// or rediss:// for secure connections)');
  }

  if (isProduction) {
    if ((process.env.JWT_SECRET || '').length < 32) {
      missingVars.push('JWT_SECRET (min 32 characters in production)');
    }
    if (!process.env.RAZORPAY_KEY_ID) missingVars.push('RAZORPAY_KEY_ID');
    if (!process.env.RAZORPAY_KEY_SECRET) missingVars.push('RAZORPAY_KEY_SECRET');
  }

  if (!process.env.GROQ_API_KEY) {
    process.stdout.write(
      '\x1b[33m⚠️ WARNING: GROQ_API_KEY is missing. AI auto-fill features will fail.\x1b[0m\n',
    );
  }

  return missingVars;
};
