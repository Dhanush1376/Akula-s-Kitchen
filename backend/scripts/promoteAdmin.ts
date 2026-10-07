import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function promoteAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    const email = (process.env.ADMIN_EMAIL || 'dhanush1376@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Akulaskitchen8182';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const updated = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          role: 'super_admin',
          isVerified: true,
          passwordHash,
        },
      },
      { new: true },
    );

    console.log('✅ Admin account updated in DB:', {
      id: updated?._id,
      email: updated?.email,
      name: updated?.name,
      role: updated?.role,
      hasPassword: !!updated?.passwordHash,
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Failed to promote admin:', err);
  }
}
promoteAdmin();
