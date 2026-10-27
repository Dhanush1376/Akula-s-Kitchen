// Isolated staging database for load testing.
// - Starts an in-memory MongoDB replica set on 127.0.0.1:27999 (transactions supported).
// - READS catalog-only collections from the live database and copies them in.
//   No users, orders, addresses, sessions, payments or logs are copied.
// - Never writes to the live database.
const path = require('path');
const BACKEND = process.argv[2];
const req = (m) => require(path.join(BACKEND, 'node_modules', m));
req('dotenv').config({ path: path.join(BACKEND, '.env.local'), quiet: true });
const { MongoMemoryReplSet } = req('mongodb-memory-server');
const { MongoClient } = req('mongodb');

const CATALOG = [
  'products', 'categories', 'storesettings', 'websitecontents', 'contentsections',
  'catalogattributes', 'catalogvalues', 'catalogsynonyms', 'policies', 'featureflags',
  'searchsynonyms', 'searchpins', 'locations', 'serviceareas', 'serviceabilities',
];

(async () => {
  const repl = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ port: 27999, ip: '127.0.0.1' }],
  });
  const stagingUri = repl.getUri('akulas-staging');
  const live = await MongoClient.connect(process.env.MONGO_URI, { readPreference: 'secondaryPreferred' });
  const staging = await MongoClient.connect(stagingUri);
  const src = live.db('akulas-kitchen');
  const dst = staging.db('akulas-staging');
  const existing = new Set((await src.listCollections().toArray()).map((c) => c.name));
  for (const name of CATALOG) {
    if (!existing.has(name)) continue;
    const docs = await src.collection(name).find({}).toArray();
    if (docs.length) await dst.collection(name).insertMany(docs);
    console.log(`copied ${name}: ${docs.length}`);
  }
  await live.close();
  await staging.close();
  console.log('STAGING_READY ' + stagingUri);
  setInterval(() => {}, 1 << 30); // stay alive until stopped
})().catch((e) => {
  console.error('STAGING_FAILED', e.message);
  process.exit(1);
});
