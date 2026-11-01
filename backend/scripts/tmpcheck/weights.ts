import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });
import FilterService from '../../src/services/FilterService';
import ProductService from '../../src/services/productService';

(async () => {
  await mongoose.connect(process.env.MONGO_URI!);
  const groups: any[] = await FilterService.getDynamicFilters({});
  console.log(JSON.stringify(groups.find((g) => g.id === 'weight')?.options));
  for (const w of ['1kg', '2kg']) {
    const { filter } = await ProductService.buildProductFilterQuery({ weight: w }, false);
    const docs = await mongoose.model('Product').find(filter).select('title tags').lean();
    console.log(
      w,
      docs.length,
      docs.map((d: any) => (d.tags || []).filter((t: string) => /kg/i.test(t)).join('|')),
    );
  }
  await mongoose.disconnect();
  process.exit(0);
})();
