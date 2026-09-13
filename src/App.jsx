import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRoute } from './lib/navigation';
import { mediaUrl } from './lib/media';
import { hasAppUpdate, subscribeToAppUpdate, refreshPortfolio } from './lib/appUpdates';
import { useOnline } from './hooks/useOnline';
import { useSessionReset } from './hooks/useSessionReset';
import { settings } from './data/settings';
import { brand } from './data/brand';
import { projects } from './data/projects';
import { videos } from './data/videos';
import { content } from './data/content';
import Icon from './components/Icon';
import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Reviews from './pages/Reviews';
import Videos from './pages/Videos';
import Why from './pages/Why';

class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="empty-state">
          <h1>Let’s start fresh.</h1>
          <p>Something interrupted this view.</p>
          <a
            className="button button-dark"
            href="#/"
            onClick={() => this.setState({ failed: false })}
          >
            Return home
          </a>
        </div>
      );
    return this.props.children;
  }
}

function NotFound() {
  return (
    <div className="empty-state">
      <Icon name="layers" size={40} />
      <h1 tabIndex={-1}>A new direction.</h1>
      <p>This page isn’t in the portfolio. There’s plenty more to explore.</p>
      <a href="#/" className="button button-dark">
        Back to home
        <Icon name="arrow" size={18} />
      </a>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const online = useOnline();
  const updateAvailable = useSyncExternalStore(subscribeToAppUpdate, hasAppUpdate);
  const [session, setSession] = useState(0);
  const [offlineReady, setOfflineReady] = useState(false);
  const reset = useCallback(() => setSession((value) => value + 1), []);
  useSessionReset(settings.inactivityMinutes, reset);
  const previousPath = useRef(null);
  const section = route.path.split('/')[1];
  const id = route.path.split('/')[2];
  const project = section === 'projects' && projects.find((item) => item.id === id);
  const video = section === 'videos' && videos.find((item) => item.id === id);
  const article = section === 'why' && content.find((item) => item.id === id);
  useEffect(() => {
    document.title = `${project?.title || video?.title || article?.title || { projects: 'Transformations', reviews: 'Customer Reviews', videos: 'Process Videos', why: 'Why Spray-Net' }[section] || 'Spray-Net Portfolio'} · South Charlotte`;
    if (previousPath.current !== route.path) {
      const initial = previousPath.current === null;
      previousPath.current = route.path;
      window.scrollTo(0, 0);
      if (!initial) document.querySelector('main h1')?.focus({ preventScroll: true });
    }
  }, [route.path, project, video, article, section]);
  useEffect(() => {
    const update = () => setOfflineReady(true);
    window.addEventListener('portfolio-offline-ready', update);
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.active) setOfflineReady(true);
      });
    return () => window.removeEventListener('portfolio-offline-ready', update);
  }, []);
  let page;
  if (route.path === '/') page = <Home />;
  else if (route.path === '/projects') page = <Projects route={route} />;
  else if (project && route.path === `/projects/${project.id}`)
    page = <ProjectDetail key={project.id} project={project} route={route} />;
  else if (route.path === '/reviews') page = <Reviews route={route} />;
  else if (route.path === '/videos') page = <Videos />;
  else if (video && route.path === `/videos/${video.id}`) page = <Videos video={video} />;
  else if (route.path === '/why') page = <Why />;
  else if (article && route.path === `/why/${article.id}`)
    page = <Why article={article} route={route} />;
  else page = <NotFound />;
  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main').focus();
        }}
      >
        Skip to content
      </a>
      <header className="app-header">
        <a href="#/" className="brand" aria-label="Spray-Net South Charlotte home">
          <img
            src={mediaUrl(settings.logo)}
            alt={`${settings.brandName} — ${brand.tagline}`}
            width="220"
            height="61"
          />
          <span>{settings.locationName}</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#/projects" aria-current={section === 'projects' ? 'page' : undefined}>
            Transformations
          </a>
          <a href="#/reviews" aria-current={section === 'reviews' ? 'page' : undefined}>
            Reviews
          </a>
          <a href="#/videos" aria-current={section === 'videos' ? 'page' : undefined}>
            Videos
          </a>
          <a href="#/why" aria-current={section === 'why' ? 'page' : undefined}>
            Why Spray-Net
          </a>
        </nav>
        <a
          href="#/"
          className={`home-control ${route.path === '/' ? 'active' : ''}`}
          aria-label="Home"
          aria-current={route.path === '/' ? 'page' : undefined}
        >
          <Icon name="home" size={24} />
          <span>Home</span>
        </a>
      </header>
      {updateAvailable && (
        <div className="update-banner" role="status">
          <span>A new portfolio is ready.</span>
          <button className="button button-dark" onClick={refreshPortfolio}>
            Update now
          </button>
        </div>
      )}
      {!online && (
        <div className="offline-banner" role="status">
          <Icon name="offline" size={17} />
          <span>
            You’re offline.{' '}
            {offlineReady
              ? 'Your portfolio is ready to explore.'
              : 'Some content may need a connection.'}
          </span>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <ErrorBoundary key={`${session}-${route.path}`}>
          <div className="page">{page}</div>
        </ErrorBoundary>
      </main>
      <footer className="app-footer">
        <p>
          <span className="brand-dot" />
          {settings.brandName} {settings.locationName}
        </p>
        <p>
          {settings.demoMode
            ? 'Demo portfolio · Illustrative projects & sample reviews'
            : settings.portfolioNotice || brand.tagline}
        </p>
        <span className="offline-status">
          <span>Portfolio 1.0.4</span>
          {offlineReady && (
            <>
              <Icon name="check" size={14} />
              Ready offline
            </>
          )}
        </span>
      </footer>
    </>
  );
}
