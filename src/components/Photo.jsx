import { useState } from 'react';
import { mediaUrl } from '../lib/media';
import Icon from './Icon';
export default function Photo({ src, alt, className = '', eager = false, ...props }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src)
    return (
      <div className={`photo-fallback ${className}`} role="img" aria-label={alt}>
        <Icon name="layers" size={36} />
        <span>Image coming soon</span>
      </div>
    );
  return (
    <img
      src={mediaUrl(src)}
      alt={alt}
      className={`photo ${className}`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
