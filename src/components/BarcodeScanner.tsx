import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE,
    ]);

    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Kamera není dostupná v tomto prohlížeči.');
        }
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
          if (cancelled || !result) return;
          const text = result.getText();
          if (text && text.length >= 6) {
            setDetected(true);
            // small delay so user sees the green flash
            setTimeout(() => {
              onDetected(text);
            }, 250);
          }
        });
        stop = () => controls.stop();
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg.includes('Permission') || msg.includes('NotAllowed') ? 'Přístup ke kameře zamítnut. Povol jej v nastavení prohlížeče.' : msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (stop) stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-0 inset-x-0 z-10 pt-safe px-5 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white active:scale-90"
          aria-label="Zavřít"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <span className="text-white font-bold">Skenovat kód</span>
        <div className="w-10" />
      </div>

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* viewfinder */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`relative w-72 h-44 rounded-3xl border-2 transition-colors ${detected ? 'border-emerald-400' : 'border-white/80'}`}>
          <Corner pos="tl" detected={detected} />
          <Corner pos="tr" detected={detected} />
          <Corner pos="bl" detected={detected} />
          <Corner pos="br" detected={detected} />
          {!detected && (
            <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-coral-400 rounded-full shadow-[0_0_12px_rgba(249,115,102,0.8)]" />
          )}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 pb-safe pt-6 px-5 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-center text-white/80 text-sm pb-4">
          {error
            ? <span className="text-red-400">{error}</span>
            : detected
              ? <span className="text-emerald-400 font-semibold">✓ Načteno</span>
              : 'Namiř na čárový kód'}
        </p>
      </div>
    </div>
  );
}

function Corner({ pos, detected }: { pos: 'tl' | 'tr' | 'bl' | 'br'; detected: boolean }) {
  const map = {
    tl: 'top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl',
    tr: 'top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl',
    bl: 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl',
    br: 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl',
  };
  return (
    <div className={`absolute w-7 h-7 ${map[pos]} ${detected ? 'border-emerald-400' : 'border-coral-400'}`} />
  );
}
