import Icon from './Icon';
export default function Stars({ rating }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" size={17} className={i < rating ? 'filled' : ''} />
      ))}
    </span>
  );
}
