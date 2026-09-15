import { mediaUrl } from '../lib/media';

export default function BrandEmblem({ size = 42 }) {
  return (
    <img
      className="brand-emblem"
      src={mediaUrl('branding/icon-192.png')}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
