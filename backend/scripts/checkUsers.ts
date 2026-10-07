import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    const users = await User.find({}).select('email name role isVerified');
    console.log('TOTAL USERS IN DB:', users.length);
    console.log('USERS:', users);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Check failed:', err);
  }
}
check();
