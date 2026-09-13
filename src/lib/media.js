export function mediaUrl(path) {
  if (!path) return '';
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export function youtubeEmbed(url) {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      ![
        'www.youtube.com',
        'youtube.com',
        'www.youtube-nocookie.com',
        'youtube-nocookie.com',
      ].includes(parsed.hostname)
    )
      return null;
    const match = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})$/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&playsinline=1` : null;
  } catch {
    return null;
  }
}

export function filterProjects(projects, params) {
  const collection = params.get('collection');
  const category = params.get('category')?.toLowerCase();
  return projects
    .filter(
      (project) =>
        (collection !== 'cabinets' || project.category === 'Cabinets') &&
        (collection !== 'exterior' || project.category !== 'Cabinets') &&
        (!category ||
          project.category.toLowerCase() === category ||
          (category === 'siding' &&
            ['Vinyl Siding', 'Aluminum, Fiber Cement & Engineered Wood'].includes(project.category))) &&
        (!params.get('color') || project.colorFamily === params.get('color')),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
