'use client';

import { useEffect } from 'react';

export function BootstrapInit() {
  useEffect(() => {
    // @ts-ignore
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);
  return null;
}
