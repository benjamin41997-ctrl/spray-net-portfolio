import { useRef, useState } from 'react';
import { settings } from '../data/settings';
import { brand } from '../data/brand';
import Photo from './Photo';
import Icon from './Icon';
export default function Comparison({ project, onExpand }) {
  const [position, setPosition] = useState(50);
  const [paired, setPaired] = useState(false);
  const dragging = useRef(null);
  const move = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width) setPosition(Math.round(Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100))));
  };
  return (
    <div className="comparison-section">
      <div className="chips comparison-modes" aria-label="Comparison layout">
        <button
          className={`chip ${!paired ? 'selected' : ''}`}
          aria-pressed={!paired}
          onClick={() => setPaired(false)}
        >
          Slider
        </button>
        <button
          className={`chip ${paired ? 'selected' : ''}`}
          aria-pressed={paired}
          onClick={() => setPaired(true)}
        >
          Side by side
        </button>
      </div>
      {paired ? (
        <div className="comparison-pair">
          <figure>
            <Photo src={project.beforeImage} alt={`${project.title} before`} eager />
            <figcaption>{brand.beforeLabel}</figcaption>
          </figure>
          <figure>
            <Photo src={project.afterImage} alt={`${project.title} now, after refinishing`} eager />
            <figcaption>{brand.nowLabel}</figcaption>
            <button
              className="expand-control"
              aria-label="View now image fullscreen"
              onClick={onExpand}
            >
              <Icon name="expand" />
            </button>
          </figure>
        </div>
      ) : (
        <div
          className="comparison"
          style={{ '--position': `${position}%`, aspectRatio: project.imageAspectRatio }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
            dragging.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            move(event);
          }}
          onPointerMove={(event) => { if (dragging.current === event.pointerId) move(event); }}
          onPointerUp={(event) => {
            if (dragging.current !== event.pointerId) return;
            move(event); dragging.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { dragging.current = null; }}
          onLostPointerCapture={() => { dragging.current = null; }}
        >
          <Photo src={project.afterImage} alt={`${project.title} now, after refinishing`} draggable={false} eager />
          <div className="before-layer">
            <Photo src={project.beforeImage} alt={`${project.title} before`} draggable={false} eager />
          </div>
          <span className="comparison-label before-label">{brand.beforeLabel}</span>
          <span className="comparison-label after-label">{brand.nowLabel}</span>
          <div className="comparison-divider">
            <span>
              <Icon name="back" size={16} />
              <Icon name="arrow" size={16} />
            </span>
          </div>
          <input
            className="comparison-input"
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            aria-label="Before and now comparison"
            aria-valuetext={`${position}% before, ${100 - position}% now, after refinishing`}
          />
          <button
            className="expand-control"
            aria-label="View now image fullscreen"
            onClick={onExpand}
          >
            <Icon name="expand" />
          </button>
        </div>
      )}
      <div className="comparison-caption">
        <span>
          <Icon name="sliders" size={17} />
          {paired
            ? 'Original photographs · Camera angles and lighting may differ'
            : 'Drag anywhere on the photo to compare'}
        </span>
        {settings.demoMode && <span>Illustrative project</span>}
      </div>
      {!paired && !settings.demoMode && (
        <p className="comparison-source-note">
          Original photographs · Camera angles and lighting may differ.
        </p>
      )}
    </div>
  );
}
