# Visualizer Color Catalog

Spray-Net catalog verified October 30, 2026; official Sherwin-Williams reference expansion verified November 1, 2026. Customer-facing colors are merged in `src/data/colors.js` from the catalog and `src/data/sherwinWilliams.js`.

## Included Colors

The visualizer includes **2,179 unique colors**:

| Collection | Colors |
| --- | ---: |
| Spray-Net core deck | 50 |
| Sherwin-Williams references | 1,731 |
| Benjamin Moore named catalog matches | 398 |
| Total, without duplicate color IDs | 2,179 |

The original **824** catalog entries include 376 Sherwin-Williams named matches. Of these 824, **505** have an active kitchen coating entry and **587** have an active exterior entry. Counts overlap. The expansion adds **1,355** unique Sherwin-Williams colors: 1,726 official manufacturer references overlap 371 catalog IDs, and five older catalog matches are retained. Original coating associations remain in `systems`; reference-only additions have no invented coating associations.

The collections are **not claimed to be complete current manufacturer decks**. Brand labels identify color references; they do not imply those manufacturers supply Spray-Net's coating. Manufacturer references can be used for visual design on either project type; that does not confirm a coating match or substrate suitability.

## Official Sherwin-Williams References

The [manufacturer's downloadable palettes page](https://www.sherwin-williams.com/painting-contractors/2020-color-forecast/color-tools/downloadable-color-palettes) links two Excel ZIP downloads used here:

| Official download | Workbook | Colors |
| --- | --- | ---: |
| [ColorSnap](https://images.sherwin-williams.com/content_images/SW-XCL-SHERWIN-WILLIAMS-COLORC.zip) | `SW-ColorSnap-Color-Swatches-for-SW-Site-locator-031319.xlsx` | 1,526 |
| [Designer Color Collection](https://images.sherwin-williams.com/content_images/sw-xcl-sherwin-williams-ede.zip) | `Emerald Designer Edition Digital Data.xlsx` | 200 |

The ColorSnap filename is dated 2019; it remains the official linked download on the verification date. Every imported row has a valid unique SW code, manufacturer name, RGB triplet, and matching published hexadecimal value. The importer computes HEX from RGB and rejects disagreement. Archive/workbook SHA-256 values, original URLs, date, and counts are stored in `sherwinWilliamsSource`. No third-party color list or guessed name-to-RGB mapping is used.

When an official code overlaps the local catalog, its published name/code/HEX wins; the local swatch and source remain in `catalogHex` and `catalogSource`. Official rows carry `referenceOnly: true` and `source: 'sherwin-williams-official'`. The app shows a final-match reminder for selected references. Server validation permits these trusted references for visualization; it continues checking coating systems for the remaining catalog colors.

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

The color `family` field is a browsing aid derived from the swatch and name, not an official manufacturer classification. Local catalog names retain their source wording; official Sherwin-Williams references use manufacturer names and formatted `SW 7008` codes. Other catalog codes retain their `G-` or `MATCH-` prefixes.

## Data Contract

The merged module exports `colors`, `colorsById`, `colorSource`, `colorBrands`, and `colorFamilies`. Manufacturer metadata and raw reference rows are exported as `sherwinWilliamsSource` and `sherwinWilliamsColors` from `src/data/sherwinWilliams.js`.

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

The importer writes `src/data/colors.js`, preserving the manufacturer-reference merge, and prints base catalog counts. It uses a temporary directory for intermediate image associations. A cached extraction can be supplied using `--cached-swatches <records.json>` during review; the original PDFs and CSV remain required for source hashes and active-item validation.

To refresh the official manufacturer references, download the two official ZIP links above into an ignored local directory as `colorsnap.zip` and `designer.zip`, then run:

```powershell
python scripts/import-sherwin.py --source-dir .visualizer-local/colors
```

This read-only XLSX parser uses Python's standard library and writes only the public color reference module. It verifies all RGB/HEX pairs, unique codes, and source checksums before writing. When adopting newer official downloads, update the verification date and review any changed workbook layout in the importer.

Before replacing the deck, review a representative sample of swatch images beside the generated hex colors, check duplicate IDs and applicability, and update this document's counts/date. Do not add colors by guessing RGB from a name or by importing an unverified third-party list.

## Validation Performed

- All 2,179 merged IDs are unique; all names and collections are present; all hex values have valid six-digit RGB format.
- All 1,726 official manufacturer RGB values agree with their published HEX values. No manufacturer reference invents coating availability.
- Every retained catalog coating-system association is backed by an active record in the CSV.
- The core kitchen and brick source pages were rendered and visually inspected.
- A deterministic sample of 24 original swatch images across the coating catalogs was compared visually with its generated hex chip; the chips matched the displayed source swatches.
- Raw formula, price, inventory, personal-match, and private contact fields are not exported.
