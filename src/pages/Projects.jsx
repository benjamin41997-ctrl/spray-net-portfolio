import { useState } from 'react';
import { settings } from '../data/settings';
import { projects, categories, colorFamilies } from '../data/projects';
import { filterProjects } from '../lib/media';
import { updateQuery, navigate } from '../lib/navigation';
import ProjectCard from '../components/ProjectCard';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';

const swatches = {
  White: '#fffefa',
  Black: '#303432',
  Gray: '#9a9d98',
  Blue: '#536c83',
  Green: '#879480',
  'Beige / Tan': '#c9b599',
  Other: 'linear-gradient(135deg,#bd795b 50%,#d6b994 50%)',
};
export default function Projects({ route }) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const collection = route.params.get('collection');
  const pool = projects.filter((project) =>
    collection === 'cabinets'
      ? project.category === 'Cabinets'
      : collection === 'exterior'
        ? project.category !== 'Cabinets'
        : true,
  );
  const availableCategories = categories.filter((category) =>
    pool.some((project) => project.category === category),
  );
  const filtered = filterProjects(projects, route.params);
  const activeCount = ['category', 'color'].filter((key) =>
    route.params.has(key),
  ).length;
  const reset = () =>
    navigate(`/projects${collection ? `?collection=${collection}` : ''}`, { replace: true });
  const group = (label, key, options) => (
    <fieldset className="filter-row">
      <legend>{label}</legend>
      <div className="chips">
        <button
          className={`chip ${!route.params.get(key) ? 'selected' : ''}`}
          aria-pressed={!route.params.get(key)}
          onClick={() => updateQuery(route, key, '')}
        >
          All{' '}
          {label.toLowerCase() === 'category'
            ? 'categories'
            : 'colors'}
        </button>
        {options.map((option) => (
          <button
            key={option}
            className={`chip ${route.params.get(key) === option ? 'selected' : ''}`}
            aria-pressed={route.params.get(key) === option}
            onClick={() => updateQuery(route, key, route.params.get(key) === option ? '' : option)}
          >
            {key === 'color' && (
              <span className="swatch" style={{ background: swatches[option] }} />
            )}
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
  return (
    <>
      <PageHeader
        eyebrow="BEFORE & NOW"
        title={
          collection === 'cabinets'
            ? 'Kitchen & bathroom cabinet refinishing.'
            : collection === 'exterior'
              ? 'Exterior transformations.'
              : 'Make your house, your home.'
        }
        description={
          collection === 'cabinets'
            ? 'A new kitchen in a fraction of the time, cost and mess.'
            : 'Explore the Spray-Net alternative to replacement, from before to now.'
        }
      />
      <nav className="collection-tabs" aria-label="Project collection">
        {[
          ['', 'All projects'],
          ['cabinets', 'Kitchen/Bathroom Cabinets'],
          ['exterior', 'Exterior Transformations'],
        ].map(([value, label]) => (
          <a
            key={value}
            href={`#/projects${value ? `?collection=${value}` : ''}`}
            aria-current={(collection || '') === value ? 'page' : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="gallery-tools">
        <p aria-live="polite" role="status">
          <strong>{filtered.length}</strong>{' '}
          {filtered.length === 1 ? 'transformation' : 'transformations'}
          <span className="demo-inline">
            {' '}
            · {settings.demoMode ? 'Illustrative projects' : 'Spray-Net network projects'}
          </span>
        </p>
        <button
          className="filter-toggle"
          onClick={() => setFiltersOpen((value) => !value)}
          aria-expanded={filtersOpen}
          aria-controls="project-filters"
        >
          <Icon name="sliders" size={18} />
          Filters{activeCount > 0 && <span className="count-badge">{activeCount}</span>}
        </button>
      </div>
      <section
        id="project-filters"
        className="filters"
        hidden={!filtersOpen}
        aria-label="Filter projects"
      >
        {availableCategories.length > 1 && group('Category', 'category', availableCategories)}
        {group('Color family', 'color', colorFamilies)}
        {activeCount > 0 && (
          <button className="text-button reset-filters" onClick={reset}>
            <Icon name="close" size={16} />
            Clear filters
          </button>
        )}
      </section>
      {filtered.length ? (
        <div className="project-grid">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <Icon name="layers" size={36} />
          <h2>A fresh start?</h2>
          <p>No projects match this combination. Try another color or clear your filters.</p>
          <button className="button button-dark" onClick={reset}>
            Clear filters
            <Icon name="arrow" size={18} />
          </button>
        </section>
      )}
    </>
  );
}
