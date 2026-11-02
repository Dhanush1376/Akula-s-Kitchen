import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import toast, { Toaster, ToastBar, useToasterStore } from 'react-hot-toast';
import debounce from 'lodash.debounce';

export function GlobalToaster() {
  const [toastPosition, setToastPosition] = useState('bottom-right');
  const { toasts } = useToasterStore();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const recentMessagesRef = useRef(new Map());

  const isMobile = toastPosition === 'top-center';
  const mobileMaxWidth = 'min(420px, calc(100vw - 24px))';

  // Strict deduplication & single-toast enforcement on mobile
  useEffect(() => {
    const now = Date.now();

    // Clean up timestamps older than 4 seconds
    for (const [key, val] of recentMessagesRef.current.entries()) {
      if (now - val.timestamp > 4000) {
        recentMessagesRef.current.delete(key);
      }
    }

    const activeToasts = toasts.filter((t) => t.visible);

    // On mobile, strictly limit to 1 visible toast at all times to prevent stacking/double-popping
    if (isMobile && activeToasts.length > 1) {
      activeToasts.slice(0, activeToasts.length - 1).forEach((t) => toast.remove(t.id));
    }

    // Deduplicate any identical message triggered within 3 seconds
    activeToasts.forEach((t) => {
      const rawMsg =
        typeof t.message === 'function'
          ? ''
          : typeof t.message === 'string'
            ? t.message.trim()
            : String(t.message?.props?.children || '').trim();

      if (!rawMsg) return;

      const prev = recentMessagesRef.current.get(rawMsg);
      if (prev && prev.id !== t.id && now - prev.timestamp < 3000) {
        toast.remove(t.id);
        return;
      }

      if (!prev || prev.id === t.id) {
        recentMessagesRef.current.set(rawMsg, { timestamp: now, id: t.id });
      }
    });
  }, [toasts, isMobile]);

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

  // Admin styles (sharp edges on desktop, dynamic height for long messages)
  const adminStyle = {
    background: 'var(--admin-surface, #ffffff)',
    border: '1px solid var(--admin-border, #e5e7eb)',
    color: 'var(--admin-text-primary, #111827)',
    fontSize: '11.5px',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    borderRadius: isMobile ? '18px' : 'var(--admin-radius-lg, 8px)',
    padding: '8px 14px',
    width: 'auto',
    minWidth: '0',
    maxWidth: isMobile ? mobileMaxWidth : '460px',
    minHeight: '42px',
    height: 'auto',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    boxShadow: '0 8px 20px -3px rgba(0, 0, 0, 0.14), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
  };

  // Storefront styles (clean modern pill geometry, dynamic height, no cutoff for long messages)
  const storefrontStyle = {
    background: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    color: 'var(--text-primary, #111827)',
    fontSize: '11.5px',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    borderRadius: '18px',
    padding: '8px 14px',
    width: 'auto',
    minWidth: '0',
    maxWidth: isMobile ? mobileMaxWidth : '460px',
    minHeight: '42px',
    height: 'auto',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    boxShadow: '0 8px 20px -3px rgba(0, 0, 0, 0.14), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="toaster-container">
      <Toaster
        position={toastPosition}
        containerStyle={{
          top: isMobile ? '76px' : 20,
          zIndex: 9999999,
          pointerEvents: 'none',
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
            className="pointer-events-auto cursor-pointer transition-transform duration-150 active:scale-95 inline-flex justify-center"
            style={{
              width: 'auto',
              maxWidth: isMobile ? mobileMaxWidth : '460px',
              display: 'inline-flex',
              justifyContent: 'center',
            }}
          >
            <ToastBar
              toast={t}
              style={{
                ...t.style,
                width: 'auto',
                minWidth: '0',
                maxWidth: isMobile ? mobileMaxWidth : '460px',
                minHeight: '42px',
                height: 'auto',
                borderRadius: '18px',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                padding: '8px 14px',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {({ icon, message }) => (
                <div className="inline-flex items-center gap-2.5 w-auto min-h-[26px] min-w-0 max-w-full select-none">
                  <span className="shrink-0 flex items-center justify-center scale-90">{icon}</span>
                  <span className="text-[11.5px] sm:text-[12px] font-medium text-neutral-800 dark:text-neutral-200 break-words whitespace-normal leading-snug tracking-normal">
                    {message}
                  </span>
                  {t.type !== 'loading' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.dismiss(t.id);
                      }}
                      className="ml-1 text-neutral-400 hover:text-neutral-700 text-xs p-1 rounded-full transition-colors cursor-pointer shrink-0"
                      aria-label="Dismiss toast"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </ToastBar>
          </div>
        )}
      </Toaster>
    </div>,
    document.body,
  );
}
