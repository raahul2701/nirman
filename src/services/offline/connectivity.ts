export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function watchConnectivity(onChange: (online: boolean) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => onChange(navigator.onLine);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);

  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}
