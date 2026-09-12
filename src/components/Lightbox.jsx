import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Photo from './Photo';
export default function Lightbox({ images, index, onChange, onClose }) {
  const dialog = useRef(null);
  const touch = useRef(null);
  const [zoom, setZoom] = useState(false);
  const current = images[index] || images[0];
  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      focused?.focus?.();
    };
  }, []);
  useEffect(() => setZoom(false), [index]);
  const move = (delta) => onChange((index + delta + images.length) % images.length);
  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-label="Fullscreen image viewer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        }
      }}
    >
      <div className="lightbox-bar">
        <span>{current.alt}</span>
        <button className="icon-button" aria-label="Close fullscreen viewer" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div
        className={`lightbox-stage ${zoom ? 'is-zoomed' : ''}`}
        onTouchStart={(event) => {
          touch.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touch.current !== null && !zoom) {
            const distance = event.changedTouches[0].clientX - touch.current;
            if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1);
          }
          touch.current = null;
        }}
      >
        <Photo key={current.src} src={current.src} alt={current.alt} eager />
      </div>
      <div className="lightbox-bottom">
        <button
          className="icon-button"
          disabled={images.length < 2}
          onClick={() => move(-1)}
          aria-label="Previous image"
        >
          <Icon name="back" />
        </button>
        <div>
          <span aria-live="polite">
            {index + 1} / {images.length}
          </span>
          <button className="text-button" onClick={() => setZoom((value) => !value)}>
            {zoom ? 'Fit image' : 'Zoom in'}
          </button>
        </div>
        <button
          className="icon-button"
          disabled={images.length < 2}
          onClick={() => move(1)}
          aria-label="Next image"
        >
          <Icon name="arrow" />
        </button>
      </div>
    </dialog>
  );
}
