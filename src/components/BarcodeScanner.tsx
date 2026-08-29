import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { haptic } from '../lib/haptics';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

// Track capability fields not yet in default TS lib.dom types
type ExtendedCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
  focusMode?: string[];
};

// Native API (Chrome Android, recent Safari) — wraps OS-level decoders that
// handle rotation/blur/exposure far better than wasm libraries.
type BarcodeDetectorCtor = new (init?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement | ImageBitmap) => Promise<{ rawValue: string }[]>;
};

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [error, setError] = useState<string>('');
  const [detected, setDetected] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    let detectionLoop = 0;

    function fireDetected(code: string) {
      if (cancelled || code.length < 6) return;
      setDetected(true);
      haptic('success');
      setTimeout(() => onDetected(code), 250);
    }

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Kamera není dostupná v tomto prohlížeči.');
        }

        // Lock orientation portrait — prevents iOS/Android from rotating the
        // stream mid-scan, which is the main reason barcodes appear "twisted".
        try {
          const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
          await so.lock?.('portrait').catch(() => {});
        } catch { /* not supported */ }

        // Request rear camera; advanced constraints set continuous autofocus
        // up-front so the very first frames are sharp.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = (typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}) as ExtendedCapabilities;

        // Apply best-quality settings the device supports
        const advanced: MediaTrackConstraintSet[] = [];
        if (caps.focusMode?.includes('continuous')) advanced.push({ focusMode: 'continuous' } as MediaTrackConstraintSet);
        if (caps.zoom) {
          // Modest zoom helps detection of small EAN-13 barcodes at typical
          // arm's length without losing too much depth-of-field
          const target = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1.5));
          advanced.push({ zoom: target } as MediaTrackConstraintSet);
          setZoomRange({ min: caps.zoom.min, max: caps.zoom.max });
          setZoom(target);
        }
        if (advanced.length > 0) {
          await track.applyConstraints({ advanced }).catch(() => { /* not all devices support */ });
        }
        if (caps.torch) setHasTorch(true);

        stop = () => stream.getTracks().forEach((t) => t.stop());

        // Path 1: native BarcodeDetector (Chrome Android, future Safari)
        const NativeDetector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (NativeDetector) {
          const detector = new NativeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
          });
          const tick = async () => {
            if (cancelled) return;
            try {
              const results = await detector.detect(video);
              if (results.length > 0) {
                fireDetected(results[0].rawValue);
                return;
              }
            } catch { /* frame not ready, ignore */ }
            detectionLoop = requestAnimationFrame(tick);
          };
          detectionLoop = requestAnimationFrame(tick);
          const prevStop = stop;
          stop = () => { prevStop?.(); cancelAnimationFrame(detectionLoop); };
          return;
        }

        // Path 2: ZXing fallback (iOS Safari and older browsers)
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 });
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (cancelled || !result) return;
          fireDetected(result.getText());
        });
        const prevStop = stop;
        stop = () => { prevStop?.(); controls.stop(); };
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Přístup ke kameře zamítnut. Povol jej v nastavení prohlížeče.'
          : msg);
      }
    })();

    return () => {
      cancelled = true;
      if (stop) stop();
      if (detectionLoop) cancelAnimationFrame(detectionLoop);
      try {
        const so = screen.orientation as ScreenOrientation & { unlock?: () => void };
        so.unlock?.();
      } catch { /* ignore */ }
    };
  }, [onDetected]);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
      haptic('tap');
    } catch { /* ignore */ }
  }

  async function applyZoom(z: number) {
    const track = trackRef.current;
    if (!track || !zoomRange) return;
    const clamped = Math.min(zoomRange.max, Math.max(zoomRange.min, z));
    try {
      await track.applyConstraints({ advanced: [{ zoom: clamped } as MediaTrackConstraintSet] });
      setZoom(clamped);
    } catch { /* ignore */ }
  }

  // Tap-to-focus: re-trigger continuous autofocus by toggling focusMode
  async function focusAtPoint() {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ focusMode: 'manual' } as MediaTrackConstraintSet] });
      await new Promise((r) => setTimeout(r, 50));
      await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] });
      haptic('tap');
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
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
        <span className="text-white font-semibold">Skenovat kód</span>
        {hasTorch ? (
          <button
            onClick={toggleTorch}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-90 transition-colors ${torchOn ? 'bg-amber-400/90 text-black' : 'bg-white/10 backdrop-blur'}`}
            aria-label={torchOn ? 'Vypnout svítilnu' : 'Zapnout svítilnu'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={torchOn ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2h6l-2 7h3l-7 13 2-9H8l1-11z"/>
            </svg>
          </button>
        ) : <div className="w-10" />}
      </div>

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'none' }}
        playsInline
        muted
        onClick={focusAtPoint}
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

      {/* Zoom slider — only if device supports zoom */}
      {zoomRange && zoomRange.max > zoomRange.min && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-32 z-10 flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-3 py-1.5">
          <button onClick={() => applyZoom(zoom - 0.5)} className="text-white/80 text-sm font-semibold w-6 h-6 flex items-center justify-center active:scale-90">−</button>
          <span className="text-white text-xs font-semibold tabular-nums w-9 text-center">{zoom.toFixed(1)}×</span>
          <button onClick={() => applyZoom(zoom + 0.5)} className="text-white/80 text-sm font-semibold w-6 h-6 flex items-center justify-center active:scale-90">+</button>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 pb-safe pt-6 px-5 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-center text-white/80 text-sm pb-4">
          {error
            ? <span className="text-red-400">{error}</span>
            : detected
              ? <span className="text-emerald-400 font-semibold">✓ Načteno</span>
              : 'Namiř na čárový kód · klepni pro doostření'}
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
