import Icon from './Icon';
import Photo from './Photo';
import { navigate } from '../lib/navigation';
export default function ProjectCard({ project }) {
  return (
    <a
      className="project-card"
      href={`#/projects/${project.id}`}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const origin = window.location.hash.slice(1);
        navigate(`/projects/${project.id}`, {
          state: { gallery: /^\/projects(?:\?|$)/.test(origin) ? origin : null },
        });
      }}
    >
      <div className="project-photo">
        <Photo src={project.afterImage} alt={`${project.title}, after transformation`} />
        <span className="photo-tag">{project.category}</span>
        <span className="round-arrow">
          <Icon name="arrow" />
        </span>
      </div>
      <div className="project-card-copy">
        <h3>{project.title}</h3>
        {project.location && (
          <p>
            <Icon name="pin" size={15} />
            {project.location}
          </p>
        )}
      </div>
    </a>
  );
}
