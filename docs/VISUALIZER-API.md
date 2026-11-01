# Visualizer API

The public portfolio stays on GitHub Pages. A separate, authenticated API sends a homeowner photo and a fixed design instruction to OpenAI. **Never put the OpenAI key in React, a `VITE_` variable, GitHub Pages, or the tablet connection code.**

The tablet uses a random, revocable device token. It authorizes rendering through this service but does not reveal the OpenAI key. Treat the token as a secret: anyone who has it can use the limited rendering allowance. There is no customer account or sign-in flow.

## What is implemented

- Kitchen cabinet colors, separate upper/lower cabinets, a separate island, hardware style/finish, and optional backsplash/countertop concepts.
- Exterior siding, brick, stucco, entry doors, garage doors, window frames, soffits, fascia, vents, columns, and trim.
- Up to eight uploaded photos per consultation, one selected original per request, without previous conversation history. Uploading and switching angles incur no API usage. Each change starts from that angle's original.
- Server-built instructions preserve layout, camera view, lighting, appliances and unselected surfaces. Ordinary rendering accepts verified color IDs and a small set of options. Custom instructions require a separate operator credential; clients cannot change model, source URL or output size.
- Fast preview: `gpt-image-2.5-flare`, medium quality. Detailed rendering: `gpt-image-2.5-sunburst`, high quality. Both return one WebP.
- No automatic retries. A timed-out or cancelled request may still incur provider usage, so every dispatched attempt consumes one quota slot.
- Photos and renderings are never written to the API filesystem or Durable Object storage. The server stores usage timestamps/counts only. The photograph is sent to OpenAI to create the rendering. The portfolio manages local saved designs on the tablet separately.

These are visual design concepts, not measured color matches or construction specifications. Confirm the actual color with a physical sample. A backsplash, countertop or hardware concept does not establish that Spray-Net will perform that work.

## Cloudflare deployment

`server/wrangler.toml` defines a **separate** Worker named `spray-net-visualizer-api`. It does not modify the review portal Worker. The `VisualizerGate` Durable Object serializes renders and persists the service-wide daily/hourly quota atomically. There is no D1 database, media bucket, image upload archive, or additional application dependency.

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

### Optional operator setup

Custom instructions stay disabled until a separate `VISUALIZER_OPERATOR_TOKEN` is configured. Generate a new random 32-byte base64url secret, distinct from the tablet token, and store it through a secure prompt/pipe:

```powershell
wrangler secret put VISUALIZER_OPERATOR_TOKEN --config server/wrangler.toml
```

Keep the ordinary tablet setup file and QR unchanged. Create a separate private `operator-connection.json` in the ignored `.visualizer-local/` folder with the same `endpoint` and `token`, plus `operatorToken`. Import it through **Consultation Tools → Connect From Setup File**, or enter the operator code manually. Never commit it, publish it, put it in a QR/URL, or send it to a homeowner. The optional code stays in session storage and Disconnect removes it.

Open the hidden menu by holding **Kitchen & Cabinets** or **Home Exterior** for five seconds, or tapping either button eight times within six seconds. The gesture hides salesperson controls; the API credential separately authorizes custom rendering. Closing tools clears the typed custom prompt. Custom and ordinary renders share the same model settings, one-image output, daily/hourly quota, concurrency limit, and original-photo flow. There is no separate prompt-generation model call.

Set `VISUALIZER_ALLOWED_ORIGINS` to exact HTTPS **origins**, not full page URLs. For GitHub Pages this is `https://benjamin41997-ctrl.github.io`, without `/spray-net-portfolio/`. There is no wildcard CORS setting. An origin restriction is supplementary; the device token is the authorization boundary.

The configuration starts with 20 attempts per UTC day, 12 per rolling hour, a five-second minimum interval, and one active rendering. Adjust these values in `server/wrangler.toml` before deployment as needed. A quota reservation is persisted before the paid request. The cap remains in place across Worker restarts, deployments and token rotation. Use the same Durable Object binding and name when redeploying; creating a different Worker/object creates a separate allowance.

Cloudflare may defer active Durable Object code updates for up to five minutes after deployment. Check the `X-Visualizer-Release` response header on `/api/session` before a live smoke test, or use a current Wrangler release with `--durable-objects-code-update-mode immediate` when no render is running. The request adapter uses `redirect: 'manual'`; Workers rejects the Fetch standard's `redirect: 'error'` before sending a request. Non-2xx responses are handled without following redirects. See [Cloudflare code update behavior](https://developers.cloudflare.com/changelog/post/2026-10-30-durable-objects-deferred-code-updates/) and [Request options](https://developers.cloudflare.com/workers/runtime-apis/request/).

Rendering incurs OpenAI API usage. A ChatGPT subscription does not supply this server's API credentials or establish its API budget. Verify the account's permitted image models and billing limits before enabling customer use. Cloudflare hosting follows the existing account's plan and Durable Object allowance; this repository does not provision a new paid plan.

## Local Node 24 server

Copy `.env.example` to the ignored `.env` file and fill in the server key and generated token. The explicit daily cap, token, key and allowed origins are all required; otherwise rendering stays disabled.

```powershell
node --env-file=.env server/index.mjs
```

By default it listens at `http://127.0.0.1:8787`. Plain HTTP is only intended for loopback development. A tablet opening the deployed HTTPS portfolio needs an HTTPS API address, such as the Worker. Do not point a tablet at the PC's `localhost`.

For a self-hosted Node deployment, put it behind an HTTPS reverse proxy, keep one server process, and place `VISUALIZER_USAGE_FILE` on a persistent volume. The proxy must permit a request body slightly above 8 MB and allow at least 250 seconds for a render. Disable request/response body logging and never log authorization headers. The server itself logs only startup status.

`server/.local/usage.json` is an atomic ledger that survives restarts. Startup acquires an exclusive `.lock` file. If the process is killed abruptly, inspect and remove the stale lock only after confirming no other instance is using the ledger. An unreadable/corrupt ledger blocks rendering; never silently delete it to restart the daily allowance. Multiple replicas require the Cloudflare Durable Object deployment or a shared transactional quota service.

### Configuration

| Variable | Default / behavior |
| --- | --- |
| `OPENAI_API_KEY` | Required server secret |
| `VISUALIZER_ACCESS_TOKEN` | Required random device secret, 43–128 characters |
| `VISUALIZER_OPERATOR_TOKEN` | Optional separate random operator secret, 43–128 characters; custom prompts disabled without it |
| `VISUALIZER_ALLOWED_ORIGINS` | Required comma-separated exact HTTPS origins; localhost HTTP allowed for development |
| `VISUALIZER_MAX_DAILY_RENDERS` | Required, 1–200; resets at midnight UTC |
| `VISUALIZER_MAX_HOURLY_RENDERS` | 12, permitted range 1–60 |
| `VISUALIZER_MIN_INTERVAL_SECONDS` | 5, permitted range 1–60 |
| `VISUALIZER_TIMEOUT_SECONDS` | 240, permitted range 30–300 |
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
- Exterior: `siding`, `brick`, `stucco`, `frontDoor`, `garageDoor`, `windows`, `soffits`, `fascia`, `vents`, `columns`, `trim`.

Kitchen options default to `keep` when omitted:

- `hardwareStyle`: `keep`, `bar`, `knob`, `cup`, `none`.
- `hardwareFinish`: `keep`, `matte-black`, `brushed-nickel`, `brass`, `chrome`, `bronze`.
- `backsplash`: `keep`, `white-subway`, `marble`, `warm-neutral`.
- `countertop`: `keep`, `white-quartz`, `marble`, `dark-stone`, `butcher-block`.

Exterior requests cannot change kitchen options. At least one visible preset change or authorized custom instruction is required. Color IDs are validated against `src/data/colors.js`. Official Sherwin-Williams rows with `referenceOnly: true` and source `sherwin-williams-official` are accepted for visual design without asserting coating availability; other IDs must match collection and coating system. An optional `design.sidingMaterial` is `vinyl` or `other` (aluminum/fiber cement/engineered wood). Brick uses BRICK, stucco ELASTO, doors/window frames D+W, other siding MAT/SATIN, and trim/soffits/fascia/vents/columns MAT/SATIN/D+W. The representative confirms the actual substrate, color match and coating specification.

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
