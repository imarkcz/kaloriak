import { useState } from 'react';
import { CATEGORY_META, type FoodCategory } from '../lib/foodCategory';

interface Props {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  category?: FoodCategory;
}

const SIZE = {
  sm: { box: 'w-11 h-11 rounded-xl', pad: 'p-1', emoji: 'text-[20px]' },
  md: { box: 'w-16 h-16 rounded-2xl', pad: 'p-1.5', emoji: 'text-[28px]' },
  lg: { box: 'w-20 h-20 rounded-2xl', pad: 'p-2', emoji: 'text-4xl' },
  xl: { box: 'w-28 h-28 rounded-card', pad: 'p-2.5', emoji: 'text-5xl' },
};

// Emoji survive here on purpose: this is a fallback for a missing photo, not
// part of the interface vocabulary. See DESIGN.md.
export default function FoodThumb({ src, alt = '', size = 'md', category = 'jine' }: Props) {
  const [errored, setErrored] = useState(false);
  const s = SIZE[size];
  const showImage = src && !errored;
  const meta = CATEGORY_META[category];

  return (
    <div
      className={`${s.box} shrink-0 relative overflow-hidden bg-surface-2`}
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {showImage ? (
        <div className={`absolute inset-0 flex items-center justify-center ${s.pad}`}>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setErrored(true)}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center ${s.emoji} grayscale-[0.15] opacity-90`}>
          {meta.emoji}
        </div>
      )}
    </div>
  );
}
