import Icon from './Icon';
export default function PageHeader({
  back = '/',
  backLabel = 'Home',
  onBack,
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <header className="page-header">
      <a
        className="back-link"
        href={`#${back}`}
        onClick={(event) => {
          if (onBack && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            onBack();
          }
        }}
      >
        <Icon name="back" size={18} />
        {backLabel}
      </a>
      <div className="page-heading-row">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 tabIndex={-1}>{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
