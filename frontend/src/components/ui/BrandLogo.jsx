import { BRAND } from '../../config/brand';
import { useConfig } from '../../context/ConfigContext';

export function BrandLogo({
  className = '',
  size = '36px',
  _showSubtitle = false,
  variant = 'default',
}) {
  let storeName = BRAND.name;
  try {
    const config = useConfig();
    if (config?.storeName) {
      storeName = config.storeName;
    }
  } catch (_e) {
    // Outside ConfigProvider
  }

  // Parse the size to a number to scale it up
  const numericSize = typeof size === 'string' ? parseInt(size, 10) : size;
  // Make the logo slightly larger than passed size height (1.15x)
  const height = numericSize ? Math.round(numericSize * 1.15) : 42;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        height: height + 'px',
        minHeight: height + 'px',
        width: height + 'px',
        minWidth: height + 'px',
      }}
    >
      <img
        src="/MainLogo.png"
        alt={`${storeName} Logo`}
        title={storeName}
        loading="eager"
        fetchPriority="high"
        style={{
          height: '100%',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          objectFit: 'cover',
          filter: variant === 'white' ? 'brightness(0) invert(1)' : 'none',
          transition: 'filter 0.3s ease',
        }}
        className="h-full w-full object-cover flex items-center"
      />
    </div>
  );
}

export const AkulaLogo = BrandLogo;
