import { existsSync, statSync } from 'node:fs';
import { projects, categories, colorFamilies } from '../src/data/projects.js';
import { reviews } from '../src/data/reviews.js';
import { content, statistics } from '../src/data/content.js';
import { videos } from '../src/data/videos.js';
import { settings } from '../src/data/settings.js';
import { resources } from '../src/data/resources.js';
import { youtubeEmbed } from '../src/lib/media.js';

const errors = [];
const publicDir = new URL('../public/', import.meta.url);
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const media = (path, label, { optional = false, video = false } = {}) => {
  if (!path && optional) return;
  check(typeof path === 'string' && Boolean(path), `${label}: provide a media path.`);
  if (typeof path !== 'string' || !path) return;
  if (video && path.startsWith('https:')) {
    check(Boolean(youtubeEmbed(path)), `${label}: use a valid HTTPS YouTube /embed/VIDEO_ID URL.`);
    return;
  }
  check(
    !path.startsWith('/') && !path.includes('..') && !path.includes(':') && !path.includes('\\'),
    `${label}: use a local public/ path without a leading slash, backslashes, or ..`,
  );
  const url = new URL(path, publicDir);
  check(
    url.href.startsWith(publicDir.href) && existsSync(url),
    `${label}: file not found: public/${path}`,
  );
  if (existsSync(url) && /\.(png|jpe?g|webp|avif|svg)$/i.test(path))
    check(
      statSync(url).size <= 8 * 1024 * 1024,
      `${label}: image exceeds the 8 MB offline cache limit; resize/compress it.`,
    );
};
const uniqueIds = (items, label) => {
  const ids = new Set();
  for (const item of items) {
    check(
      typeof item.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id),
      `${label}: use a lowercase hyphenated id.`,
    );
    check(!ids.has(item.id), `${label}: duplicate id ${item.id}.`);
    ids.add(item.id);
  }
};
uniqueIds(projects, 'Projects');
uniqueIds(reviews, 'Reviews');
uniqueIds(videos, 'Videos');
uniqueIds(content, 'Content');
for (const project of projects) {
  const label = `Project ${project.id}`;
  for (const key of [
    'id',
    'title',
    'category',
    'surfaceType',
    'colorFamily',
    'location',
    'beforeImage',
    'afterImage',
    'additionalImages',
    'description',
    'review',
    'rating',
    'videoUrl',
    'featured',
    'displayOrder',
  ])
    check(key in project, `${label}: missing ${key}.`);
  check(categories.includes(project.category), `${label}: unknown category.`);
  check(colorFamilies.includes(project.colorFamily), `${label}: unknown color family.`);
  check(
    Boolean(project.title && project.surfaceType && project.description),
    `${label}: title, surfaceType, and description are required.`,
  );
  check(Number.isFinite(project.displayOrder), `${label}: displayOrder must be a number.`);
  check(typeof project.featured === 'boolean', `${label}: featured must be true or false.`);
  check(
    project.rating == null ||
      (Number.isInteger(project.rating) && project.rating >= 1 && project.rating <= 5),
    `${label}: rating must be null or an integer from 1 to 5.`,
  );
  media(project.beforeImage, `${label} beforeImage`);
  media(project.afterImage, `${label} afterImage`);
  check(Array.isArray(project.additionalImages), `${label}: additionalImages must be an array.`);
  if (Array.isArray(project.additionalImages))
    project.additionalImages.forEach((path) => media(path, `${label} additionalImages`));
  media(project.videoUrl, `${label} videoUrl`, { optional: true, video: true });
}
for (const review of reviews) {
  for (const field of [
    'customerName',
    'rating',
    'text',
    'serviceType',
    'location',
    'source',
    'screenshotImage',
  ])
    check(field in review, `Review ${review.id}: missing ${field}.`);
  check(
    review.rating === null ||
      (Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5),
    `Review ${review.id}: rating must be null (not published) or an integer from 1 to 5.`,
  );
  check(
    Boolean(review.text && review.customerName),
    `Review ${review.id}: text and customerName are required (including for screenshots).`,
  );
  media(review.screenshotImage, `Review ${review.id}`, { optional: true });
}
for (const video of videos) {
  check(
    ['local', 'youtube'].includes(video.type),
    `Video ${video.id}: type must be local or youtube.`,
  );
  check(
    Boolean(video.title && video.description),
    `Video ${video.id}: title and description are required.`,
  );
  media(video.thumbnail, `Video ${video.id} thumbnail`);
  if (video.type === 'youtube')
    check(
      !video.url || Boolean(youtubeEmbed(video.url)),
      `Video ${video.id}: invalid YouTube embed URL.`,
    );
  else media(video.url, `Video ${video.id}`, { video: true });
  media(video.captions, `Video ${video.id} captions`, { optional: true });
}
for (const item of content)
  check(
    item.title && item.intro && Array.isArray(item.paragraphs) && item.paragraphs.length,
    `Content ${item.id}: provide a title, intro, and paragraphs.`,
  );
check(
  statistics.every((stat) => stat.value && stat.label),
  'Statistics need a value and label.',
);
check(
  Number.isFinite(settings.inactivityMinutes) && settings.inactivityMinutes >= 0,
  'Inactivity minutes must be a number >= 0.',
);
media(settings.logo, 'Brand logo');
for (const resource of resources) {
  media(resource.image, `Resource ${resource.id}`);
  check(
    content.some((article) => article.id === resource.articleId),
    `Resource ${resource.id}: unknown article.`,
  );
}
if (errors.length) {
  console.error(`Content validation failed:\n${errors.map((error) => `  • ${error}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `Content validated: ${projects.length} projects, ${reviews.length} reviews, ${videos.length} videos, ${content.length} information pages.`,
);
