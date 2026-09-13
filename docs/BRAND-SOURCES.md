# Corporate brand alignment

Reviewed September 12, 2026 against the local corporate resources listed below. This document records the basis for the implementation; it is **not a claim of corporate Marketing approval** of this new app.

**Media update, September 13, 2026:** The demonstration projects, reviews, and artwork mentioned in this original branding audit have since been replaced by real, attributed network media. See [Media sources and remaining gaps](MEDIA-SOURCES.md) for the current collection. The visual standards and corporate source map below remain applicable; references to demo content describe the earlier revision.

## Visual standards applied

| Standard                              | Application                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Orange `#F16122`                      | Accent color, hero tagline, active indicators, and NOW label                                                      |
| Navy `#003965`                        | Headings, primary controls, dark card, and installation icon backgrounds                                          |
| Charcoal `#6D6E70`                    | Secondary text on white/light backgrounds                                                                         |
| Lato Regular / Medium / Heavy / Black | Local 400 / 500 / 800 / 900 fonts; the current Google Fonts package names its 800 weight ExtraBold                |
| Approved horizontal logo              | `public/branding/logo.png` is an unchanged copy of `Horizontal Logo for Skin.png`, including the existing tagline |
| Approved emblem                       | Installation icons use the supplied emblem, proportionally scaled without redrawing or recoloring the artwork     |
| BEFORE / NOW                          | Navy BEFORE tag and orange NOW tag; NOW remains the after-image state in the data model                           |

Orange and white have insufficient contrast for small text. The orange NOW tag therefore uses large, heavy white lettering; small action text uses navy/white instead. Neutral backgrounds are supporting UI surfaces, not additional brand colors. The green cabinet illustrations depict sample project colors and are not UI branding.

## Primary source map

All paths below are relative to the shared OneDrive workspace, not the app folder. Internal PDFs and their full extracted text are not included in the deployed website.

1. **The Spray-Net Brand Board.pdf**, page 1. Location: `Spray-Net South Charlotte/Marketing/Photos/Logos/`. Defines the orange/navy/charcoal palette, Lato weights, permitted logo/background combinations, “Custom Chemistry. Smarter Painting.”, and BEFORE / NOW tags. A duplicate also exists under `Basecamp Downloads/Spray-Net assets/`.
2. **Horizontal Logo for Skin.png** and **Spray Emblem for Sticker.png**, in the same Logos folder. Supplied raster artwork used for the header and installation icons. `Horizontal_NO TAGLINE copy.png` is retained as an alternative supplied asset, not a recreated wordmark.
3. **01-Exterior_Generic.pdf**, pages 1–2. Location: `Franchisee Site - Documents/English/Marketing/Traditional Marketing Tactics/Direct mail targeted/`. Source for “The smartest way to paint your home, and it isn’t a fancier brush.”, “The Spray-Net Difference”, factory-quality finish/durability, surface-specific coatings, and the alternative to replacement.
4. **01-Kitchen_Generic.pdf**, pages 1–2, in the same Direct mail targeted folder. Source for “A new kitchen in a fraction of the time, cost and mess.” and “Make your house, your home.”
5. **Section A - OM SN - Brand & Training v7_Formatted_2026.pdf**, PDF pages 6–9 and 16–17. Location: `Franchisee Site - Documents/English/Operations Manual/`. Supports the public-facing explanation of proprietary surface-specific chemistry, weather-adjustable exterior coatings, specialized spray application, factory-quality results, and professional customer experience. Internal operating policies and financial information have not been copied into the app.
6. **3. Who We Are as a Brand.pdf**, pages 2–6 and 23–24. Location: `Franchisee Site - Documents/English/Marketing/Marketing Basics/`. Supports premium renovation positioning, quality/value/customer experience, proactive communication and no surprises, and consistent brand use. Page 24 states that marketing materials require Marketing Team approval.
7. **Section F- OM SN -Marketing V6.pdf**, pages 13 and 20–21. Location: `Franchisee Site - Documents/English/Operations Manual/`. Supports the customer-experience language and records the requirement for approval of advertising materials before deployment.

The French sales brochures in `Selling/2- Interior Sales Tools/` were also reviewed for consistency. Their dated prices, savings percentages, and promotions were not imported into this US consultation app.

## Copy decisions

- Corporate taglines are centralized in `src/data/brand.js`. Primary promotional wording comes from the brand board and corporate mailers; explanatory page copy is a concise adaptation of the documented service positioning.
- The generic “Your home. A whole new feeling.” / “Keep what you love. Reimagine the rest.” branding has been removed, including from the manifest and demo film.
- The home page uses the exact brand-board tagline and the campaign headline. Why Spray-Net is presented as “The Spray-Net Difference.”
- The original 6 / 7 / 1 portfolio counters have been replaced by documented service highlights: factory-quality finish, custom chemistry, and on-site convenience. No company performance statistics have been invented.
- Warranty messaging references the no-peel warranty and directs the homeowner to their applicable written terms. Broad marketing references to 15 years were not turned into an unconditional promise across every sample category.
- Project records, customer names, reviews, and illustrated projects remain clearly identified as demonstration content. Branding alignment does not make those records real customer work.
- No discounts, prices, financing offers, partner endorsements, or project-duration guarantees were added.

## Fonts and assets

Lato was obtained from the [Google Fonts Lato directory](https://github.com/google/fonts/tree/main/ofl/lato). The original SIL Open Font License is included at `public/branding/fonts/OFL.txt`. Fonts are served and cached locally; the deployed app makes no Google Fonts requests.

The logo is displayed without distortion, and South Charlotte appears as a separate location identifier. Install icons preserve the supplied emblem with clear space inside the maskable safe area. `scripts/generate-demo.mjs` no longer creates or overwrites any corporate logo or icons.

The copied header logo was verified byte-for-byte against the supplied original (SHA-256 `2c2236b6ded3eeb4a24d5b119054c012a7a43b01cac9230ebd27f48806fa028f`). Supporting neutral backgrounds use navy text wherever the corporate charcoal would fall short of WCAG AA contrast.

## Before customer release

The branded production build and regression suite passed: 15 tests passed, with 3 documented platform/duplicate skips. Checks included offline corporate logo/font loading, BEFORE / NOW labels, portrait and landscape overflow, and automated WCAG A/AA contrast and semantics. The portrait and landscape previews were visually inspected.

The changes are ready for the user's review. The corporate sources require Marketing sign-off for new marketing material; this implementation has not been submitted and no one has been contacted. Replace demonstration customer content and obtain the required corporate review before releasing the app as approved sales collateral.
