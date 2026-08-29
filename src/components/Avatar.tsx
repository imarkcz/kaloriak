import { useRef } from 'react';
import Icon from './Icon';

interface Props {
  src?: string;
  name?: string;
  size?: number;
  editable?: boolean;
  onChange?: (dataUrl: string) => void;
  onRemove?: () => void;
}

// Centred square crop, downscaled — the avatar is the one blob that still
// lives in localStorage, so it has to stay small.
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
      onChange(await cropAndCompress(file));
    } catch { /* unreadable image — keep the previous avatar */ }
  }

  return (
    <div className="relative inline-block group" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ inset: '-14%', background: '#8f69e0', filter: `blur(${size * 0.22}px)`, opacity: 0.35 }}
      />
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          border: '1px solid rgba(255,255,255,0.14)',
          background: src ? undefined : 'linear-gradient(150deg, #a78bfa 0%, #6535bd 100%)',
        }}
      >
        {src ? (
          <img src={src} alt={name ?? ''} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-semibold uppercase"
            style={{ fontSize: size * 0.34, letterSpacing: '-0.02em' }}
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
            className="btn btn-primary absolute bottom-0 right-0 w-9 h-9 rounded-full"
            style={{ boxShadow: '0 0 0 3px #0c0b0c, 0 10px 30px -10px rgba(143,105,224,0.7)' }}
          >
            <Icon name="camera" size={15} />
          </button>
          {src && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Odstranit fotku"
              className="btn btn-ghost absolute top-0 right-0 w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
