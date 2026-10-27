// Stepped closed-loop load test against the ISOLATED staging backend only.
// Usage: node loadtest.cjs <baseUrl> <productsJsonPath>
const fs = require('fs');
const http = require('http');

const BASE = process.argv[2] || 'http://127.0.0.1:5055';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(BASE)) throw new Error('Refusing non-local target');
const productsJson = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const d = productsJson.data; const list = Array.isArray(d) ? d : d?.products || d?.data || [];
const ids = list.map((p) => p._id || p.id).filter(Boolean);
const STAGES = [5, 10, 25, 50, 100];
const STAGE_MS = 20_000;

const agent = new http.Agent({ keepAlive: true, maxSockets: 512 });
const MIX = [
  [0.4, () => `/api/v1/products?page=1&limit=12&sort=newest`],
  [0.25, () => `/api/v1/products/${ids[Math.floor(Math.random() * ids.length)]}`],
  [0.15, () => '/api/v1/categories/active'],
  [0.1, () => '/api/v1/settings/public'],
  [0.1, () => '/api/v1/cms'],
];
const pick = () => {
  let r = Math.random();
  for (const [w, f] of MIX) { if ((r -= w) <= 0) return f(); }
  return MIX[0][1]();
};

const get = (path) =>
  new Promise((resolve) => {
    const t0 = process.hrtime.bigint();
    const req = http.get(BASE + path, { agent, headers: { 'x-forwarded-for': `49.36.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } }, (res) => {
      res.resume();
      res.on('end', () => resolve({ ms: Number(process.hrtime.bigint() - t0) / 1e6, status: res.statusCode }));
    });
    req.setTimeout(30_000, () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve({ ms: Number(process.hrtime.bigint() - t0) / 1e6, status: 0 }));
  });

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];

(async () => {
  console.log(`target ${BASE}, ${ids.length} product ids, ${STAGE_MS / 1000}s per stage`);
  console.log('vus  | req/s | p50 ms | p95 ms | p99 ms | errors | non-2xx');
  for (const vus of STAGES) {
    const lat = [];
    let errors = 0, non2xx = 0, done = 0;
    const end = Date.now() + STAGE_MS;
    const worker = async () => {
      while (Date.now() < end) {
        const r = await get(pick());
        done++;
        lat.push(r.ms);
        if (r.status === 0) errors++;
        else if (r.status < 200 || r.status >= 300) non2xx++;
      }
    };
    const t0 = Date.now();
    await Promise.all(Array.from({ length: vus }, worker));
    const secs = (Date.now() - t0) / 1000;
    lat.sort((a, b) => a - b);
    console.log(
      `${String(vus).padEnd(4)} | ${(done / secs).toFixed(0).padStart(5)} | ${pct(lat, 50).toFixed(0).padStart(6)} | ${pct(lat, 95).toFixed(0).padStart(6)} | ${pct(lat, 99).toFixed(0).padStart(6)} | ${String(errors).padStart(6)} | ${non2xx}`,
    );
  }
  agent.destroy();
})();
