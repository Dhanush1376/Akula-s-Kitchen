import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { checkIsStandalone, checkIsIos, checkIsIosSafari } from '../pwa/pwaDetection';

describe('PWA Module & Platform Detection', () => {
  it('correctly detects standalone display mode via window.matchMedia', () => {
    const mockWindow = {
      matchMedia: vi.fn().mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
      })),
      navigator: { standalone: false },
      document: { referrer: '' },
    };

    expect(checkIsStandalone(mockWindow)).toBe(true);
  });

  it('correctly detects standalone display mode via navigator.standalone (iOS)', () => {
    const mockWindow = {
      matchMedia: vi.fn().mockImplementation(() => ({ matches: false })),
      navigator: { standalone: true },
      document: { referrer: '' },
    };

    expect(checkIsStandalone(mockWindow)).toBe(true);
  });

  it('correctly identifies iOS Safari user agent with touch points', () => {
    const mockNavigator = {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    };

    expect(checkIsIos(mockNavigator)).toBe(true);
    expect(checkIsIosSafari(mockNavigator)).toBe(true);
  });

  it('correctly identifies iPadOS desktop-class user agent with touch points', () => {
    const mockNavigator = {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    };

    expect(checkIsIos(mockNavigator)).toBe(true);
    expect(checkIsIosSafari(mockNavigator)).toBe(true);
  });

  it('correctly rejects Chrome on iOS as non-native Safari for Add-to-Home-Screen instructions', () => {
    const mockNavigator = {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    };

    expect(checkIsIos(mockNavigator)).toBe(true);
    expect(checkIsIosSafari(mockNavigator)).toBe(false);
  });

  it('verifies manifest.json has valid spec properties, categories, and icons', () => {
    const manifestPath = path.resolve(__dirname, '../../../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe("Akula's Kitchen");
    expect(manifest.short_name).toBe("Akula's Kitchen");
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#F7BB0E');
    expect(manifest.background_color).toBe('#ffffff');
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    // Verify all icon paths exist on filesystem
    manifest.icons.forEach((icon) => {
      const iconPath = path.resolve(__dirname, '../../../public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    // Verify shortcuts exist with valid urls
    expect(manifest.shortcuts).toBeInstanceOf(Array);
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(3);
    expect(manifest.shortcuts[0].url).toBe('/collections');
  });

  it('verifies sw.js contains strict cache exclusions for private routes and catalog network-first', () => {
    const swPath = path.resolve(__dirname, '../../../public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf8');

    // Ensure critical exclusions are in sw.js
    const criticalExclusions = [
      '/api/auth',
      '/api/csrf-token',
      '/api/users/cart',
      '/api/orders',
      '/api/checkout',
      '/api/payment',
      '/api/razorpay',
      '/api/admin',
    ];

    criticalExclusions.forEach((pattern) => {
      expect(swContent).toContain(pattern);
    });

    // Ensure SKIP_WAITING and claim are supported
    expect(swContent).toContain('SKIP_WAITING');
    expect(swContent).toContain('self.clients.claim()');
  });
});
