# Spray-Net Portfolio

A tablet-first, installable portfolio for Spray-Net South Charlotte. Built with React, Vite, and a Workbox service worker. No backend, database, accounts, API keys, analytics, or paid services.

The portfolio includes cabinet and exterior galleries, instant filters, an accessible before/after slider, fullscreen image viewing, reviews and review screenshots, local MP4 and YouTube playback, seven informational pages, and an optional inactivity reset. All navigation stays in the app. The home icon and logo always return to the start.

## Start here

**Tablet testing URL:** [Open Spray-Net Portfolio](https://benjamin41997-ctrl.github.io/spray-net-portfolio/)

**Repository:** [benjamin41997-ctrl/spray-net-portfolio](https://github.com/benjamin41997-ctrl/spray-net-portfolio). Changes pushed to `main` are built, tested, and deployed automatically. Check the [deployment workflow](https://github.com/benjamin41997-ctrl/spray-net-portfolio/actions/workflows/deploy.yml) for completion before testing a new version. The local project is connected to this repository; future updates use the same tablet URL.

For each tablet test, check portrait and landscape layouts, gallery filters, the comparison slider, fullscreen photos, reviews, and video playback. Install from Safari on iPad or Chrome on Android, wait for **Ready offline**, and test again in airplane mode. To see a newly deployed version, open online and tap **Update now** when the update banner appears. The app checks on opening, returning to the foreground, reconnecting, and every 15 minutes while visible. Downloaded releases activate even if an older tab remains open; refreshing afterward loads the new cached shell. The footer identifies this release as Portfolio 1.0.7. Record the device model, OS/browser version, screen orientation, and steps for any issue.

**The collection contains 53 transformations, 18 customer review excerpts, 16 videos, and three reference sheets.** Source attribution is retained in the maintenance data and documentation. The customer app uses a unified Spray-Net voice without franchise-origin notices; unverified locations remain blank. Fictional locations, reviews, illustrations, and the demo animation have been removed from the published media. Read [Media sources and remaining gaps](docs/MEDIA-SOURCES.md) and the per-photo [source manifest](docs/media-sources.json) before adding or relabeling content.

See [Corporate brand alignment and source map](docs/BRAND-SOURCES.md) for the exact resources, slogans, and implementation decisions. The corporate resources require Marketing Team approval for new marketing materials. This app has been aligned to those resources but has not been submitted or approved by corporate Marketing.

1. Install Node.js **24 LTS**.
2. Open a terminal in this folder. Run:

   ```sh
   npm install --global pnpm@11.19.0
   pnpm install --frozen-lockfile
   pnpm dev
   ```

3. Open the local address printed by Vite. Development mode is for editing; offline/PWA behavior is enabled in the production build.
4. To check the production app:

   ```sh
   pnpm build
   pnpm preview
   ```

`pnpm build` checks your content and media paths before compiling. A missing picture or invalid category produces a readable error. Fix the named item and build again.

## Where things live

| What to change                                         | File or folder                 |
| ------------------------------------------------------ | ------------------------------ |
| Projects and before/after references                   | `src/data/projects.js`         |
| Customer reviews                                       | `src/data/reviews.js`          |
| Informational copy and statistics                      | `src/data/content.js`          |
| Video cards                                            | `src/data/videos.js`           |
| Logo path, branch name, demo notice, inactivity period | `src/data/settings.js`         |
| Project images                                         | `public/media/projects/`       |
| Review screenshots                                     | `public/media/reviews/`        |
| MP4 files, thumbnails, and captions                    | `public/media/videos/`         |
| Logo and installation icons                            | `public/branding/`             |
| Colors and layout                                      | `src/styles.css`               |
| PWA and offline configuration                          | `vite.config.js`               |
| GitHub deployment                                      | `.github/workflows/deploy.yml` |

Paths inside content start with `media/` or `branding/`. **Do not include `public/`, a leading `/`, a drive letter, or backslashes.** File names are case-sensitive on GitHub Pages. Use lowercase names with hyphens, such as `waxhaw-kitchen-after.webp`.

## 1. Add another project

Open `src/data/projects.js`. Find the closing `];` at the bottom of the `projects` list. Paste a new object **above** it. Keep the comma after each object. Copy this example, then edit the values inside quotes:

```js
  {
    id: 'waxhaw-white-kitchen',
    title: 'A brighter kitchen in Waxhaw',
    category: 'Cabinets',
    surfaceType: 'Wood cabinets',
    colorFamily: 'White',
    color: 'Approved color name',
    location: 'Waxhaw, NC',
    beforeImage: 'media/projects/waxhaw-white-kitchen/before.webp',
    afterImage: 'media/projects/waxhaw-white-kitchen/after.webp',
    additionalImages: [
      'media/projects/waxhaw-white-kitchen/detail-1.webp',
      'media/projects/waxhaw-white-kitchen/detail-2.webp',
    ],
    description: 'Write the project story here.',
    review: '',
    rating: null,
    videoUrl: '',
    featured: true,
    displayOrder: 11,
  },
```

- **id:** unique, lowercase, hyphenated; it becomes the project URL. Keep existing IDs stable when updating projects.
- **category:** exactly `Cabinets`, `Vinyl Siding`, `Aluminum, Fiber Cement & Engineered Wood`, `Brick`, `Stucco`, `Doors & Windows`, or `Commercial`. Cabinets appear in the kitchen/bathroom collection; all other categories appear in exteriors.
- **surfaceType:** your description, shown in project details. The gallery filters use category and color family only.
- **colorFamily:** exactly `White`, `Black`, `Gray`, `Blue`, `Green`, `Beige / Tan`, or `Other`.
- **color:** the specific color name shown in project details. Optional; defaults to the family.
- **location:** a town or neighborhood. Use an empty string `''` if unavailable.
- **additionalImages:** use `[]` when there are none. Only add photographs of that same project.
- **attribution:** identify `Spray-Net network project` or the actual franchise.
- **Comparison layout:** Every project opens with the slider centered at 50%. Customers can switch to side-by-side during that visit; reopening the project resets it to the slider. No per-project comparison setting is needed.
- **imageAspectRatio:** optional CSS ratio such as `4 / 3` or `3 / 4` to preserve the photo orientation.
- **review / videoUrl:** use `''` when unavailable. A project video accepts a local MP4 path or a valid YouTube embed URL.
- **rating:** a whole number from `1` to `5`, or `null` when unavailable. It is displayed with a project review.
- **featured:** Reserved for future curated collections. The home screen currently shows navigation cards only.
- **displayOrder:** lower numbers appear first in galleries.

If a sentence contains an apostrophe, use double quotes around it: `description: "You'll love this finish.",` Keep quotes, commas, brackets, and braces intact. The build catches syntax mistakes.

## 2. Add before/after images

1. Create a folder such as `public/media/projects/waxhaw-white-kitchen/`.
2. Put `before.webp`, `after.webp`, and any detail images inside it.
3. Update the paths in the project record to match exactly.
4. Use before and after photos with **the same framing, orientation, and aspect ratio**. This makes the comparison slider line up. The app fills both layers with `object-fit: cover`.
5. A landscape image about **1600–2000 pixels wide**, compressed to roughly **200–600 KB**, is a good tablet starting point. WebP and JPEG work well. PNG, SVG, and AVIF are also cached. Convert HEIC to WebP/JPEG before adding it.
6. The build rejects referenced images over **8 MB**, because larger images exceed the precache limit. Keep the complete portfolio modest enough for a tablet to download comfortably.

Only use photos and customer details approved for this portfolio. GitHub Pages publishes the files as a static site. `noindex,nofollow` discourages search indexing; it does not restrict access.

## 3. Add another review

Add an object above the closing `];` in `src/data/reviews.js`:

```js
  {
    id: 'waxhaw-customer',
    customerName: 'Customer-approved display name',
    rating: 5,
    text: 'Paste the approved review text here.',
    serviceType: 'Cabinets',
    location: 'Waxhaw, NC',
    source: 'Google review',
    screenshotImage: '',
  },
```

For a screenshot, put it in `public/media/reviews/` and set:

```js
    screenshotImage: 'media/reviews/waxhaw-review.webp',
```

**Ratings:** use `null` if the source does not publish a numeric star rating; the app will not display stars. Do not infer a five-star score from a positive testimonial. Set `excerpt: true` when displaying a short excerpt, and keep the source URL in `sourceUrl` for maintenance.

The screenshot replaces the large quote in the card and opens fullscreen when tapped. **Still include `text`** as an accessible text equivalent. No link to the review website is required. Service filters are generated from the review entries.

## 4. Add a video

Add a card to `src/data/videos.js`.

### Local MP4

Put an H.264 MP4 (AAC audio, if any) and a thumbnail in `public/media/videos/`. Use a web-optimized MP4 with fast-start metadata for good seeking and iPad support. Add:

```js
  {
    id: 'cabinet-process',
    title: 'Your kitchen, transformed',
    eyebrow: 'THE PROCESS',
    duration: '2:15',
    description: 'A short look at preparation, application, and the reveal.',
    type: 'local',
    url: 'media/videos/cabinet-process.mp4',
    thumbnail: 'media/videos/cabinet-process-thumbnail.webp',
    captions: 'media/videos/cabinet-process.vtt',
  },
```

`captions` is optional for silent footage, but add English WebVTT captions for spoken content. The current local films are unchanged corporate marketing originals (approximately 26 MB and 16 MB). Their descriptions cover the process and roof-coating content; origin details stay in the source documentation. Review speech/captions before a customer rollout. The much larger internal staff-training films remain outside the public app.

Local MP4s load on demand and are **not downloaded with the app shell**. Full HTTP 200 responses can be cached by the local-video runtime route, which supports range requests. Browser range-only streaming does not guarantee an offline copy. If a video is unavailable offline, the app explains that it needs a connection. Local pictures and text remain usable.

### YouTube

Use an approved video that allows embedding:

```js
  {
    id: 'exterior-process',
    title: 'Exterior transformation',
    eyebrow: 'THE PROCESS',
    duration: '3:20',
    description: 'An approved look at the exterior process.',
    type: 'youtube',
    url: 'https://www.youtube.com/embed/REPLACE_ID_',
    thumbnail: 'media/videos/exterior-thumbnail.webp',
  },
```

Replace `REPLACE_ID_` with the video's actual **11-character ID**. A normal `watch?v=` URL will fail validation. The app converts valid embeds to `youtube-nocookie.com`, loads them only after a tap, and never caches them. Offline users see **“Internet connection required to play this video.”**

A YouTube card with `url: ''` displays “Film coming soon”. The current kitchen card uses the collaboration linked from the corporate website. The embed is sandboxed without popups or top-level navigation. YouTube still controls its own player UI, branding, availability, and errors. For the most contained consultation experience, use local MP4s.

## 5. Change informational text and statistics

Open `src/data/content.js`. Each of the seven pages has an `id`, `title`, `subtitle`, `intro`, and a `paragraphs` array. Edit only the text between quotes. Each array entry becomes a paragraph. `steps` and `comparison` are optional structured blocks.

Edit `statistics` at the top of the same file to change the Why Spray-Net highlights. These now describe factory-quality finishes, custom chemistry, and on-site convenience. Use verified values if you later add company statistics. Keep coverage claims consistent with the applicable written warranty. Corporate slogans live separately in `src/data/brand.js`; change them only to approved corporate wording.

## 6. Replace the logo and app icons

The header's `public/branding/logo.png` is an unchanged copy of the supplied corporate `Horizontal Logo for Skin.png`, including “Custom Chemistry. Smarter Painting.” Do not redraw, recolor, stretch, or append text inside the logo. South Charlotte is displayed separately. If corporate supplies an updated asset, replace this PNG or update `logo` in `src/data/settings.js` to its new local path. Preserve the original aspect ratio and clear space. The alternate supplied wordmark and emblem source are retained under `assets/branding/`.

Change `brandName` and `locationName` in `settings.js` if needed. `demoMode` is `false`. The home screen ends after its five navigation cards; the footer shows only the version and offline indicator. Project provenance stays in the maintenance records; keep unverified job locations blank.

For the home-screen icon, replace these files with PNGs of the exact dimensions:

- `icon-192.png`: 192 × 192.
- `icon-512.png`: 512 × 512.
- `icon-maskable-512.png`: 512 × 512, opaque background, with all essential artwork within the central 80% diameter safe circle.
- `apple-touch-icon.png`: 180 × 180.
- `favicon.png`: 48 × 48 browser favicon.

The corporate colors are orange `#F16122`, navy `#003965`, and charcoal `#6D6E70`. Typography is Lato Regular, Medium, Heavy/ExtraBold, and Black, stored locally in `public/branding/fonts/` with its license. Manifest colors are in `vite.config.js`; matching navy browser theme color is in `index.html`. Display is standalone and orientation is unrestricted. Mobile operating systems may retain old installation icons; remove and reinstall the home-screen shortcut after a branding change if needed. The comparison display uses the brand board’s BEFORE / NOW labels; the underlying `beforeImage` / `afterImage` fields stay the same for easy content editing.

## 7. Deploy to GitHub Pages

### First deployment

1. Create a GitHub repository, for example `spray-net-portfolio`. A public repository supports free GitHub Pages hosting.
2. Upload the **contents of this folder** to the repository root, including the hidden `.github` folder, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`. Do not upload `node_modules`, `dist`, or test reports. GitHub Desktop is a convenient way to include hidden files and handle large batches. Use `main` as the default branch.
3. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Open **Actions → Verify and deploy portfolio → Run workflow** if it has not already started from your push.
5. Wait for the build, browser checks, and deployment to finish. GitHub Pages shows the published URL, usually `https://YOUR-ACCOUNT.github.io/spray-net-portfolio/`.
6. Open that URL on the tablet while online. Wait for **Ready offline** in the footer before relying on it without a connection.

The workflow installs locked dependencies, validates media and data, builds the app, tests Chromium and WebKit, and deploys only after checks pass. Pull requests run checks without publishing. If your default branch differs from `main`, update both branch filters and the deployment condition in `.github/workflows/deploy.yml`.

### Update content using GitHub's website

1. Open the relevant media directory and choose **Add file → Upload files** to add approved images, screenshots, or a small MP4. Commit the upload.
2. Open the relevant `src/data/` file, choose its pencil edit control, and update the paths and text. Commit the edit.
3. Open **Actions** and wait for a green deployment. If a build fails, open its **Validate content and build** step to see the missing path or invalid field. Correct it and commit again.
4. Open the app online on each sales tablet. Downloaded releases activate automatically, without reloading an active consultation. A banner says **A new portfolio is ready**; tap **Update now** to refresh the page. A normal refresh also loads the activated release. Legacy installations without the banner need to remain online long enough to finish downloading the release, then refresh or reopen. Other open tabs no longer block activation.
5. Confirm the new content and the offline-ready indicator, then test airplane mode before your next visit.

GitHub's web uploader has per-file size limits; keep videos short and compressed. Use GitHub Desktop for larger batches. Do not put media behind Git LFS pointers—Pages needs the real media files in the build.

### Why repository names do not break the app

Vite uses `base: './'`. Media references use `import.meta.env.BASE_URL`. The manifest has relative start, scope, and icon paths. Routes use a small hash router: `/#/projects/a-fresh-perspective`. The part before `#` always loads the static entry point, so GitHub Pages can refresh a detail screen without a server-side rewrite or a `404.html` workaround. Browser Back restores the previous route and gallery filter URL. No repository name is hard-coded into the production app.

The test server deliberately mounts the build under `/spray-net-portfolio/`. Its prefix is a test fixture, not a deployment setting. No base changes are necessary for a different repository name, a root Pages site, or a custom domain. Deploy through HTTPS; do not open `dist/index.html` directly as a file.

Official reference: [Vite static deployment and GitHub Pages](https://vite.dev/guide/static-deploy).

## Install and use on a tablet

- **iPad:** open the deployed HTTPS URL in Safari, use the Share menu, and choose **Add to Home Screen**. If offered, keep **Open as Web App** enabled. Launch from the new icon.
- **Android:** open the deployed HTTPS URL in Chrome, use the browser menu, and select **Install app** or **Add to Home screen**. Launch from the new icon.
- Open online at least once and wait for **Ready offline**. Check a before/after project in airplane mode.
- Use iPad Guided Access or Android App Pinning through the device's own settings. The app intentionally does not implement operating-system kiosk controls.
- The top-right Home button and the logo provide an unobtrusive way back. Fullscreen images have a close button, keyboard Escape, previous/next controls, and touch swipes. The before/after slider supports drag/tap and keyboard arrows. Pinch zoom is not disabled.

Browser install menu wording varies by OS release. A real tablet check is still necessary for installation, touch feel, MP4 codec support, Guided Access/App Pinning, and storage retention.

## Inactivity reset

In `src/data/settings.js`:

```js
inactivityMinutes: 10, // 0 disables automatic reset
```

Pointer, keyboard, touch, scrolling, and local video playback count as activity. After the configured interval, the app returns home, closes any open viewer, and clears current filters and local screen state. It also checks elapsed time when an inactive/background app resumes. Embedded YouTube playback cannot report activity across origins, so choose a timeout longer than your longest film.

No customer data or filter preferences are stored. Browser history remains available for normal Back behavior; the reset does not attempt to erase the browser's history.

## Offline and update behavior

- The service worker precaches the HTML shell, built JavaScript (including all data files), CSS, manifest, icons, captions, and local images.
- All matching image files in `public/` are precached, including ones not yet viewed. Replace unused demos to keep the download small.
- No external fonts, photo servers, or APIs are needed.
- YouTube is excluded. Local MP4s are optional runtime content, as described above.
- A missing/failed image has a labeled placeholder. Invalid routes provide a Home action. Empty project filters offer Clear filters.
- A new version downloads in the background and activates without waiting for old windows to close. Existing pages show an **Update now** button when their service worker changes. Clicking it refreshes the page; a normal browser refresh also uses the new release. There is no forced mid-consultation page reload. Foreground/reconnection checks are throttled to once per minute; visible online sessions also check every 15 minutes.
- Offline use requires a successful initial online load. Device storage pressure, browser clearing, private browsing, or OS storage eviction can remove caches. Reopen online and confirm **Ready offline** before a visit. Do not assume an app is cached just because its icon is installed.

## Verification

The real-media production build precaches **150 entries totaling approximately 28.8 MiB**, including 109 project photographs, corporate branding, local fonts, video thumbnails, and three reference sheets. The approximately 42 MB of local MP4s load on demand and are not part of this initial download.

The browser suite covers network attribution, nullable review ratings, both comparison layouts, fullscreen reference sheets, filters, navigation, inactivity reset, local MP4 playback/seeking, offline reload, and responsive overflow. Windows WebKit H.264 playback, WebKit service-worker emulation, and the duplicate WebKit accessibility scan are documented skips; Chromium covers those capabilities. Physical iPad/Android installation, audio/captions, and real YouTube playback remain device acceptance checks.


```sh
pnpm validate
pnpm build
pnpm exec playwright install chromium webkit
pnpm test
```

On Linux, use `pnpm exec playwright install --with-deps chromium webkit` to install browser system dependencies as well.

The tests exercise project collections, all filter dimensions, empty states, keyboard comparison controls, fullscreen images, review screenshots, all information pages, local video playback/seeking, browser Back, deep links, session reset, several portrait/landscape/mobile widths, manifest icons and scope, production asset paths, and offline reloads. Screenshots and failure traces go to ignored `test-results/` and `playwright-report/` folders.

WebKit automation is a browser-engine approximation, not a physical iPad. Service worker tests run in Chromium; Windows WebKit's missing H.264 decoder is an explicit local-video test skip. Confirm physical device installation and playback before sales rollout. There is no claim of a measured Lighthouse score; the app uses local media, native controls, lazy image loading, semantic structure, visible keyboard focus, reduced-motion handling, and no remote font dependency.

## Media maintenance

All current customer-facing media is listed in [MEDIA-SOURCES.md](docs/MEDIA-SOURCES.md). The photo source manifest records originals, checksums, dimensions, and app paths. Replace media and data together, run the build, then push to `main`.

Corporate reference images live in `public/media/information/`; their titles, summaries, context, and page associations are in `src/data/resources.js`. They open inside the existing fullscreen viewer and are cached offline. Use the correct country’s document and retain test conditions and footnotes.

`scripts/generate-demo.mjs` and `scripts/generate-demo-video.mjs` are legacy demonstration generators. They are not part of the build and must not be run against the real-media portfolio: they would recreate retired placeholder assets. Previous versions are retained in Git history.

## September 13 Media Expansion — Portfolio 1.0.6

This release added 37 transformations, 16 authentic review excerpts, and 13 videos. The current portfolio has **53 transformations, 18 review excerpts, and 16 videos** after the September 14 removal. The offline shell and local images total approximately 29 MB on first installation. New films embed the official Spray-Net YouTube channel; thumbnails work offline, but playback requires internet. Fifteen remaining reviews have verified five-star ratings; three original testimonials retain unreported ratings.

Source filenames and checksums are recorded in `docs/media-sources.json` and `docs/review-sources.json`. Verified video metadata is in `docs/video-sources.json`. See `docs/MEDIA-SOURCES.md` for the selection record. Keep these records updated when adding media.

## September 14 Fixes — Portfolio 1.0.7

Removed the Marietta review (18 reviews remain), replaced the ambiguous quote icon throughout the app, and made all transformations open with the slider centered at 50%. Side-by-side remains an optional viewing mode for the current visit. The Sherry Holmes film now shows its verified 2:37 runtime.

## Portfolio 1.0.8

Decorative quotation icons on the home review card, reviews introduction, and Why Spray-Net article notes now use the existing Spray-Net emblem. The shared BrandEmblem component uses the local, offline-cached branding asset.
