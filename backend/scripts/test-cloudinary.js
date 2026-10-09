const path = require('path');
const dotenv = require('dotenv');

// Load environment files
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

console.log('==============================================');
console.log('   CLOUDINARY CREDENTIALS VERIFICATION TEST   ');
console.log('==============================================\n');

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Missing Cloudinary configuration:');
  console.log(
    `- CLOUDINARY_CLOUD_NAME: ${cloudName ? 'Defined (' + cloudName.length + ' chars)' : 'MISSING'}`,
  );
  console.log(
    `- CLOUDINARY_API_KEY:    ${apiKey ? 'Defined (' + apiKey.length + ' chars)' : 'MISSING'}`,
  );
  console.log(
    `- CLOUDINARY_API_SECRET: ${apiSecret ? 'Defined (' + apiSecret.length + ' chars)' : 'MISSING'}`,
  );
  console.log(
    '\nPlease set these variables in backend/.env.local or your deployment platform (Render).',
  );
  process.exit(1);
}

console.log(`- Cloud Name: ${cloudName}`);
console.log(`- API Key:    ${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (${apiKey.length} chars)`);
console.log(`- API Secret: ***hidden*** (${apiSecret.length} chars)\n`);

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

async function runCheck() {
  console.log('1. Testing Cloudinary Admin API authentication...');
  try {
    await new Promise((resolve, reject) => {
      cloudinary.api.ping((err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
    console.log('   ✅ Cloudinary API authentication SUCCESS!\n');
  } catch (err) {
    console.error(
      `   ❌ Cloudinary API ping failed (HTTP ${err.http_code || 500}): ${err.message}`,
    );
    if (err.message && err.message.includes('api_secret mismatch')) {
      console.error('\n   ⚠️ ROOT CAUSE: "api_secret mismatch"');
      console.error(
        '   The CLOUDINARY_API_SECRET does NOT match the CLOUDINARY_API_KEY in Cloudinary.',
      );
      console.error('   How to fix:');
      console.error('   1. Log in to https://cloudinary.com/console');
      console.error('   2. Go to Settings (gear icon) -> "API Keys"');
      console.error('   3. Check the API Key: find ' + apiKey);
      console.error('   4. Copy the matching API Secret (or generate a new API key pair)');
      console.error(
        '   5. Update CLOUDINARY_API_SECRET in backend/.env.local AND in the Render Dashboard',
      );
    }
    process.exit(1);
  }

  console.log('2. Testing Cloudinary upload stream with a test pixel...');
  try {
    const testPixel =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await cloudinary.uploader.upload(testPixel, {
      folder: 'akulas-kitchen/diagnostics',
      public_id: `test-diag-${Date.now()}`,
    });
    console.log(`   ✅ Test upload succeeded! URL: ${uploadRes.secure_url}`);

    // Cleanup test asset
    await cloudinary.uploader.destroy(uploadRes.public_id).catch(() => {});
    console.log('   ✅ Test asset successfully cleaned up.\n');
  } catch (uploadErr) {
    console.error(
      `   ❌ Test upload failed (HTTP ${uploadErr.http_code || 500}): ${uploadErr.message}`,
    );
    process.exit(1);
  }

  console.log('==============================================');
  console.log('✅ ALL CLOUDINARY TESTS PASSED SUCCESSFULLY!');
  console.log('==============================================');
}

runCheck();
