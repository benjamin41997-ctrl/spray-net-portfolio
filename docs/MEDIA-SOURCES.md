# Network media collection

Prepared September 12, 2026 for the South Charlotte portfolio. These are network examples, not South Charlotte jobs or reviews. The app displays that distinction on galleries, project details, the reviews page, and the footer. Project locations are intentionally blank. No unrelated review is attached to a project.

## Photos

16 project pairs / 32 real photos cover Cabinets, Siding, Brick, Stucco, Doors & Windows, and Commercial. Siding examples include aluminum, vinyl, and engineered wood. The source is the existing downloaded library at `Spray-Net South Charlotte/Marketing/Photos/BeforeNOW/` in the shared workspace. No AI-generated transformations or scraped franchise photographs were substituted.

[media-sources.json](media-sources.json) records every source filename, SHA-256 hash, output file, and output dimensions. Before/now order follows the source filenames and was visually reviewed. One potentially ambiguous brick pair and a duplicate kitchen were excluded. Source project identifiers remain in this maintainer record; customer-facing titles do not invent a local location.

Images retain the full original frame and were converted to WebP at up to 1800 pixels on the longest edge. Orientation was normalized and embedded metadata removed. No colors, architectural features, or project outcomes were retouched. Paired views are the default for substantially different camera angles. A slider remains available, with a note that lighting and camera angles can differ. Unknown color names and cabinet materials are not guessed.

Remaining photo gaps: a confirmed bathroom vanity, verified cabinet-material distinctions (wood vs laminate/thermofoil), fiber cement, and a standalone front/garage-door pair. Those are not filled with mislabeled examples. Green and Other color filters may have empty results in this first curated set.

## Customer testimonials

Three short excerpts are attributed to the customer names published on the [corporate reviews page](https://www.spray-net.com/user-review): Tina, Vicki Hopton, and Mike And Ratchel Saltiis. Spelling follows the source. These are network testimonials, not local reviews. Source URLs are stored in `src/data/reviews.js` for maintenance and are not outbound customer navigation.

The source excerpts do not show individual numeric ratings, so `rating: null` suppresses stars. No aggregate rating or review count is claimed. The old fictional review screenshot was retired. The screenshot viewer remains supported for future authentic review screenshots; do not generate a graphic that pretends to be a Google review.

The two old `/wp-content/uploads/2019/04/` screenshot URLs supplied as starting points did not resolve during this pass, so they were not used.

## Videos

The following files were already in `Franchisee Site - Documents/English/Marketing/Home Show/Video for Home Show/`:

| App file                              | Original corporate filename                | Duration      | Size             |
| ------------------------------------- | ------------------------------------------ | ------------- | ---------------- |
| `network-exterior-transformation.mp4` | `Total exterior home transformation.mp4`   | 89.81 seconds | 25,979,775 bytes |
| `network-home-transformation.mp4`     | `Spray-Net total home transformation!.mp4` | 56.29 seconds | 16,036,179 bytes |

These are unchanged local MP4s. Their storyboards were inspected and the preview images were extracted from the actual films. Both include roof-coating footage; the descriptions make that explicit and do not promise that every depicted service is available locally. The older home-transformation film retains its original end-card branding. Local videos are on-demand and not included in the initial offline cache. Playback/seek tests cover local files, but caption/transcript review remains an accessibility follow-up; no invented dialogue or captions have been added.

The third card embeds the Sherry Holmes kitchen collaboration identified by the [corporate collaborations page](https://www.spray-net.com/collaborations): `EZZetN1m7bg`. Its preview is a branded title card, not a photograph of an unrelated project. YouTube is never precached. Actual YouTube availability and caption options remain controlled by the publisher; automated tests verify the embed integration using a network stub.

## Corporate reference sheets

Rendered from `Franchisee Site - Documents/English/Selling/Surface One-Pagers to sell/`:

- `Cabinet coating test results.pdf`, page 1 → `cabinet-tests.webp`.
- `Exterior paint benchmarking US.pdf`, page 1 → `exterior-tests.webp`.
- `Stucco Tool.pdf`, page 1 → `stucco-technology.webp`.

The originals are displayed inside the app with fullscreen viewing and zoom. Their original branding and footnotes are retained. The comparison cards identify in-house testing, not independent certification. The dense comparison images have text summaries; a complete accessible HTML transcription of each table remains a possible follow-up. The Canadian comparison sheet was not substituted for the US version. Page 2 of the stucco sheet was not added because the printed thickness units need confirmation before presenting them to customers.

## Internal training located, kept outside the public app

`Franchisee Site - Documents/English/Production/1- Exterior division/Surface Specific Videos/` contains the English Kitchen, Brick, Siding, Stucco, Door, Garage, and Window process films. These originals range from about 1.4 GB to 5.4 GB. They need content, audience, caption, and compression review before any customer-facing excerpts are prepared. Uploading the entire staff-training library to a public repository is not part of this media update.

The user-supplied `Kitchen Process Jan2026.pptx` personal SharePoint link and Yammer discussions have not been opened or downloaded in this pass. The synced corporate library provided the selected photos and marketing films; no claim is made that the remote vault was exhaustively searched. Guides about filming testimonials and earning reviews are production guidance, not evidence of customer reviews.

## Replacing these with local work

Add each verified South Charlotte job as a new project with its real location, surface, color, and own photographs. Set `attribution: 'Spray-Net South Charlotte project'`. Keep network attribution on existing network examples while both collections are in use. Add reviews only with their real source, scope, and published rating. Update `settings.portfolioNotice` once the portfolio is entirely local.

Real-media verification on September 13, 2026: **17 browser checks passed, 3 documented skips**. The production build and all content/media-path validation passed. Automated WCAG A/AA checks reported no violations on the scanned screens. YouTube integration was tested with a stub; this does not certify the remote video's availability.
