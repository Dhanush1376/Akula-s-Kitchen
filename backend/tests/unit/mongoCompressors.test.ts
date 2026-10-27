import { describe, it, expect } from 'vitest';
import { MONGO_COMPRESSORS } from '../../src/config/db';

// The MongoDB driver loads these packages lazily, only when the server agrees to the
// compressor. A missing package therefore passes every test against Atlas and then
// fails every query against a server that negotiates it (seen on a MongoDB 8 staging DB).
const REQUIRED_PACKAGE: Record<string, string | null> = {
  zlib: null, // built into Node
  zstd: '@mongodb-js/zstd',
  snappy: 'snappy',
};

describe('MongoDB wire compression', () => {
  it('only configures compressors whose packages are installed', () => {
    expect(MONGO_COMPRESSORS.length).toBeGreaterThan(0);
    for (const compressor of MONGO_COMPRESSORS) {
      const pkg = REQUIRED_PACKAGE[compressor];
      if (pkg) expect(() => require.resolve(pkg)).not.toThrow();
    }
  });
});
