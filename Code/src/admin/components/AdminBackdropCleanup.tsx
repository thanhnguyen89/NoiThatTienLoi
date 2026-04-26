'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function cleanupBootstrapBackdrops() {
  const hasVisibleOverlayOwner = document.querySelector('.modal.show, .offcanvas.show');
  if (hasVisibleOverlayOwner) return;

  document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach((node) => {
    node.remove();
  });

  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
}

export function AdminBackdropCleanup() {
  const pathname = usePathname();

  useEffect(() => {
    cleanupBootstrapBackdrops();

    const timer = window.setTimeout(() => {
      cleanupBootstrapBackdrops();
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}

