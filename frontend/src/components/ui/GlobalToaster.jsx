import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import toast, { Toaster, ToastBar, useToasterStore } from 'react-hot-toast';
import debounce from 'lodash.debounce';

export function GlobalToaster() {
  const [toastPosition, setToastPosition] = useState('bottom-right');
  const { toasts } = useToasterStore();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    const TOAST_LIMIT = 3;
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= TOAST_LIMIT)
      .forEach((t) => toast.remove(t.id));
  }, [toasts]);

  useEffect(() => {
    const handleResize = debounce(() => {
      setToastPosition(window.innerWidth < 1024 ? 'top-center' : 'bottom-right');
    }, 250);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, []);

  // Admin styles (sharp edges, solid background)
  const adminStyle = {
    background: 'var(--admin-surface, #ffffff)',
    border: '1px solid var(--admin-border, #e5e7eb)',
    color: 'var(--admin-text-primary, #111827)',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    borderRadius: 'var(--admin-radius-lg, 8px)',
    padding: '12px 16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  };

  // Storefront styles (crisp solid surface to prevent backdrop blur fogging)
  const storefrontStyle = {
    background: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    color: 'var(--text-primary, #111827)',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    borderRadius: '50px',
    padding: '12px 20px',
    boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="toaster-container">
      <Toaster
        position={toastPosition}
        containerStyle={{
          top: toastPosition === 'top-center' ? '80px' : 20,
          zIndex: 9999999,
        }}
        toastOptions={{
          duration: 3500,
          style: isAdmin ? adminStyle : storefrontStyle,
          success: { iconTheme: { primary: '#16a34a', secondary: '#ffffff' } },
        }}
      >
        {(t) => (
          <div
            onClick={() => toast.dismiss(t.id)}
            className="pointer-events-auto cursor-pointer transition-transform duration-150 active:scale-95"
          >
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {t.type !== 'loading' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.dismiss(t.id);
                      }}
                      className="ml-2 text-neutral-400 hover:text-neutral-700 text-xs p-0.5 rounded-full transition-colors cursor-pointer"
                      aria-label="Dismiss toast"
                    >
                      ✕
                    </button>
                  )}
                </>
              )}
            </ToastBar>
          </div>
        )}
      </Toaster>
    </div>,
    document.body,
  );
}
