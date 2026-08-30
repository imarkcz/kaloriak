import { useRef } from 'react';

interface Props {
  src?: string;
  name?: string;
  size?: number;
  editable?: boolean;
  onChange?: (dataUrl: string) => void;
  onRemove?: () => void;
}

// Crop to a square and downscale to maxSize (centered cover crop).
async function cropAndCompress(file: File, maxSize = 320, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const minSide = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - minSide) / 2;
  const sy = (bitmap.height - minSide) / 2;
  const target = Math.min(maxSize, minSide);
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(bitmap, sx, sy, minSide, minSide, 0, 0, target, target);
  return canvas.toDataURL('image/jpeg', quality);
}

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

export default function Avatar({ src, name, size = 96, editable = false, onChange, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!onChange) return;
    try {
      const dataUrl = await cropAndCompress(file);
      onChange(dataUrl);
    } catch {
      // ignore — surface noise here would just be a toast
    }
  }

  return (
    <div className="relative inline-block group" style={{ width: size, height: size }}>
      {/* Aurora glow halo */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-50 animate-ring-pulse pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(251,113,133,0.65), transparent 70%)' }}
      />
      <div
        className="absolute inset-0 rounded-full overflow-hidden ring-1 ring-white/15"
        style={{
          background: src
            ? undefined
            : 'linear-gradient(135deg, #ff8a65 0%, #f43f5e 100%)',
        }}
      >
        {src ? (
          <img src={src} alt={name ?? ''} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-extrabold tracking-tight uppercase"
            style={{ fontSize: size * 0.36 }}
          >
            {initials(name)}
          </div>
        )}
      </div>

      {editable && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Změnit fotku"
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-grad-coral text-white flex items-center justify-center shadow-coral-glow ring-2 ring-bg active:scale-90 transition-transform"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          {src && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Odstranit fotku"
              className="absolute top-0 right-0 w-7 h-7 rounded-full bg-surface-3/90 backdrop-blur text-ink-soft flex items-center justify-center ring-1 ring-white/10 active:scale-90 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
