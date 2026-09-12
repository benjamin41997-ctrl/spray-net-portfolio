import { useEffect, useState } from 'react';

const readLocation = () => {
  const raw = window.location.hash.slice(1) || '/';
  const [path, query = ''] = raw.split('?');
  return { path, params: new URLSearchParams(query), raw };
};

export function navigate(path, { replace = false, state = null } = {}) {
  if (replace) window.history.replaceState(window.history.state, '', `#${path}`);
  else window.history.pushState(state, '', `#${path}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute() {
  const [route, setRoute] = useState(readLocation);
  useEffect(() => {
    const update = () => setRoute(readLocation());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

export function updateQuery(route, key, value, replace = true) {
  const params = new URLSearchParams(route.params);
  if (value) params.set(key, value);
  else params.delete(key);
  const query = params.toString();
  navigate(`${route.path}${query ? `?${query}` : ''}`, {
    replace,
    state: !replace ? { overlay: true, parent: route.raw } : null,
  });
}

export function closeOverlay(route, key) {
  if (window.history.state?.overlay && window.history.state.parent?.split('?')[0] === route.path)
    window.history.back();
  else updateQuery(route, key, '');
}
