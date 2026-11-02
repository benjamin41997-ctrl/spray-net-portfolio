# Spray-Net Portfolio

A tablet-first, installable portfolio for Spray-Net South Charlotte, built with React, Vite, and a Workbox service worker. The portfolio and local color browsing work offline. The optional AI Design Visualizer uses a separate authenticated image service and billable OpenAI image edits; its API key stays on the server. Customers do not need accounts.

The portfolio includes cabinet and exterior galleries, instant filters, an accessible before/after slider, fullscreen images, reviews, local MP4 and YouTube playback, seven informational pages, a guided kitchen/exterior visualizer, and an optional inactivity reset. The home icon and logo always return to the start.

## Start here

**Tablet testing URL:** [Open Spray-Net Portfolio](https://benjamin41997-ctrl.github.io/spray-net-portfolio/)

**Repository:** [benjamin41997-ctrl/spray-net-portfolio](https://github.com/benjamin41997-ctrl/spray-net-portfolio). Changes pushed to `main` are built, tested, and deployed automatically. Check the [deployment workflow](https://github.com/benjamin41997-ctrl/spray-net-portfolio/actions/workflows/deploy.yml) for completion before testing a new version. The local project is connected to this repository; future updates use the same tablet URL.

For each tablet test, check portrait and landscape layouts, gallery filters, the comparison slider, fullscreen photos, reviews, and video playback. Install from Safari on iPad or Chrome on Android, wait for **Ready offline**, and test again in airplane mode. To see a newly deployed version, open online and tap **Update now** when the update banner appears. The app checks on opening, returning to the foreground, reconnecting, and every 15 minutes while visible. Downloaded releases activate even if an older tab remains open; refreshing afterward loads the new cached shell. The footer identifies this release as Portfolio 1.6.0. Record the device model, OS/browser version, screen orientation, and steps for any issue.

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

Local MP4s download as complete files automatically after the app shell is ready, while online. Wait for **Local Videos Ready Offline** before disconnecting. The Videos page offers retry if a download fails or storage is full. Browser range-only streaming does not establish a complete offline copy; see the iPad/offline notes below.

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

Change `brandName` and `locationName` in `settings.js` if needed. `demoMode` is `false`. The home screen ends after its six navigation cards; the footer shows only the version and offline indicator. Project provenance stays in the maintenance records; keep unverified job locations blank.

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
inactivityMinutes: 60, // 0 disables the general inactivity reset
```

Pointer, keyboard, touch, scrolling, and local video playback count as activity. After the configured interval, the app returns home, closes any open viewer, and clears current filters and local screen state. It also checks elapsed time when an inactive/background app resumes. Embedded YouTube playback cannot report activity across origins, so choose a timeout longer than your longest film.

Filter preferences are cleared. Shared consultation originals and renders remain in the private archive; clearing the customer-facing screen does not delete them. Browser history remains available for normal Back behavior; the reset does not attempt to erase browser history. The shared consultation also has its own fixed one-hour expiry, independent of activity.

## Offline and update behavior

- The service worker precaches the HTML shell, built JavaScript (including all data files), CSS, manifest, icons, captions, and local images.
- All matching image files in `public/` are precached, including ones not yet viewed. Replace unused demos to keep the download small.
- No external fonts, photo servers, or APIs are needed.
- YouTube is excluded. Local MP4s are optional runtime content, as described above.
- A missing/failed image has a labeled placeholder. Invalid routes provide a Home action. Empty project filters offer Clear filters.
- A new version downloads in the background and activates without waiting for old windows to close. Existing pages show an **Update now** button when their service worker changes. Clicking it refreshes the page; a normal browser refresh also uses the new release. There is no forced mid-consultation page reload. Foreground/reconnection checks are throttled to once per minute; visible online sessions also check every 15 minutes.
- Offline use requires a successful initial online load. Device storage pressure, browser clearing, private browsing, or OS storage eviction can remove caches. Reopen online and confirm **Ready offline** before a visit. Do not assume an app is cached just because its icon is installed.

## Verification

The real-media production build precaches **150 entries totaling approximately 28.8 MiB**, including 109 project photographs, corporate branding, local fonts, video thumbnails, and three reference sheets. The approximately 42 MB of local MP4s are saved separately as complete files after the app shell is installed. Keep the app open online until Local Videos Ready Offline appears.

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

## Design Visualizer — Current Workflow

Open **Visualizer** from the header or **Visualize Your Home** on the home screen. Choose Kitchen & Cabinets or Home Exterior, take a clear photo or choose up to four photos together per project type, choose surfaces and colors, then select Create My Preview. Detailed previews are available in the hidden consultation tools. Tap a photo thumbnail to switch angles. Uploading or switching photos creates no rendering; each render button processes only the selected photo. The original for that angle is reused for each rendering so successive edits do not compound earlier changes. You can browse the portfolio while generation continues and return through the status banner.

### Connect a tablet

Enter the representative's **Tablet Password** once to activate that browser or installed app. No setup file, service address, API key, or separate operator code needs to be entered on the tablet.

To reveal **Consultation Tools**, press and hold **Kitchen & Cabinets** or **Home Exterior** for five seconds, or tap either button eight times within six seconds. Moving away or scrolling cancels a hold. The menu contains connection settings, the consultation label, saved previews, custom instructions, and Start a New Consultation. **Close Tools** hides these controls and clears any typed custom instructions. Returning to the page also starts with the tools hidden.

In the installed iPad/Android app, reveal **Consultation Tools**, enter **Tablet Password**, and tap **Activate This Tablet**. Access for both ordinary and custom previews is remembered across app restarts, updates and consultation resets, with no scheduled expiry. Safari and an installed home-screen app can have separate storage, so activate the one you will actually use. **Forget This Tablet** removes its remembered access without deleting saved images. Clearing site data or rotating the password requires activation again; browser storage retention cannot be guaranteed forever. The app requests persistent storage when supported.

Password activation unlocks custom instructions inside the hidden tools. Type up to 1,500 characters and choose **Create Custom Preview** or **Create Detailed Custom Preview**. There is no extra AI prompt-writing call; this creates one image using the same usage cap. Ordinary customer render buttons never submit custom text. The password is never saved by the app; server-issued access tokens are stored locally instead. Service-side setup and password rotation are documented in [Visualizer API](docs/VISUALIZER-API.md). Existing private QR links remain compatible, but the setup-file importer has been removed from the interface.

### Colors and surfaces

The picker includes **2,179 colors**: 50 Spray-Net core colors, **1,731 Sherwin-Williams references**, and 398 Benjamin Moore named catalog matches. The expanded Sherwin-Williams collection uses 1,726 names/codes/RGB values from the manufacturer's published ColorSnap and Designer Color Collection spreadsheets, plus five existing catalog matches. It adds **1,355 selections**. Search accepts codes with or without spaces, such as `SW 7008` or `SW7008`. Official reference colors are available for design exploration; coating availability and physical color matching still need confirmation. Other catalog colors remain filtered by documented coating system. These are verified source values, not a claim that the deck is the complete current manufacturer range. See [Color sources](docs/COLOR-SOURCES.md).

Kitchen controls offer One Tone for all cabinets, or Two Tone with Island and Wall & Base layouts. The app compares the selected swatches and always assigns the darker color to the island or base cabinets. Wall & Base also gives island cabinetry the base color. The top-level Color Options and Hardware Finishes buttons switch between cabinet colors and the hardware/backsplash/countertop panel. Two Tone guides the darker island/base color first, then the lighter cabinet/wall color. Exteriors use one visible row in this order: Siding 1, Siding 2, Door, Garage, Soffits, Fascia, Windows, Trim and Vents. Choose a color, use Next/Back, or tap any step; skipping a surface leaves it unchanged. There is no siding-material dropdown. Unselected features stay unchanged in the server's predefined editing instructions. AI may still alter details, so check each result against the original.

### Save and follow up

Each completed preview automatically stores its original photo, rendered image, choices, date, and optional consultation label in IndexedDB on that device. **Consultation Tools → Saved Previews on This Tablet** reopens them. **Save Image** exports a file; **Share Image** opens supported device sharing. No email is sent automatically. Photos are not synchronized to this PC or another tablet, and clearing the browser's site data removes saved images. Export the ones needed for follow-up. Storage failures are shown explicitly with a Save Image option.

In the hidden tools, **Consultation Label** helps find all saved angles later. **Start a New Consultation** clears every active photo, choices, custom instructions, and visible saved gallery while preserving the device library. The inactivity reset does the same. Saved photos never appear on the home screen or in the next consultation automatically.

### API and testing

The public app remains on GitHub Pages. The image service is a separate Cloudflare Worker with persistent rolling limits of five attempts per ten minutes and 30 per hour across connected tablets, a five-second minimum interval, and one active request. There is no daily rendering cap. Failed/dispatched requests count, so accidental repeated taps and retries cannot silently multiply spending. During UI testing, ordinary previews and corrections use GPT Image 2.5 Flare at low quality while `VISUALIZER_FAST_TEST_MODE=true`. The hidden Detailed actions use Sunburst/high. Turning that flag off restores Flare/medium ordinary previews. Provider latency and access vary. API details, environment variables, key rotation, deployment and model sources are in [Visualizer API](docs/VISUALIZER-API.md).

Run `pnpm build`, `pnpm test:api`, and `pnpm test`. API/unit and browser tests use stubs and never make paid calls. Browser tests cover payloads, original-photo reuse, navigation during generation, offline behavior, tablet pairing, camera orientation, local persistence and reset privacy. Run a separately authorized real image smoke test after service deployment to verify provider access and inspect its result.

## iPad Touch and Offline Videos — Portfolio 1.1.1

The before/now comparison responds to a touch or drag anywhere on the photograph. A larger 72-pixel handle is shown on touch devices. Pointer capture keeps the drag active, vertical page scrolling remains enabled, and keyboard range controls still work.

The two local MP4 films now save automatically as complete files (approximately 40.1 MiB total) while the app is open online. Open **Videos** and wait for **Local Videos Ready Offline**, with **2 of 2 local films saved**, before testing airplane mode. The footer reports video readiness separately from the offline app shell. An interrupted download or storage shortage shows a retry option instead of claiming readiness.

Local playback reads the complete saved file into a Blob URL, which supports Safari playback and seeking without depending on streamed HTTP range caching. The video element also uses anonymous CORS mode. The service worker retains range support for ordinary local video URLs; the full-file download uses a separate query URL to avoid Safari reusing partial responses.

The remaining YouTube films are labelled **Internet Required** and remain online embeds. They cannot be made offline by caching the iframe. To offer those films offline, obtain their original licensed MP4 files and add them as local videos. The app does not download YouTube streams.

When adding/replacing a local video, set its exact file size in the video data `bytes` field, and use a new filename if its contents change. Offline setup rejects partial or size-mismatched files. Tests cover touch taps outside the handle, drag/keyboard behavior, complete-file cache retries, interrupted/quota failures, and offline playback/seek. Windows Playwright WebKit lacks H.264/service-worker fidelity; real iPad playback should still be checked on the installed app.

Implementation follows the [Workbox media caching guidance](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video): streamed partial responses do not populate a complete offline video.

## Multiple Photos and Private Tools — Portfolio 1.2.0

Upload up to eight photos together and switch angles using the compact thumbnail strip. The main uploaded-photo preview is now 220–330 pixels tall, with fullscreen available. Results stay associated with their original angle. The five-second hold/eight-tap gesture above replaces the visible Consultation Tools button; labels, new-consultation reset and manual instructions are inside that menu.

The palette adds 1,355 verified Sherwin-Williams selections. The optional separately authorized custom-prompt path creates a single image without a prompt-writing API call. Build, 19 API tests, and 53 local Chromium/WebKit checks passed; five Windows WebKit codec/service-worker/accessibility checks were skipped by their existing platform guards. GitHub Actions runs the complete suite on Linux. Local visual checks covered landscape and portrait without overflow. Test renders use stubs and incur no OpenAI usage.

## Remembered Password Activation — Portfolio 1.2.1

The hidden tools now use a single **Tablet Password → Activate This Tablet** form. Activation remembers regular and custom-render access across browser/app restarts and portfolio updates, with no scheduled expiration. The old multi-field form and setup-file importer are removed. **Forget This Tablet** clears the access record while preserving saved designs. The password itself is never stored by the app. Entering it in an installed app activates that app's storage; clearing site data or rotating the password requires reactivation.

Build and all 22 API tests passed, including stateless credential rotation and persistent password-attempt limits. Local browser checks passed 57 cases, with five existing Windows WebKit platform skips. New cases cover a fresh browser session, forgotten access, incorrect passwords and storage failures. A live activation/session check succeeded without making an OpenAI request.

## Fast UI Testing — Portfolio 1.2.2

All regular, detailed and custom render requests currently use GPT Image 2.5 Flare at low quality. The buttons and menus stay available for workflow testing, while the server overrides every tier to a fast draft. Requests still create one image each and share the existing usage limits. Set `VISUALIZER_FAST_TEST_MODE=false` in `server/wrangler.toml` and redeploy the API to restore the configured quality tiers. This does not require reconnecting tablets.

## Compact Tablet Studio — Portfolio 1.3.0

The visualizer removes the introductory heading, subtitles and redundant surface selector. One Tone colors all cabinet surfaces together. Two Tone has only Island and Wall & Base patterns, with light/dark assignments sorted from the verified swatch RGB values. Choose both colors before creating a two-tone preview. Changing patterns keeps the selected colors; returning to One Tone removes the dark accent.

On tablet-sized screens, the photo, current controls and render buttons fit in one view in portrait and landscape. Only the color list and photo/look strips scroll internally. Home opens the portfolio while an image is rendering; the result-ready banner returns to the same design. Hardware options use an accessible dialog. The hidden salesperson menu can scroll separately when opened. Narrow phones retain a normal stacked layout.

Exterior steps remember independent selections, and Next/Back never creates a rendering. Siding defaults to material-preserving visualization using the combined siding references. The image service remains locked to Flare/low testing mode.

Validation: production build and 24 API tests passed. Local Chromium/WebKit checks passed 64 cases; six Windows WebKit codec/service-worker/accessibility cases use existing platform skips and are covered in Linux CI. The screen-fit checks cover 1180×820, 834×1194, 1280×800, 800×1280 and 1024×768 views in all three layouts, including multiple uploaded photos. UI rendering tests use stubs and incur no OpenAI charges.

## Guided Choices — Portfolio 1.3.1

The two main kitchen choices are now **Color Options** and **Hardware Finishes**. Color Options contains One Tone and Two Tone. Selecting Two Tone → Island starts with **Select Island Color**, then advances to **Select Cabinet Color** after the first selection. Wall & Base follows the same sequence for base color, then wall-cabinet color. Numbered steps and brief guidance show what to do next. Both colors remain editable, and the darker shade stays on island/base cabinetry.

Hardware Finishes exposes hardware style/finish plus the existing backsplash and countertop concepts directly in the control panel. Switching sections preserves selections. Hardware-only previews work without selecting a cabinet color.

The exterior choices span the studio width. Only detected surfaces appear; up to ten choices, including Shutters, fit one row on supported tablet sizes. Brick, Stucco and Columns are removed from the customer controls. Siding 1 colors the main siding area; Siding 2 colors an existing distinct accent/secondary siding area. Both have independent colors. The empty photo area now explains the visualizer and how to take/select photos and create a preview.

Validation for 1.3.1: production build and all 25 API tests passed. Focused Chromium/WebKit visualizer checks passed 35 cases with one Windows WebKit accessibility skip. These cover the automatic two-tone sequence, hardware-only rendering, persistent panel choices, independent siding colors, tablet screen fit, single-row exterior labels and accessibility. GitHub Actions runs the complete portfolio suite before deployment. No paid image calls are made by these tests.

## Preview Actions and Labels — Portfolio 1.3.2

The customer has one Create My Preview action using Flare/low. Hidden Consultation Tools contains Create Detailed Preview and detailed custom rendering. These require operator authorization before quota reservation and use Sunburst/high, as an explicit exception to fast draft mode. Ordinary requests stay fast.

The app bakes exact selected color names/codes into the bottom-left of the returned image before display, saving and export. Surfaces sharing a color are grouped. Custom instructions can include verified SW codes for the reference label. Unknown original colors are labelled Existing Colors; custom requests without verified references say Colors Not Specified, rather than inventing a code. Original photos are unmodified. Labeling uses no additional AI calls.

Hardware styles are Keep Existing, Knobs, Small Handles and Big Handles. Finishes include Gold and Copper. Legacy hardware identifiers remain accepted for compatibility.

Validation: production build, all 26 API tests and 39 focused Chromium/WebKit checks passed (one Windows WebKit accessibility skip). Image-label checks verify exact names/codes, preserved dimensions and the bottom-left panel pixels. Detailed requests without operator access are rejected before paid quota is reserved. Tests use sample images and mocked image-service responses.


## Larger Studio, Surface Guides and Corrections — Portfolio 1.4.0

On landscape tablets the working photo fills the right side, with finish controls and a four-column, two-row photo grid on the left. Portrait keeps the photo at the upper right, thumbnails at the upper left, and finish controls below. Add Photos, View Fullscreen and Show Original use compact controls with touch targets of at least 44 pixels. The saved-status badge has been removed; previews still save automatically, and storage failures still show an alert. Elapsed-time messages use plain punctuation.

When a connected tablet selects a photo, the app analyzes that photo once per project type. Choosing a surface displays an **approximate** outline of its detected area. Hide Highlight clears it, and selecting another surface shows that surface's outline. Absent or uncertain exterior areas are hidden from the customer surface menu. The hidden Show All Surface Options override can expose missed areas for the representative. This is a separate vision analysis used to guide the image edit, not a pixel-perfect segmentation mask or a guarantee of the renderer's behavior. Analysis failures show a Retry Detection action and keep the customer menu empty until detection succeeds or the representative enables the override. Browsing previously detected areas works offline while that consultation stays open; new analysis and previews need internet.

Use the hidden consultation tools (hold a project-type button for five seconds or tap it eight times) for:

- **Correct Detected Areas:** explain a wrongly identified surface before rendering. This re-analyzes the original photo with the prior regions and your feedback. No image render is created.
- **Correct This Preview:** available after creating a preview. Explain what went wrong, then Apply Correction. The fast renderer receives the original photo, the previous unlabelled preview, the selected finishes and your feedback. It creates a new Look, preserving the previous one. Use the normal color controls to choose new colors; use corrections to fix mistaken surfaces or unintended edits.

The latest five correction notes are retained for that photo and project type during the consultation and are included in subsequent previews. Saved previews retain their notes, original photo and unlabelled render locally, alongside the labelled image used for viewing/export. Starting a new consultation clears active photos, highlights and correction memory. These notes do not permanently train or fine-tune the underlying model and do not transfer to other customers or tablets.

Surface detection uses GPT-6 Luna through the authenticated service with `store:false`, a strict JSON schema and validated normalized polygons. Its separate persistent allowance is 30 analyses per rolling hour across the service, at least one second apart, with no daily cap. Corrections and detailed/custom prompts require the representative credential; customer presets still use ordinary tablet access. Rendering allows five attempts per rolling ten minutes and 30 per hour, with no daily cap. Nothing automatically retries a failed billable request.

Official implementation references: [Images and Vision](https://developers.openai.com/api/docs/guides/images-vision), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna). Vision localization can be inaccurate; corrections are provided to refine the selected areas.


Validation for 1.4.0: production build and all 29 service tests passed. The complete local browser suite passed 82 cases with six existing Windows WebKit skips; final focused Chromium/WebKit checks cover queueing, cancellation, eight-photo layout, navigation, highlights and revisions. Live service smoke testing used one public portfolio photo: one surface analysis, one fast preview and one two-image correction succeeded. GitHub Actions runs all browser cases on Linux before publishing.


## Separate Project Photos and Picture-Only Preview — Portfolio 1.4.1

Kitchen & Cabinets and Home Exterior now each have their own library of **up to four photos**. Switching types restores that type's photos, finish selections and selected Look. Adding photos to one type never adds them to the other. Starting a new consultation still clears both libraries together.

Four larger thumbnails use a two-by-two layout on the left. Add Photos, View Fullscreen, Show Original, all Look buttons, detection status and rendering progress also stay on the left. Once a photo is uploaded, the right pane contains only the photo and its optional surface highlight. Portrait retains the picture at the upper right with finish controls below. The finish controls scroll within their panel when space is tight; Create My Preview stays visible.

Surface analysis now returns likely substrate/profile, observed original color, confidence and exclusion holes alongside the region polygons. It groups siding using both material/profile and base color, includes matching disconnected faces, treats shadows as lighting variation, and does not invent a second group because a wall is a gable. Window/door openings, masonry and other non-target areas are excluded. Low-confidence detections show no guessed highlight. These guides remain approximate; use Correct Detected Areas to refine them.

The render prompt names selected surfaces and explicitly locks the other exterior features. It preserves original exposure, white balance, color temperature, contrast, shadows and original colors on unselected areas, and supplies protected-region descriptions as references. The original photo stays authoritative during corrections. The fast image model and quality settings are unchanged. Prompting can reduce unintended changes but cannot guarantee identical unedited pixels; [OpenAI's image prompting guide](https://developers.openai.com/api/docs/guides/image-prompting) explains that exact preservation requires compositing with an approved accurate mask. This release does not composite approximate masks into customer photos.


Validation for 1.4.1: production build and all 31 service tests passed. The focused visualizer/storage/label suite passed 63 Chromium/WebKit cases with one existing Windows WebKit accessibility skip, followed by four passing final tablet layout checks. New checks cover separate four-photo limits, retained per-type selections/Looks and picture-only right panes. GitHub Actions runs the complete portfolio suite before deployment.


Surface guides now use the prepared photo's actual width and height with original-detail vision input. Native pixel coordinates are normalized independently for each axis, including correction feedback, to reduce shifted overlays on rectangular photos. Native-coordinate conversion and invalid dimensions have service test coverage. [OpenAI's vision guide](https://developers.openai.com/api/docs/guides/images-vision) recommends original detail for coordinate-sensitive tasks. Detection and preservation remain approximate with the current fast models.


## Cabinet Simplicity and Wall-Cladding Groups — Portfolio 1.4.2

Kitchen & Cabinets no longer runs a surface-detection call or displays highlights/detection status. One-/two-tone choices, hardware controls and normal rendering still work, and Correct This Preview remains available to the representative. Surface correction and automatic detection are exterior-only in the current client.

For Home Exterior, **Siding 1** and **Siding 2** mean primary and optional secondary wall-cladding groups. Either may be lap/panel siding, **brick or stucco**. Detection uses material/profile and original base color together, preserving matching disconnected wall faces as one group. Siding 2 stays empty when no distinct second group exists. Exact duplicate primary polygons are removed from the secondary result, and the rendering prompt explicitly prohibits applying an absent Siding 2 color to Siding 1. Representative corrections can identify a genuinely missed group. The combined exterior palette includes brick and stucco color decks; digital previews do not determine final coating suitability.

Garage Door includes the panels plus plain functional frames/jambs in the same selected color. Decorative casing, bands, arches and applied overlays on or around a garage that match the house trim belong to Trim. Detection excludes those from garage polygons and rendering preserves them unless Trim is independently selected. Door glass and hardware stay unchanged. Detection and render prompts share these rules from `server/exteriorRules.mjs` to avoid conflicting substrate definitions.

Looks use a two-column grid: Look 1/2, then 3/4, then 5/6, with no horizontal scroll. The buttons stay on the left beside the photo. The fast models and existing usage limits are unchanged. Interpretation remains approximate; use the representative correction tools when an area is missed.


Validation for 1.4.2: the production build and all 32 service tests passed. Chromium/WebKit visualizer checks cover exterior-only detection, six Looks wrapping in three rows, tablet fit, correction flows and separate photo libraries. A live detector smoke test on the portfolio's brick-and-stucco example identified stucco as Siding 1 and brick as Siding 2. The sample test made one analysis call and no image render calls; image edits remain on the configured fast model. GitHub Actions runs the complete suite before publishing.


## Shared Tablet Consultations — Portfolio 1.5.0

Both tablets must be activated with your existing tablet password and connected to the internet to exchange photos. There is one active consultation for the connected tablet group. Photos are not posted to GitHub or a public image URL.

### At the appointment

1. Open Visualizer. Hold Kitchen & Cabinets (or Home Exterior) for five seconds to open Consultation Tools.
2. Under **Shared Consultations**, enter a name such as **Smith Kitchen - November 1**, then choose **Start a New Consultation**. You can also upload photos first to create an automatically named consultation and use **Rename Current Consultation** afterward.
3. Upload up to four kitchen photos and four exterior photos. Original photos are saved, even before you make a render. Wait for **Synced to Shared Consultation**. The other activated tablet fetches changes automatically, normally within about five seconds while open; larger image transfers can take longer.
4. Hand the other tablet to the homeowner. Open Visualizer there if it is on the home page. Its photos and any sample Looks will be available. The homeowner can choose colors and make more Looks, or browse the rest of the portfolio. Photo selection and unrendered color choices are independent on each tablet; saved Looks sync to both.
5. Every finished Look retains its exact labelled image, unlabelled image used for corrections, original photo, finish selections and correction notes. A visible sync error means the data has not yet reached shared storage. Use **Retry Sync** in your tools after resolving the connection.

### Clearing the customer session

The active consultation clears on both tablets **one hour after it starts or is reopened**, even if the homeowner is still tapping. Clearing returns the app to Home and clears its customer-facing photos, Looks and filters. It does **not** delete the named consultation. Background/sleeping tablets check on waking. An offline tablet also enforces the cached expiry locally. Use **End Customer Session** to clear both tablets earlier while online. The general portfolio inactivity reset is now 60 minutes.

### Follow up later

Open Consultation Tools → **Saved Consultations**, search for the name, and choose **Open**. The original photos and all saved Looks load again, and a fresh one-hour customer session begins on the connected tablets. Select a photo and use the normal color controls for a future render, or select a Look to review it. Use **Save Image** or **Share Image** in the hidden tools for email attachments or your tablet's share sheet. The app does not send email automatically.

**Delete** in the shared library permanently removes that consultation's originals and Looks from shared storage after confirmation. It is separate from the automatic one-hour clear. Existing previews made before 1.5.0 remain in **Saved Previews on This Tablet**; they are not silently uploaded or reassigned to another customer.

### Connections and offline behavior

Uploads and finished renders enter a persistent local sync queue before showing as complete. If the connection drops, keep the originating tablet's site data intact and reopen it online to resume syncing. Repeated uploads use the same IDs, preventing duplicate photos/Looks. New AI rendering requires internet. Existing active-session images and previously opened image files can be viewed from local storage offline. Unsynced items are retained locally even after the customer-facing hour expires, so they can finish uploading into the archive later. Clearing browser/site data before syncing removes those unsynced items.

When there are unsynced items, let them finish before opening or deleting another saved consultation. The active consultation status shows pending uploads and errors rather than claiming a cloud save succeeded. Both devices must be online for automatic exchange; a closed or suspended app catches up when reopened.

### Storage and deployment

Shared metadata is in the existing Cloudflare Durable Object, and media is in the private R2 bucket **spray-net-portfolio-consultations**, bound as `CONSULTATION_MEDIA`. Bucket public access remains disabled. The Worker authenticates all metadata and image requests. Shared-library listing, naming, reopening and deletion require the representative credential; ordinary tablet access can use the active consultation.

Current protective limits: 1,000 consultations, 120 Looks per consultation, four photos per project type, 6 MiB per stored image and 2 GiB of shared media for this app. Reaching a limit shows an error; originals and local queued items are retained for recovery. Retention has no automatic deletion date. R2/Worker allowances and any overage charges are determined by the existing Cloudflare account; the app cap is not an account-wide billing cap. See [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

The frontend still deploys through the existing GitHub Actions workflow. Changes to consultation storage endpoints additionally require deploying `server/wrangler.toml` with the existing Wrangler command. The portable Node image-service adapter continues to support local rendering; shared R2 consultations are enabled on the configured Cloudflare deployment. See [Visualizer API](docs/VISUALIZER-API.md) for endpoint details.


Validation for 1.5.0: the production build and all 38 service tests pass. New browser tests use separate device contexts to exercise automatic photo/render exchange, browsing the rest of the portfolio, one-hour clear, archive reopening for future renders, failed-upload recovery after reload and an offline deadline. The offline-upload case runs on both engines. Chromium uses native offline emulation; WebKit blocks HTTP traffic and receives offline/online events because Playwright's native offline mode also blocks local file reads on Windows and Linux. Separate recovery and expiry cases run on both engines. A live private-storage smoke test verified original/render uploads, identical returned bytes, idempotent retries, representative-only archive access and cleanup without changing the active customer or calling the AI provider.


Local release verification: 99 full-suite browser checks passed with seven documented Windows/WebKit skips before the offline-emulation correction, followed by all eight passing Chromium/WebKit consultation checks with no consultation skips. Portrait/landscape studio fit and shared-tools WCAG AA checks also passed. GitHub Actions runs all 106 cases on Linux before deployment.


## Home Layout and Render Controls — Portfolio 1.5.1

Home navigation rows have more vertical space, scaling from 28 to 48 pixels with screen height. Visualize Your Home uses Spray-Net orange (#f16122) with dark text for contrast.

Selected brick, whether chosen through Siding 1, Siding 2, or the legacy Brick field, now instructs the renderer to stain brick faces and mortar joints the same selected color while preserving recessed joints and masonry texture. Unselected masonry remains protected. These are rendering instructions rather than permanent model training.

The daily rendering cap is removed. Across activated tablets, rendering allows five attempts in a rolling ten minutes and 30 in a rolling hour, with the existing five-second interval and one active request. Limit messages show a wait time instead of a daily lockout. Previous usage records remain compatible; their daily totals no longer block rendering. Surface analysis has a separate 30-per-hour allowance with a one-second interval and no daily cap.

Validation: the production build, all 40 service tests, and five focused Chromium/WebKit navigation, responsive layout and accessibility checks passed (one existing WebKit accessibility skip). New service checks cover exact rolling-window expiry, persisted usage across restarts, old daily-count compatibility, and brick/mortar prompt coverage for both siding groups. Portrait and landscape visual checks showed no horizontal overflow. GitHub Actions runs the full suite before publishing.


## Shutters and Photo-Specific Surface Menus — Portfolio 1.6.0

An uploaded/selected exterior photo shows **Detecting Visible Surfaces...** while analysis runs. Its surface menu then includes only confidently detected areas. Back/Next uses that same list, so a side view can show just Siding 1, Soffits and Fascia. Low-confidence, absent and failed detections do not populate the customer menu. Kitchen photos continue without surface detection.

If shutters are detected, select **Shutters** and choose a color or **Remove Shutters**. Removal instructs the renderer to continue the adjacent wall material and finish behind the shutters while protecting windows and frames. Keep Existing restores the original shutter treatment. Removal-only renders are supported and labelled **Shutters: Removed**. These choices sync and remain available in saved consultations.

Switching photos rebuilds the menu for that view. Hidden previous-photo color choices and shutter removal are excluded from its new render request. In Consultation Tools, **Correct Detected Areas** and **Retry Detection** improve a missed interpretation; **Show All Surface Options** provides a per-photo representative override. Detection is approximate, and preview quality still depends on the model and source photo. Older saved Looks without shutter detection refresh their surface analysis when reopened.

### Current Preview Cost

As of November 2, 2026, ordinary previews use GPT Image 2.5 Flare at low quality. Two live previews of the existing Dover Gray brick sample used 1,508 image-input tokens and 129 image-output tokens each, plus 3,472/3,512 text-input tokens. At [OpenAI standard prices](https://developers.openai.com/api/docs/pricing) of $8/M image input, $5/M text input and $30/M image output, these cost approximately **$0.0333 each**, or **$3.33–$3.35 per 100 comparable previews**. Budget approximately $3–$5 per 100 standard previews; this is a sample-based estimate, not a flat price. Initial exterior analysis, two-image corrections, detailed renders, different resolutions and any taxes are additional or can change the total. Direct Images API requests do not receive cached-input discounts.

The authenticated render response optionally includes only validated numeric `usage` counts (inputTextTokens, inputImageTokens, outputImageTokens) when supplied by the provider. No provider payload, key or account details are forwarded or logged. The customer interface does not display billing data.

Validation: production build, all 43 service checks, and 63 Chromium/WebKit visualizer/label checks passed, with one existing WebKit accessibility skip. New checks cover detected-only navigation, loading/error/empty states, shutter recoloring/removal, filtering hidden previous-photo changes, archive persistence, labels and usage metadata. Portrait/landscape fit and new-control WCAG AA checks passed. Live verification detected shutters in the public sample, recolored them, and removed them with two fast previews (12 and 10 seconds). Automated checks use stubs; the live verification used two render requests and one surface-analysis request.
