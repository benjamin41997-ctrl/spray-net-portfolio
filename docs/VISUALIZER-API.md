# Visualizer API

The public portfolio stays on GitHub Pages. A separate, authenticated API sends a homeowner photo and a fixed design instruction to OpenAI. **Never put the OpenAI key in React, a `VITE_` variable, GitHub Pages, or the tablet connection code.**

The salesperson enters one tablet password in the hidden tools. The service returns separate revocable access tokens for normal and custom rendering. The app remembers those tokens locally across browser/app restarts and never saves the password. There is no customer account or sign-in flow, and the OpenAI key stays on the server.

## What is implemented

- Kitchen cabinet colors, separate upper/lower cabinets, a separate island, hardware style/finish, and optional backsplash/countertop concepts.
- Exterior siding, brick, stucco, entry doors, garage doors, window frames, soffits, fascia, vents, columns, and trim.
- Up to eight uploaded photos per consultation, one selected original per request, without previous conversation history. Uploading and switching angles incur no API usage. Each change starts from that angle's original.
- Server-built instructions preserve layout, camera view, lighting, appliances and unselected surfaces. Ordinary rendering accepts verified color IDs and a small set of options. Custom instructions require a separate operator credential; clients cannot change model, source URL or output size.
- **Current UI test mode:** customer preview requests use `gpt-image-2.5-flare` at `low` quality; operator-only detailed requests use Sunburst/high. One WebP is returned. With fast test mode disabled, the configured tiers are Flare/medium and Sunburst/high.
- No automatic retries. A timed-out or cancelled request may still incur provider usage, so every dispatched attempt consumes one quota slot.
- Photos and renderings are never written to the API filesystem or Durable Object storage. The server stores usage timestamps/counts only. The photograph is sent to OpenAI to create the rendering. The portfolio manages local saved designs on the tablet separately.

These are visual design concepts, not measured color matches or construction specifications. Confirm the actual color with a physical sample. A backsplash, countertop or hardware concept does not establish that Spray-Net will perform that work.

## Cloudflare deployment

`server/wrangler.toml` defines a **separate** Worker named `spray-net-visualizer-api`. It does not modify the review portal Worker. The `VisualizerGate` Durable Object serializes renders and persists the service-wide rolling usage windows atomically. Private consultation media uses the separate R2 binding described below.

Use an authenticated Wrangler CLI from the existing Cloudflare setup. From the repository root:

```powershell
wrangler deploy --config server/wrangler.toml
wrangler secret put OPENAI_API_KEY --config server/wrangler.toml
wrangler secret put VISUALIZER_ACCESS_TOKEN --config server/wrangler.toml
```

Supply each secret through the interactive prompt or a secure process pipe. Do not paste a key into a command argument, shell history, committed file, or chat. Generate the device token locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Store the token in your password manager, then enter the API origin and token in the portfolio's representative connection controls. The token is not the OpenAI key. A token must contain 43–128 base64url or hexadecimal characters; a short PIN is intentionally rejected. Rotate it with the same `wrangler secret put` command if a tablet is lost or the token is disclosed, and reconnect authorized tablets.

### One-Time Tablet Password

Set `VISUALIZER_TABLET_PASSWORD` as a Cloudflare secret using a secure prompt or stdin pipe:

```powershell
wrangler secret put VISUALIZER_TABLET_PASSWORD --config server/wrangler.toml
```

Use a private password of 12–128 characters. It is not committed, placed in a `VITE_` variable, returned by the API, or saved in tablet storage. Keep its recovery copy outside version control. In the installed app, hold **Kitchen & Cabinets** for five seconds (or tap eight times within six seconds), enter **Tablet Password**, and select **Activate This Tablet**. No JSON file is needed.

`POST /api/connect` accepts only `{ "password": "..." }` from an allowed browser origin, with a 1 KiB body limit. On success it returns `{ "ready": true, "token": "...", "operatorToken": "...", "operatorAuthorized": true }` with `Cache-Control: no-store`. A wrong password returns 401. Each attempt is reserved durably before verification: at most six per network address and 100 across the service per ten minutes. Only a SHA-256 address fingerprint and timestamps are retained for this limiter; no passwords or photos are logged or stored. Storage failures block connection. Activation makes no OpenAI request and consumes no image allowance.

The lasting credentials are separate HMAC-SHA-256 derivatives of the password and the existing device/operator server secrets. They have no calendar expiry and survive deployments while those secrets remain unchanged. Password rotation invalidates password-issued connections; activating again restores access. Rotating the underlying device/operator secrets also revokes their corresponding legacy connections. Keep those master secrets private. The app stores one atomic connection record in localStorage, requests browser persistence where available, and offers **Forget This Tablet** to remove access. Site-data clearing, browser eviction and private browsing can still remove it.

### Operator Service Secret

Custom instructions stay disabled until a separate `VISUALIZER_OPERATOR_TOKEN` is configured. Generate a new random 32-byte base64url secret, distinct from the tablet token, and store it through a secure prompt/pipe:

```powershell
wrangler secret put VISUALIZER_OPERATOR_TOKEN --config server/wrangler.toml
```

The service uses this operator secret to derive the custom-render access token returned after password verification. Neither master secret needs to be entered on a tablet. The old setup-file importer and multi-field connection form are removed. Legacy private QR links still work, immediately remove their credentials from the address, and now remember access locally. Existing session-only connections migrate to remembered storage automatically.

Open the hidden menu by holding **Kitchen & Cabinets** or **Home Exterior** for five seconds, or tapping either button eight times within six seconds. The gesture hides salesperson controls; the API credential separately authorizes custom rendering. Closing tools clears the typed custom prompt. Custom and ordinary renders share the same model settings, one-image output, rolling usage windows, concurrency limit, and original-photo flow. There is no separate prompt-generation model call.

Set `VISUALIZER_ALLOWED_ORIGINS` to exact HTTPS **origins**, not full page URLs. For GitHub Pages this is `https://benjamin41997-ctrl.github.io`, without `/spray-net-portfolio/`. There is no wildcard CORS setting. An origin restriction is supplementary; the device token is the authorization boundary.

The configuration allows five attempts per rolling ten minutes and 30 per rolling hour, a five-second minimum interval, and one active rendering. There is no daily rendering cap. Adjust these values in `server/wrangler.toml` before deployment as needed. An attempt is persisted before the paid request. Rolling windows survive Worker restarts, deployments and token rotation, including across midnight. Legacy daily counters remain readable for compatibility but never block a render. A limit response includes the remaining wait in its message and `Retry-After` header. Use the same Durable Object binding and name when redeploying; creating a different Worker/object creates separate usage history.

Cloudflare may defer active Durable Object code updates for up to five minutes after deployment. Check the `X-Visualizer-Release` response header on `/api/session` before a live smoke test, or use a current Wrangler release with `--durable-objects-code-update-mode immediate` when no render is running. The request adapter uses `redirect: 'manual'`; Workers rejects the Fetch standard's `redirect: 'error'` before sending a request. Non-2xx responses are handled without following redirects. See [Cloudflare code update behavior](https://developers.cloudflare.com/changelog/post/2026-10-30-durable-objects-deferred-code-updates/) and [Request options](https://developers.cloudflare.com/workers/runtime-apis/request/).

Rendering incurs OpenAI API usage. A ChatGPT subscription does not supply this server's API credentials or establish its API budget. Verify the account's permitted image models and billing limits before enabling customer use. Cloudflare hosting follows the existing account's plan and Durable Object allowance; this repository does not provision a new paid plan.

## Local Node 24 server

Copy `.env.example` to the ignored `.env` file and fill in the server key and generated token. The token, key and allowed origins are required; otherwise rendering stays disabled. Rolling limits default to five per ten minutes and 30 per hour. The former `VISUALIZER_MAX_DAILY_RENDERS` setting is obsolete and ignored.

```powershell
node --env-file=.env server/index.mjs
```

By default it listens at `http://127.0.0.1:8787`. Plain HTTP is only intended for loopback development. A tablet opening the deployed HTTPS portfolio needs an HTTPS API address, such as the Worker. Do not point a tablet at the PC's `localhost`.

For a self-hosted Node deployment, put it behind an HTTPS reverse proxy, keep one server process, and place `VISUALIZER_USAGE_FILE` on a persistent volume. The proxy must permit a request body slightly above 8 MB and allow at least 250 seconds for a render. Disable request/response body logging and never log authorization headers. The server itself logs only startup status.

`server/.local/usage.json` is an atomic ledger that survives restarts. Startup acquires an exclusive `.lock` file. If the process is killed abruptly, inspect and remove the stale lock only after confirming no other instance is using the ledger. An unreadable/corrupt ledger blocks rendering; never silently delete it to reset usage history. Multiple replicas require the Cloudflare Durable Object deployment or a shared transactional quota service.

### Configuration

| Variable | Default / behavior |
| --- | --- |
| `OPENAI_API_KEY` | Required server secret |
| `VISUALIZER_ACCESS_TOKEN` | Required random device secret, 43–128 characters |
| `VISUALIZER_OPERATOR_TOKEN` | Optional separate random operator secret, 43–128 characters; custom prompts disabled without it |
| `VISUALIZER_TABLET_PASSWORD` | Optional private 12–128 character password; required for one-password activation |
| `VISUALIZER_ALLOWED_ORIGINS` | Required comma-separated exact HTTPS origins; localhost HTTP allowed for development |
| `VISUALIZER_MAX_TEN_MINUTE_RENDERS` | 5, permitted range 1–60; rolling ten-minute window |
| `VISUALIZER_MAX_HOURLY_RENDERS` | 30, permitted range 1–60; rolling hour |
| `VISUALIZER_MIN_INTERVAL_SECONDS` | 5, permitted range 1–60 |
| `VISUALIZER_TIMEOUT_SECONDS` | 240, permitted range 30–300 |
| `VISUALIZER_FAST_TEST_MODE` | `true` in the deployment/example; forces Flare/low for customer previews; operator detail uses its configured model. Unset or `false` restores configured tiers |
| `VISUALIZER_PREVIEW_MODEL` | `gpt-image-2.5-flare` |
| `VISUALIZER_DETAIL_MODEL` | `gpt-image-2.5-sunburst` |
| `VISUALIZER_USAGE_FILE` | Node only: `server/.local/usage.json` |
| `VISUALIZER_HOST` | Node only: `127.0.0.1` |
| `VISUALIZER_PORT` | Node only: `8787` |

Model overrides are restricted to the two GPT Image 2.5 models above or their `2026-09-08` snapshots. The tablet cannot change the server's model configuration.

## API contract

`GET /api/health` returns `{ "configured": true }` without authentication. This reports configuration presence, not a successful billable model call. `GET /api/session` requires `Authorization: Bearer <device token>` and returns `{ "ready": true, "operatorAuthorized": false }`. An additional valid `X-Visualizer-Operator` header sets `operatorAuthorized` to `true`.

`POST /api/render` requires the same authorization header and `Content-Type: application/json`:

```json
{
  "image": "data:image/jpeg;base64,...",
  "quality": "preview",
  "design": {
    "mode": "kitchen",
    "surfaces": { "cabinets": "<catalog-color-id>", "island": "<catalog-color-id>" },
    "hardwareStyle": "bar",
    "hardwareFinish": "brass",
    "backsplash": "keep",
    "countertop": "keep"
  }
}
```

The prepared image must be JPEG, PNG or WebP, at most 6 MiB decoded. File signatures and canonical base64 are checked. The total request is limited to 8 MiB plus 16 KiB. Remote URLs, SVG, compressed request bodies and unknown fields are rejected. The UI reduces camera photos before upload; an original phone photo may be larger than this API limit.

Optional top-level `customPrompt` accepts up to 1,500 characters of text. Nonempty custom text additionally requires the separate `X-Visualizer-Operator` secret. Missing/wrong operator authorization returns HTTP 403 `operator_required` before a quota reservation or provider call. A valid manual request may omit preset changes. Server instructions constrain edits to renovation of the supplied home and preserve unspecified features. The prompt is saved locally with that result; ordinary rendering never inherits it.

Omit surface keys that should stay unchanged; do not send empty color IDs. Accepted surfaces:

- Kitchen: `cabinets`, `upperCabinets`, `lowerCabinets`, `island`. Use either `cabinets` or separate upper/lower keys.
- Exterior: `siding`, `siding2`, `brick`, `stucco`, `frontDoor`, `garageDoor`, `windows`, `soffits`, `fascia`, `vents`, `columns`, `trim`.

Kitchen options default to `keep` when omitted:

- `hardwareStyle`: `keep`, `bar`, `knob`, `cup`, `none`.
- `hardwareFinish`: `keep`, `matte-black`, `brushed-nickel`, `brass`, `chrome`, `bronze`.
- `backsplash`: `keep`, `white-subway`, `marble`, `warm-neutral`.
- `countertop`: `keep`, `white-quartz`, `marble`, `dark-stone`, `butcher-block`.

Exterior requests cannot change kitchen options. At least one visible preset change or authorized custom instruction is required. Color IDs are validated against `src/data/colors.js`. Official Sherwin-Williams rows with `referenceOnly: true` and source `sherwin-williams-official` are accepted for visual design without asserting coating availability; other IDs must match collection and coating system. An optional `design.sidingMaterial` is `auto` (the default combined siding reference deck), `vinyl`, or `other` (aluminum/fiber cement/engineered wood). The tablet now sends `auto` without asking the homeowner to classify the material; its prompt preserves the original siding material/profile/texture. Legacy explicit material choices remain accepted. Brick uses BRICK, stucco ELASTO, doors/window frames D+W, other siding MAT/SATIN, and trim/soffits/fascia/vents/columns MAT/SATIN/D+W. The representative confirms the actual substrate, color match and coating specification.

Success returns `{ "image": "data:image/webp;base64,...", "requestId": "...", "model": "..." }`. Errors return `{ "error": { "code": "...", "message": "..." } }` with a matching HTTP status. Responses use `Cache-Control: no-store`; upstream error bodies, prompts and credentials are never returned. Rate-limit errors may include `Retry-After`. Do not automatically retry a rendering request.

## Verification

```powershell
node --test server/api.test.mjs
wrangler deploy --dry-run --config server/wrangler.toml
```

Server tests mock OpenAI and incur no API charges. They cover authentication, CORS, schema and image validation, constrained prompt construction, single-request locking, model selection, redacted provider failures, timeout handling, quota persistence, restart protection and storage failure. A real-model smoke test is separate and consumes one render attempt.

OpenAI API schema and model choices were checked against the [image edits reference](https://developers.openai.com/api/reference/resources/images/methods/edit) and [image generation guide](https://developers.openai.com/api/docs/guides/image-generation) on October 30, 2026. Endpoint availability and latency still depend on the configured account and service conditions.

## Live Smoke Tests — October 31, 2026

The deployed authenticated service produced a cabinet recolor using GPT Image 2.5 Flare in 13 seconds and an exterior window-frame edit using GPT Image 2.5 Sunburst in 32 seconds. Both results were visually compared with their original library photos. These are two observations, not a latency guarantee. The originals and results are kept in ignored local QA files; no homeowner data was used. AI edits can alter unselected details, so confirm each output with the homeowner.

## Fast Rendering During UI Testing — November 1, 2026

The deployment sets `VISUALIZER_FAST_TEST_MODE="true"`. `server/renderProfile.mjs` enforces `gpt-image-2.5-flare` and `quality: "low"` for every ordinary, detailed and operator-custom request. The browser cannot raise the model or quality while this flag is enabled. Output count remains one; size stays `auto` to preserve the photograph framing. No automatic retry or fallback to a larger model is added.

OpenAI describes [Flare as its fastest image model](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare), and the [image guide recommends low quality for quick drafts](https://developers.openai.com/api/docs/guides/image-generation). These settings prioritize draft speed; exact latency and charges still depend on input and service conditions. Verified against the official documentation on November 1, 2026.

To restore the configured preview/detailed models, set the flag to `false` in `server/wrangler.toml` and redeploy the Worker. Keep device/operator/password secrets unchanged so existing tablets stay activated. The `X-Visualizer-Render-Mode` response header reports `fast-test` or `standard`. API tests cover all four regular/custom and preview/detail combinations, including a configuration whose ordinary model variables point to Sunburst, and confirm that fast test mode still forces Flare/low.

## Compact Studio Design Mapping

One Tone sends only `cabinets`, which includes island cabinetry unless a separate island selection is supplied. Two Tone Island sends `cabinets` plus `island`. Wall & Base sends `upperCabinets`, `lowerCabinets` and an `island` color equal to the lower/base choice. The tablet orders the two selected swatches by relative sRGB luminance so the darker one is used for island/base cabinetry. Operator custom instructions remain available for exceptional requests.

The exterior wizard edits one existing surface key per step; navigating does not render or erase other selections. `sidingMaterial: "auto"` accepts the union of catalog VINYL/MAT/SATIN references for a siding visualization while preserving the depicted material. This is a design reference, not a coating specification. No changes were made to passwords, token lifetime, usage limits or fast-test model enforcement.

## Secondary Siding and Guided Kitchen Selection

The customer exterior row now contains `siding`, `siding2`, `frontDoor`, `garageDoor`, `soffits`, `fascia`, `windows`, `trim` and `vents`. The API retains brick/stucco/columns compatibility for existing data and custom workflows, while those choices are absent from the customer row. `siding2` shares the primary siding reference rules and accepts an independent color. Prompts distinguish the primary/largest siding area from an existing distinct profile, material, gable or accent section; they forbid inventing a secondary area.

Kitchen panel selection is browser UI state and adds no API fields. The guided sequence starts with island/base color and advances to cabinet/wall color. Existing `cabinets`, `upperCabinets`, `lowerCabinets` and `island` payload mapping is preserved. Opening a panel, moving a step or selecting a color never creates an image request; only an explicit render button does so.

## Preview Actions and Labels — Portfolio 1.3.2

The customer has one Create My Preview action using Flare/low. Hidden Consultation Tools contains Create Detailed Preview and detailed custom rendering. These require operator authorization before quota reservation and use Sunburst/high, as an explicit exception to fast draft mode. Ordinary requests stay fast.

The app bakes exact selected color names/codes into the bottom-left of the returned image before display, saving and export. Surfaces sharing a color are grouped. Custom instructions can include verified SW codes for the reference label. Unknown original colors are labelled Existing Colors; custom requests without verified references say Colors Not Specified, rather than inventing a code. Original photos are unmodified. Labeling uses no additional AI calls.

Hardware styles are Keep Existing, Knobs, Small Handles and Big Handles. Finishes include Gold and Copper. Legacy hardware identifiers remain accepted for compatibility.


### Surface analysis and revisions (1.4.0)

`POST /api/analyze` accepts `{image, mode}` with the existing tablet bearer token. Optional `{feedback, previousRegions}` requires the operator header. The response is `{regions:[{surface,description,polygons:[[{x,y}]]}],model}`. Coordinates are normalized 0..1000. No photographs, region descriptions or correction text are stored by the Worker. Its `analysisUsage` Durable Object record stores only quota counters/timestamps, independently of image render usage (30 per rolling hour, 1-second interval, no daily cap). The local Node adapter uses a separate `.analysis` usage ledger. Requests use GPT-6 Luna, Responses, `store:false`, strict schema, a 60-second timeout and no retries. Each selected photo/type is cached in consultation memory; surface switching makes no new API request.

`POST /api/render` additionally accepts optional `regions`, `corrections` (up to five notes, 1,500 characters each), and `correction:{image,feedback}`. Any correction notes or revision require operator authorization. A revision sends two Images API references: the original home first and the previous unlabelled preview second. Original geometry remains authoritative. First previews and new color families use the original photograph; matching kitchen finish variants use the appearance-reference workflow below. Each image is validated against the existing 6 MiB decoded limit; combined request bodies are bounded to twice the original request allowance. Validated surface guides and correction notes are supplied in the edit prompt. No model output or provider error body is logged. Preview labels are added locally after generation, keeping guide overlays and previous labels out of future model inputs.

The public health response identifies this service release with `X-Visualizer-Release: 2026-11-01.7`. Image model/quality settings and persistent tablet passwords are unchanged by this release.


### Substrate-aware guides (1.4.1)

Service release `2026-11-01.9` adds `substrate`, `existingColor`, `confidence` (high/medium/low) and `holes` (normalized polygon arrays) to each analysis region. The strict provider schema requests all fields; API validation also accepts older region objects for already-open tablets. Low-confidence provider results have empty positive polygons. Positive and exclusion polygons are bounded to 16 polygons of 3–32 points each, with finite coordinates in 0..1000. Exclusion holes are removed from the SVG highlight and passed to the render prompt. Material names and original colors are visual observations, not verified coating recommendations.

The image prompt includes the selected-change allowlist, explicit protected features, original lighting/color constraints and protected-region references. Neither image nor analysis models were upgraded. All previous authentication, quotas, local-only storage, timeouts and no-retry behavior remain in place.


The new client sends `imageSize:{width,height}` (positive integer dimensions up to 4,096 pixels per axis) with `/api/analyze`. Original-detail vision inputs and a per-image schema request native pixel coordinates, then independently normalize x and y back to 0..1000 for the existing UI/render contract. Correction guides are converted in the opposite direction before the next analysis. Missing imageSize keeps the normalized-coordinate path for older tablets. No stronger model or automatic retry is introduced.


### Wall cladding and garage semantics (1.4.2)

Release `2026-11-01.10` shares substrate/garage definitions between analysis and edits through `server/exteriorRules.mjs`. Siding keys include brick and stucco wall groups. Auto siding colors accept the union of vinyl, MAT, SATIN, brick and ELASTO references; legacy explicitly selected material restrictions remain. Exact duplicate primary polygons are removed from Siding 2 after validation; an empty secondary result never authorizes recoloring the primary. Garage panels and plain frames are one garage-color target; decorative trim matching house trim is assigned to `trim` with exclusions on the garage guide. No model change is included.

The current client sends `/api/analyze` only for exterior photos and omits kitchen region data on render requests. Older clients remain compatible with kitchen analysis; initial cabinet rendering uses the original photo and selected finish instructions; subsequent finish-only edits can use a fixed cabinet appearance reference. Surface correction is hidden for kitchens, while preview correction remains available.


## Private consultation synchronization (1.5.0)

Service release `2026-11-01.11` enables `consultationsEnabled:true` on the authenticated session response when its private `CONSULTATION_MEDIA` R2 binding is configured. Older frontends continue working. The public portfolio contains no private images, credentials or customer metadata.

- `GET /api/consultations/active?since=<revision>` returns the current consultation, originals/Look metadata and expiry. An unchanged revision returns a small unchanged response; an expired/closed session returns `active:null`.
- `GET /api/consultations` returns the named archive index to the representative only.
- `POST /api/consultations` accepts `action:create|activate|rename|close|delete|photo|look`. Session/archive management requires the operator header. Photo/Look writes are permitted on the active consultation with tablet authorization, or archived consultations with representative authorization so queued offline work can complete after expiry.
- `GET /api/consultations/media/<consultationId>/<itemId>/original|render|raw` streams authenticated private images with no-store headers. Media is not accessible through a public bucket URL. Ordinary tablet access is restricted to the current active consultation; archive access requires operator authorization.

Create uses a stable client UUID and bounded absolute expiry, allowing idempotent retries. Retrying create never extends an expired session or replaces another active customer. Reopening through activate starts a new hour. A late offline draft can be created as an archive without replacing the active consultation. Metadata mutations run serially in the existing named Durable Object and commit its consultation record/index together in a transaction. R2 writes precede metadata publication; failed publication cleans up unreferenced media. Repeated immutable photo/Look IDs are acknowledged without rewriting files or incrementing counts.

The Worker retains the prepared original photo once, then both labelled and raw generated images for each Look. Raw images keep text captions out of future image edits; labelled images are used for viewing/export. Metadata stores the design, color IDs, correction notes and detected regions. The image service API key never reaches the browser. Request/response body logging remains disabled.

The client polls approximately every five seconds while visible and checks on reconnection/waking. It uploads queued originals/Looks first, then fetches remote changes, avoiding the old upload/poll race. Local IndexedDB stores media as ArrayBuffers for WebKit compatibility and keeps a persistent outbox; successful acknowledgments remove the outbox entry. Failed writes keep the entry and show an error. Reopening a consultation requires the current queue to be flushed. Each tablet retains its own unrendered color choices and photo selection.

Bounds: 17 MiB request bodies, 6 MiB per original/render/raw image, 1,000 consultations, 120 Looks per consultation, four photos per type, a 1.7 MB consultation metadata ceiling and 2 GiB app media budget. Deleting a shared consultation removes its R2 objects and subtracts its stored byte count. The media budget is independent of the image render usage allowance and Cloudflare account-wide allowances. New AI calls are never automatically repeated by media synchronization.

The one-hour timeout clears the visible session, not the archive. Durable Object metadata and R2 media have no automatic lifecycle deletion rule. Local offline pending work can finish uploading to the archived consultation using representative access. Revoking tablet/operator tokens or changing the tablet password stops future authenticated reads/writes; ordinary deploys preserve access and saved data.

The bucket was created privately with `wrangler r2 bucket create spray-net-portfolio-consultations`; `server/wrangler.toml` declares its binding. Shared sync is optional in `createApi` so the Node adapter and existing image-only tests continue to work without R2. `server/consultations.test.mjs` and `tests/consultation-sync.spec.js` test the actual shared service implementation with an isolated in-memory bucket, without billable AI requests. No email is sent by these endpoints.


### Rolling Limits and Brick Staining (1.5.1)

Service release `2026-11-02.12` removes daily render and analysis caps. Rendering uses `VISUALIZER_MAX_TEN_MINUTE_RENDERS=5` and `VISUALIZER_MAX_HOURLY_RENDERS=30`, with five seconds between attempts. Surface analysis keeps its independent 30-per-hour, one-second limit. The existing Durable Object usage records remain intact and compatible. Old day/count fields are retained as counters, not lockouts. Ten-minute and hourly limit responses include a retry delay; no automatic retries are added.

The brick render instructions explicitly apply the selected stain color to both brick faces and mortar, including brick assigned to either Siding group. Recessed joint geometry and surface texture remain; contrasting or original-color mortar is not requested. Other wall groups stay protected. Models and render quality settings are unchanged.


### Shutters and Detected-Only Menus (1.6.0)

Service release `2026-11-02.13` adds `shutters` to exterior region keys and exterior design surfaces. Shutters remain separate from window glass/frames, trim and wall cladding. Normalized detection/holes/confidence validation is unchanged.

An exterior design may include `shutterAction: "keep"` (default) or `"remove"`. For recoloring, supply `surfaces.shutters` with a verified color ID and keep the action at `keep`. For removal, use `shutterAction: "remove"` and omit `surfaces.shutters`; removal alone satisfies the required-change check. Removing and recoloring shutters together is rejected, as is removal in kitchen mode. Removal regions are treated as editable guides and excluded from protected-area references. The image prompt continues the adjacent wall finish into the removed areas and protects window geometry and unrelated surfaces.

The client displays only ready regions with nonempty polygons and confidence other than low. It waits for detection before displaying customer controls, and filters each render request to the active photo's visible surface IDs. A per-photo representative override is available in hidden tools for missed features. Corrections retain their saved design. No shutter choices are added to kitchen payloads.

When provider token usage is available, `/api/render` returns optional numeric `usage: {inputTextTokens,inputImageTokens,outputImageTokens}`. Counts must be nonnegative safe integers within the configured parser bound; incomplete/invalid usage is omitted without failing a successful image. Extra provider fields are never forwarded. This supports operator cost verification without exposing credentials or adding billing controls to customer screens. For pricing and the measured sample, see README.


### Cabinet Appearance References (1.6.1)

Service release `2026-11-02.14` accepts optional `appearanceReference: {image, design}` on preset kitchen requests. The reference design is validated against the same catalog/options and must match all cabinet surface/color IDs and layout exactly. Exterior, custom-prompt and explicit-correction requests cannot use this field. Images must pass the existing data-URL/type/6 MiB checks before an attempt is reserved; request size remains bounded to two images. No remote reference URLs are accepted.

The Worker computes the changed hardwareStyle/hardwareFinish/backsplash/countertop keys. The established unlabelled preview is model image 1 and is authoritative for cabinet appearance and scene lighting. It sends the original homeowner photo as image 2 only when restoring a changed finish to Keep Existing. The prompt identifies cabinet colors as already applied, uses a finish-change allowlist, forbids bounced-light/color-temperature reinterpretation, and applies earlier correction notes only within the allowed finish changes. First previews, new color families and explicit representative corrections retain their original-photo paths.

Look metadata supports optional `cabinetReferenceId`. Shared storage validates the ID, same photo, kitchen mode and matching cabinet colors; a root can reference itself. Normal variants point to that root, and explicit correction results establish their own root. Client selection excludes manual custom results, labelled-only records and references larger than 6 MiB. The metadata link survives local saves, cross-device sync and archive reopening. A matching older record without a link can become a root. Each render is still one billable image edit, using the configured model/quality; image-token use depends on the supplied references.
