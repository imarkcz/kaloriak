import { useState } from 'react';
import { CATEGORY_META, type FoodCategory } from '../lib/foodCategory';

interface Props {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  category?: FoodCategory;
}

const SIZE = {
  sm: { box: 'w-12 h-12 rounded-xl', pad: 'p-1', emoji: 'text-2xl' },
  md: { box: 'w-16 h-16 rounded-2xl', pad: 'p-1.5', emoji: 'text-3xl' },
  lg: { box: 'w-20 h-20 rounded-2xl', pad: 'p-2', emoji: 'text-4xl' },
  xl: { box: 'w-28 h-28 rounded-3xl', pad: 'p-2.5', emoji: 'text-5xl' },
};

export default function FoodThumb({ src, alt = '', size = 'md', category = 'jine' }: Props) {
  const [errored, setErrored] = useState(false);
  const s = SIZE[size];
  const showImage = src && !errored;
  const meta = CATEGORY_META[category];

  return (
    <div
      className={`${s.box} shrink-0 relative overflow-hidden ring-1 ring-white/10`}
      style={
        showImage
          ? {
              background:
                'radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0) 70%), linear-gradient(160deg, #1e1e22 0%, #16161a 100%)',
            }
          : undefined
      }
    >
      {showImage ? (
        <div className={`absolute inset-0 flex items-center justify-center ${s.pad}`}>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setErrored(true)}
            className="max-w-full max-h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
          />
        </div>
      ) : (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
          <div className="absolute inset-0 bg-black/10" />
          <div className={`absolute inset-0 flex items-center justify-center ${s.emoji} drop-shadow`}>
            {meta.emoji}
          </div>
        </>
      )}
    </div>
  );
}
