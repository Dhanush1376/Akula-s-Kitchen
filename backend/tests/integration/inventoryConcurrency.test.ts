import './setup';
import mongoose from 'mongoose';
import { describe, it, expect } from 'vitest';
import Product from '../../src/models/Product';
import Category from '../../src/models/Category';
import InventoryReservation from '../../src/models/InventoryReservation';
import { InventoryService } from '../../src/services/InventoryService';

const seedProduct = async (stock: number) => {
  const category = await Category.create({
    name: `Pickles ${Math.random().toString(36).slice(2, 6)}`,
    slug: `pickles-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  } as any);
  return Product.create({
    title: 'Avakaya Pickle (250 g)',
    description: 'Mango pickle',
    slug: `avakaya-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    primaryCategory: category._id,
    price: 250,
    stock,
    reservedStock: 0,
    isActive: true,
    imageSrc: 'https://res.cloudinary.com/demo/image/upload/avakaya.webp',
  } as any);
};

const userId = () => new mongoose.Types.ObjectId().toString();

describe('Inventory reservation under concurrency', () => {
  it('never reserves more units than exist when 20 shoppers race for 5', async () => {
    const product = await seedProduct(5);

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        InventoryService.reserveInventory(product._id.toString(), 1, userId()),
      ),
    );

    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(5);
    expect(rejected).toHaveLength(15);
    for (const r of rejected) expect(r.reason?.statusCode).toBe(409);

    const after = await Product.findById(product._id).lean();
    expect(after!.reservedStock).toBe(5);
    expect(after!.stock).toBe(5);
    expect(await InventoryReservation.countDocuments({ product: product._id })).toBe(5);
  });

  it('rejects a single order larger than the available stock', async () => {
    const product = await seedProduct(2);
    await expect(
      InventoryService.reserveInventory(product._id.toString(), 5, userId()),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect((await Product.findById(product._id).lean())!.reservedStock).toBe(0);
  });

  it('counts existing reservations as unavailable', async () => {
    const product = await seedProduct(3);
    await InventoryService.reserveInventory(product._id.toString(), 2, userId());
    await expect(
      InventoryService.reserveInventory(product._id.toString(), 2, userId()),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      InventoryService.reserveInventory(product._id.toString(), 1, userId()),
    ).resolves.toBeTruthy();
  });

  it('rejects non-positive or fractional quantities', async () => {
    const product = await seedProduct(10);
    for (const q of [0, -1, 1.5]) {
      await expect(
        InventoryService.reserveInventory(product._id.toString(), q, userId()),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
  });

  it('holds the invariant inside concurrent checkout-style transactions, then confirms', async () => {
    // 100 in stock but 95 already reserved: 5 available. (Keeps stock above the low-stock
    // alert threshold, whose lazy require() of a .ts module Vitest cannot resolve.)
    const product = await seedProduct(100);
    await Product.updateOne({ _id: product._id }, { $set: { reservedStock: 95 } });
    const productId = product._id.toString();

    const attempt = async () => {
      const session = await mongoose.startSession();
      try {
        let reservationId = '';
        await session.withTransaction(async () => {
          const r = await InventoryService.reserveInventory(productId, 1, userId(), 15, session);
          reservationId = r._id.toString();
        });
        return reservationId;
      } finally {
        await session.endSession();
      }
    };

    const results = await Promise.allSettled(Array.from({ length: 20 }, attempt));
    const reserved = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value);

    expect(reserved.length).toBeLessThanOrEqual(5);
    expect(reserved.length).toBeGreaterThan(0);
    for (const r of results) {
      if (r.status === 'rejected') expect([409, undefined]).toContain(r.reason?.statusCode);
    }

    const mid = await Product.findById(product._id).lean();
    expect(mid!.reservedStock).toBe(95 + reserved.length);

    for (const id of reserved) await InventoryService.confirmReservation(id);
    const final = await Product.findById(product._id).lean();
    expect(final!.stock).toBe(100 - reserved.length);
    expect(final!.reservedStock).toBe(95);
    expect(final!.stock - final!.reservedStock).toBeGreaterThanOrEqual(0);
  });
});
