import { useRef, useState } from 'react';
import { settings } from '../data/settings';
import { closeOverlay, updateQuery } from '../lib/navigation';
import PageHeader from '../components/PageHeader';
import Comparison from '../components/Comparison';
import Lightbox from '../components/Lightbox';
import Photo from '../components/Photo';
import Stars from '../components/Stars';
import VideoPlayer from '../components/VideoPlayer';
import Icon from '../components/Icon';

export default function ProjectDetail({ project, route }) {
  const [selected, setSelected] = useState(0);
  const touchStart = useRef(null);
  const swiped = useRef(false);
  const images = [
    { src: project.afterImage, alt: `${project.title} · Now` },
    { src: project.beforeImage, alt: `${project.title} · Before` },
    ...project.additionalImages.map((src, index) => ({
      src,
      alt: `${project.title} · Detail ${index + 1}`,
    })),
  ];
  const photoIndex = Math.min(
    images.length - 1,
    Math.max(0, Math.trunc(Number(route.params.get('photo'))) || 0),
  );
  const open = (index) => updateQuery(route, 'photo', String(index), false);
  const gallery = window.history.state?.gallery;
  return (
    <>
      <PageHeader
        back={
          gallery ||
          `/projects?collection=${project.category === 'Cabinets' ? 'cabinets' : 'exterior'}`
        }
        onBack={gallery ? () => window.history.back() : undefined}
        backLabel="Transformations"
        eyebrow={project.category.toUpperCase()}
        title={project.title}
      >
        <span className="location-pill">
          <Icon name="pin" size={18} />
          {project.location || 'Project inspiration'}
        </span>
      </PageHeader>
      <Comparison project={project} onExpand={() => open(0)} />
      <div className="project-detail-grid">
        <section className="project-story">
          <p className="eyebrow">THE TRANSFORMATION</p>
          <h2>Explore the refinishing possibilities.</h2>
          <p className="body-copy">{project.description}</p>
          <dl className="project-facts">
            <div>
              <dt>Color</dt>
              <dd>{project.color || project.colorFamily}</dd>
            </div>
            <div>
              <dt>Surface</dt>
              <dd>{project.surfaceType}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{project.category}</dd>
            </div>
          </dl>
          {project.review && (
            <blockquote className="project-review">
              {project.rating && <Stars rating={project.rating} />}
              <p>“{project.review}”</p>
              <span>{settings.demoMode ? 'Sample customer story' : 'Customer story'}</span>
            </blockquote>
          )}
        </section>
        <section className="detail-gallery" aria-label="Project image gallery">
          <div className="section-heading">
            <h2>A closer look</h2>
            <span>
              {selected + 1} / {images.length}
            </span>
          </div>
          <button
            className="detail-gallery-main"
            aria-label={`View ${images[selected].alt} fullscreen`}
            onClick={() => {
              if (swiped.current) {
                swiped.current = false;
                return;
              }
              open(selected);
            }}
            onTouchStart={(event) => {
              swiped.current = false;
              touchStart.current = event.touches[0].clientX;
            }}
            onTouchEnd={(event) => {
              const distance = event.changedTouches[0].clientX - touchStart.current;
              if (Math.abs(distance) > 50) {
                swiped.current = true;
                setSelected(
                  (value) => (value + (distance > 0 ? -1 : 1) + images.length) % images.length,
                );
                touchStart.current = null;
              }
            }}
          >
            <Photo
              src={images[selected].src}
              alt={images[selected].alt}
              key={images[selected].src}
            />
            <span className="gallery-expand">
              <Icon name="expand" size={19} />
            </span>
          </button>
          <div className="gallery-thumbnails">
            {images.map((image, index) => (
              <button
                className={index === selected ? 'active' : ''}
                key={`${image.src}-${index}`}
                onClick={() => setSelected(index)}
                aria-label={`Show ${image.alt}`}
                aria-pressed={selected === index}
              >
                <Photo src={image.src} alt="" />
              </button>
            ))}
          </div>
        </section>
      </div>
      {project.videoUrl && (
        <section className="project-video">
          <div>
            <p className="eyebrow">BEHIND THE FINISH</p>
            <h2>See the process.</h2>
            <p className="body-copy">A closer look at how a transformation comes together.</p>
          </div>
          <VideoPlayer
            video={{
              title: 'Project process video',
              type: project.videoUrl.startsWith('https:') ? 'youtube' : 'local',
              url: project.videoUrl,
              thumbnail: project.afterImage,
            }}
          />
        </section>
      )}
      {route.params.has('photo') && (
        <Lightbox
          images={images}
          index={photoIndex}
          onChange={(index) => updateQuery(route, 'photo', String(index))}
          onClose={() => closeOverlay(route, 'photo')}
        />
      )}
    </>
  );
}
