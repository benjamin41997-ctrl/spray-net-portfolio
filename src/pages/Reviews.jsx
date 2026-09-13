import { reviews } from '../data/reviews';
import { settings } from '../data/settings';
import { closeOverlay, updateQuery } from '../lib/navigation';
import PageHeader from '../components/PageHeader';
import Stars from '../components/Stars';
import Icon from '../components/Icon';
import Photo from '../components/Photo';
import Lightbox from '../components/Lightbox';

export default function Reviews({ route }) {
  const service = route.params.get('service') || 'All services';
  const setService = (value) =>
    updateQuery(route, 'service', value === 'All services' ? '' : value);
  const filtered = reviews.filter(
    (review) => service === 'All services' || review.serviceType === service,
  );
  const selected = reviews.find((review) => review.id === route.params.get('review'));
  return (
    <>
      <PageHeader
        eyebrow="IN THEIR WORDS"
        title="The Spray-Net Customer Experience."
        description="Hear what our customers love about their Spray-Net transformations."
      />
      <div className="reviews-intro">
        <span className="review-mark">
          <Icon name="quote" size={42} />
        </span>
        <div>
          <h2>
            Homes refreshed.
            <br />
            Stories worth sharing.
          </h2>
          <p>Professional service, proactive communication, and a transformed home.</p>
        </div>
        {settings.demoMode && <span className="sample-pill">Demonstration reviews</span>}
      </div>
      <div className="chips review-filters" aria-label="Filter reviews">
        {['All services', ...new Set(reviews.map((review) => review.serviceType))].map((option) => (
          <button
            className={`chip ${service === option ? 'selected' : ''}`}
            aria-pressed={service === option}
            key={option}
            onClick={() => setService(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        {filtered.length} reviews
      </p>
      {!filtered.length && (
        <section className="empty-state">
          <h2>More stories to come.</h2>
          <p>No reviews match this service yet.</p>
          <button className="button" onClick={() => setService('All services')}>
            Show all reviews
          </button>
        </section>
      )}
      <div className="reviews-grid">
        {filtered.map((review) => (
          <article className="review-card" key={review.id}>
            <div className="review-card-top">
              <Stars rating={review.rating} />
              <span>{review.serviceType}</span>
            </div>
            {review.screenshotImage ? (
              <button
                className="review-screenshot"
                onClick={() => updateQuery(route, 'review', review.id, false)}
                aria-label={`View review screenshot from ${review.customerName}`}
              >
                <Photo
                  src={review.screenshotImage}
                  alt={`${review.customerName}: ${review.text}`}
                />
                <span>
                  <Icon name="expand" size={17} />
                  View review
                </span>
              </button>
            ) : (
              <div>
                <blockquote>“{review.text}”</blockquote>
                {review.excerpt && (
                  <p className="review-excerpt-note">
                    Excerpt from a published customer testimonial
                  </p>
                )}
              </div>
            )}
            <div className="review-person">
              <span className="avatar">{review.customerName[0]}</span>
              <div>
                <strong>{review.customerName}</strong>
                <span>{review.location}</span>
              </div>
              <span className="review-source">{review.source}</span>
            </div>
          </article>
        ))}
      </div>
      {selected?.screenshotImage && (
        <Lightbox
          images={[
            { src: selected.screenshotImage, alt: `${selected.customerName}: ${selected.text}` },
          ]}
          index={0}
          onChange={() => {}}
          onClose={() => closeOverlay(route, 'review')}
        />
      )}
    </>
  );
}
