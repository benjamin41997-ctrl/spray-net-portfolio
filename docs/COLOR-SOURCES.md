# Visualizer Color Catalog

Verified on October 30, 2026. Customer-facing color data lives in `src/data/colors.js`.

## Included Colors

The visualizer includes **824 colors** with a verified catalog name, a displayed digital swatch, and at least one active Spray-Net coating record:

| Collection | Colors |
| --- | ---: |
| Spray-Net core deck | 50 |
| Sherwin-Williams named catalog matches | 376 |
| Benjamin Moore named catalog matches | 398 |
| Total, without duplicate container sizes | 824 |

**505** colors have an active kitchen coating entry; **587** have at least one active exterior coating entry. Those counts overlap. Exterior availability differs by coating system and should be filtered using the `systems` property, not inferred from the color name or from `collections: ['exterior']` alone.

These are the verified colors available from the supplied library. The matching collections are **not complete current Sherwin-Williams or Benjamin Moore manufacturer decks**. Their brand labels identify the named color reference in Spray-Net's catalog; they do not imply that those manufacturers supply the Spray-Net coating.

## Authoritative Local Sources

The source folder is:

`Franchisee Site - Documents/English/Distribution/Fishbowl & Lilypad Inventory/Product Color Catalogs/`

Files used:

- `FULL COLOR LIST OCT 2026.csv`: active item status, product name, catalog code, and applicable coating system.
- `KITCHEN OCT 2026.pdf`
- `BRICK OCT 2026.pdf`
- `D+W OCT 2026.pdf`
- `ELASTO OCT 2026.pdf`
- `MAT OCT 2026.pdf`
- `SATIN OCT 2026.pdf`
- `VINYL OCT 2026.pdf`

SHA-256 hashes for all eight inputs are recorded in the exported `colorSource.files` metadata. Each color records the PDF and original coating SKU used for its displayed swatch in `swatchSource` and `swatchSku`.

Older reference files were checked for context but do not override the October 2026 catalog: `Kitchen Color Palette_2024.pdf`, `Kitchen colour charts.pdf`, and the older sales color boards. The source PDFs contain less color coverage than the inventory CSV; entries without a usable matching swatch are excluded.

## Verification and Digital Color Limits

The import matches each PDF product code to its own adjacent image and to an active CSV record. It samples the central flat area of the digital swatch, away from the label and border. A sample must be at least 90% uniform within three RGB levels. Photographs, textured samples, absent images, and ambiguous image records are excluded.

Only the core deck and records explicitly prefixed `SW` or `BM` are included. Unbranded customer-specific matches, primers, clear bases, hardeners, metallic finishes, duplicate container sizes, and duplicate matte variants are omitted. The public module contains no formulas, prices, inventory quantities, customer contact details, or raw source documents.

Container sizes are collapsed into one color. Coating variants sharing the same brand and catalog color code are combined. `MATCH-SW7040` and `MATCH-7040`, for example, refer to the same named matching color and become one selection. Two colors have small RGB differences among source coating images: Accessible Beige and Balanced Beige. Their most common catalog RGB is used; the original inputs remain traceable by their hashes.

**RGB/hex values are digital approximations from catalog artwork, not calibrated paint measurements.** Lighting, camera processing, display settings, sheen, existing substrate, and the rendering model affect the result. Show a short reminder to confirm final colors with physical samples. A rendering is a design preview and must not be described as a guaranteed color match or as approval that a coating is suitable for a particular home.

The color `family` field is a browsing aid derived from the swatch and name. It is not a manufacturer's official color-family classification. Names remain grounded in the catalog; bilingual descriptors are reduced to English where unambiguous. `code` retains Spray-Net's catalog reference, including the `G-` or `MATCH-` prefix, rather than inventing an external manufacturer's formatted code.

## Data Contract

The module exports `colors`, `colorsById`, `colorSource`, `colorBrands`, and `colorFamilies`.

Each color contains:

```js
{
  id: 'sn-oc65',
  name: 'Chantilly Lace',
  code: 'G-OC65',
  hex: '#F5F7F2',
  brand: 'Spray-Net',
  collections: ['kitchen', 'exterior'],
  family: 'White',
  source: 'spray-net-oct-2026',
  coatingSystems: ['BRICK', 'D+W', 'ELASTO', 'KITCHEN', 'MAT', 'SATIN'],
  systems: ['brick', 'dw', 'elasto', 'kitchen', 'mat', 'satin'],
  swatchSource: 'KITCHEN OCT 2026.pdf',
  swatchSku: 'G-OC65K',
  catalogMatch: false,
  digitalApproximation: true
}
```

Use actual row data when filtering; the example illustrates the schema. `systems` is the lowercase alias of `coatingSystems`, with `D+W` normalized to `dw`.

| System | Catalog application |
| --- | --- |
| `kitchen` | Kitchen cabinet coating |
| `brick` | Brick coating |
| `vinyl` | Vinyl coating |
| `elasto` | Stucco/elastomeric coating |
| `dw` | Door and window coating |
| `mat` | Exterior matte coating |
| `satin` | Exterior satin coating |

The system labels follow the inventory. They do not themselves establish that a particular soffit, fascia, column, garage door, siding panel, or other pictured element uses that coating; the salesperson must identify the actual substrate.

## Rebuilding the Catalog

The importer requires Python, `pypdf`, and Pillow. The source documents stay in the synced library and are not copied into the repository.

Run from the repository root:

```powershell
python scripts/import-colors.py --catalog-dir '..\Franchisee Site - Documents\English\Distribution\Fishbowl & Lilypad Inventory\Product Color Catalogs'
```

The importer writes `src/data/colors.js` and prints counts. It uses a temporary directory for intermediate image associations. A cached extraction can be supplied using `--cached-swatches <records.json>` during review; the original PDFs and CSV remain required for source hashes and active-item validation.

Before replacing the deck, review a representative sample of swatch images beside the generated hex colors, check duplicate IDs and applicability, and update this document's counts/date. Do not add colors by guessing RGB from a name or by importing an unverified third-party list.

## Validation Performed

- All 824 IDs are unique; all names and collections are present; all hex values have valid six-digit RGB format.
- Every included coating-system association is backed by an active record in the CSV.
- The core kitchen and brick source pages were rendered and visually inspected.
- A deterministic sample of 24 original swatch images across the coating catalogs was compared visually with its generated hex chip; the chips matched the displayed source swatches.
- Raw formula, price, inventory, personal-match, and private contact fields are not exported.
