'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: (...a: unknown[]) => void };
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function initMetaPixel(pixelId: string) {
  if (typeof window === 'undefined' || window.fbq) return;

  const fbq = function (...args: unknown[]) {
    fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
  } as unknown as Window['fbq'] & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: (...a: unknown[]) => void };

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.push = fbq;

  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  window.fbq('init', pixelId);
}

export default function MarketingPixels() {
  const pathname = usePathname();

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    initMetaPixel(META_PIXEL_ID);
    window.fbq?.('track', 'PageView');
  }, [pathname]);

  return null;
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', eventName, params);
  }
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

export const ConversionEvents = {
  CADASTRO_INICIADO: 'InitiateCheckout',
  CADASTRO_CONCLUIDO: 'CompleteRegistration',
  LEAD_CAPTURADO: 'Lead',
  TOUR_INICIADO: 'ViewContent',
  TOUR_ALTA_INTENCAO: 'AddToWishlist',
  PROPOSTA_SOLICITADA: 'Contact',
  ASSINATURA_PRO: 'Purchase',
} as const;
