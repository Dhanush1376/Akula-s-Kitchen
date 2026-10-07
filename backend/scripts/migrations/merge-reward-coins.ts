/**
 * Moves customer reward-coin balances from the retired `siriCoins` field into
 * `rewardCoins`, which is what the application now reads and writes.
 *
 * Safe to run more than once: balances are added (never overwritten) and the old
 * field is removed in the same update, so a re-run finds nothing left to move.
 *
 * Dry run (default — reports what would change, writes nothing):
 *   npx tsx scripts/migrations/merge-reward-coins.ts
 * Apply:
 *   npx tsx scripts/migrations/merge-reward-coins.ts --apply
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const LEGACY_FIELD = 'siriCoins';
const APPLY = process.argv.includes('--apply');

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set; refusing to guess a database.');
  }

  await mongoose.connect(mongoUri);
  const users = mongoose.connection.collection('users');
  const filter = { [LEGACY_FIELD]: { $exists: true } };

  const pending = await users.countDocuments(filter);
  const [totals] = await users
    .aggregate([
      { $match: filter },
      { $group: { _id: null, coins: { $sum: { $ifNull: [`$${LEGACY_FIELD}`, 0] } } } },
    ])
    .toArray();

  console.log(`Users with a legacy coin balance: ${pending}`);
  console.log(`Coins to move: ${totals?.coins ?? 0}`);

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to move the balances.');
    return;
  }

  const result = await users.updateMany(filter, [
    {
      $set: {
        rewardCoins: {
          $add: [{ $ifNull: ['$rewardCoins', 0] }, { $ifNull: [`$${LEGACY_FIELD}`, 0] }],
        },
      },
    },
    { $unset: LEGACY_FIELD },
  ]);

  console.log(`Updated ${result.modifiedCount} user(s).`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
