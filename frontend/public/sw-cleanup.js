// Legacy SW cleanup script — neutralized to support production PWA architecture.
// Kept for backwards compatibility with any cached references.
if (typeof window !== 'undefined' && window.location.search.includes('force_sw_cleanup=true')) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }
}
