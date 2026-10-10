'use client';

import { useEffect, useRef, useState } from 'react';

/** Past this the code stops helping and the stub starts looking like a poster. */
const MAX_SIDE = 400;

/**
 * The code itself.
 *
 * Drawn in the paper's own two colours so it reads as printed on the stub
 * rather than pasted onto it. Ink on paper is about 14:1, far more contrast
 * than any scanner needs.
 *
 * It fills whatever square its box allows and is redrawn at that exact size
 * times the device pixel ratio — scaling a canvas with CSS instead would blur
 * or drop module edges, which is the one thing a code being scanned across a
 * counter cannot afford.
 *
 * The measured box is positioned out of flow on purpose. Measuring a box that
 * the canvas itself sits inside makes the two grow off each other: a wider
 * canvas makes a wider box, which draws a wider canvas.
 */
export function QrCode({
  value,
  label,
  ring = false,
}: {
  value: string;
  label: string;
  /** Breathe, to say this is the code waiting to be scanned. */
  ring?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [side, setSide] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.min(
        MAX_SIDE,
        Math.floor(Math.min(entry.contentRect.width, entry.contentRect.height))
      );
      if (next > 0) setSide(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = canvas.current;
    if (!el || side === 0) return;
    let live = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // Loaded on demand: the till screen never draws a code, and this is the
    // heaviest dependency in the app. The light colour is the paper token, so
    // the code is printed on the stub rather than pasted onto it.
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toCanvas(el, value, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: Math.round(side * dpr),
          color: { dark: '#141a2cff', light: '#fcfaf4ff' },
        })
      )
      .then(() => {
        if (!live) return;
        // toCanvas writes its own style.width/height in device pixels straight
        // onto the element, which outranks anything React set. Put the CSS size
        // back so the bitmap is dpr-dense but still occupies one square.
        el.style.width = `${side}px`;
        el.style.height = `${side}px`;
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [value, side]);

  return (
    <div ref={box} className="relative min-h-0 w-full flex-1">
      <div className="absolute inset-0 flex items-center justify-center">
        {failed ? (
          <p className="max-w-[16rem] text-center text-sm text-ink-soft">
            This code could not be drawn. Check the UPI ID in settings.
          </p>
        ) : (
          <span className="relative inline-flex">
            <canvas
              ref={canvas}
              role="img"
              aria-label={label}
              className="bg-paper"
              style={{ width: side, height: side }}
            />
            {ring && side > 0 ? <span className="scan-ring" aria-hidden /> : null}
          </span>
        )}
      </div>
    </div>
  );
}
