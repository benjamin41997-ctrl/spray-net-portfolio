import { useState } from 'react';
import { settings } from '../data/settings';
import { brand } from '../data/brand';
import Photo from './Photo';
import Icon from './Icon';
export default function Comparison({ project, onExpand }) {
  const [position, setPosition] = useState(50);
  return (
    <div className="comparison-section">
      <div className="comparison" style={{ '--position': `${position}%` }}>
        <Photo src={project.afterImage} alt={`${project.title} now, after refinishing`} eager />
        <div className="before-layer">
          <Photo src={project.beforeImage} alt={`${project.title} before`} eager />
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
      <div className="comparison-caption">
        <span>
          <Icon name="sliders" size={17} />
          Slide to see the transformation
        </span>
        {settings.demoMode && <span>Illustrative project</span>}
      </div>
    </div>
  );
}
