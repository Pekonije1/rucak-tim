'use client';

import { useEffect, useState } from 'react';

// Pregled slike preko cijelog ekrana; otvara se sa viewImage(src, name)
export default function Lightbox() {
  const [img, setImg] = useState(null);

  useEffect(() => {
    const open = (e) => setImg(e.detail);
    const key = (e) => { if (e.key === 'Escape') setImg(null); };
    window.addEventListener('rucak:view', open);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('rucak:view', open);
      window.removeEventListener('keydown', key);
    };
  }, []);

  if (!img) return null;
  return (
    <div className="lightbox" onClick={() => setImg(null)} role="dialog" aria-label={img.name}>
      <button className="lightbox-close" aria-label="Zatvori" onClick={() => setImg(null)}>✕</button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={img.src} alt={img.name} />
        <figcaption>{img.name}</figcaption>
      </figure>
    </div>
  );
}
