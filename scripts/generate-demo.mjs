// Original, programmatically drawn demo illustrations. No third-party photos or fonts.
// Run only to restore demo artwork: node scripts/generate-demo.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
const root = new URL('../public/', import.meta.url);
for (const directory of ['media/projects', 'media/reviews', 'media/videos', 'branding'])
  mkdirSync(new URL(`${directory}/`, root), { recursive: true });
const save = (path, text) => writeFileSync(new URL(path, root), text);
const defs = `<defs>
<linearGradient id="wall" x2=".2" y2="1"><stop stop-color="#f4f0e4"/><stop offset="1" stop-color="#ddd8c9"/></linearGradient>
<linearGradient id="floor" x2=".5" y2="1"><stop stop-color="#b8a17d"/><stop offset="1" stop-color="#e0c8a1"/></linearGradient>
<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#acbfb5"/><stop offset=".5" stop-color="#d0ded1"/><stop offset="1" stop-color="#f5f3d8"/></linearGradient>
<linearGradient id="sky" x2="0" y2="1"><stop stop-color="#d7e2db"/><stop offset="1" stop-color="#f2f0dd"/></linearGradient>
<linearGradient id="shade" x2="1" y2=".3"><stop stop-color="#132418" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#202e1a" stop-opacity=".12"/></linearGradient>
<pattern id="brick" width="70" height="28" patternUnits="userSpaceOnUse"><path d="M0 0h70M0 14h70M35 0v14M0 14v14M70 14v14" stroke="#75654e" stroke-opacity=".2" fill="none"/></pattern>
<pattern id="siding" width="80" height="24" patternUnits="userSpaceOnUse"><path d="M0 23h80" stroke="#24362e" stroke-opacity=".18"/></pattern>
<pattern id="wood" width="145" height="400" patternUnits="userSpaceOnUse"><path d="M1 0v400m60-400v220m60 20v160M0 180h145" stroke="#574125" stroke-opacity=".12" fill="none"/></pattern>
<pattern id="tile" width="85" height="38" patternUnits="userSpaceOnUse"><rect width="85" height="38" fill="#eceade"/><rect x="1" y="1" width="83" height="36" rx="2" fill="#fff" fill-opacity=".18" stroke="#c7c7b8" stroke-width=".6"/></pattern>
<filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="13" flood-color="#202b18" flood-opacity=".18"/></filter>
<filter id="texture"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
</defs>`;
const wrap = (body, viewBox = '0 0 1200 800') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1200" height="800">${defs}${body}<rect width="1200" height="800" fill="url(#shade)" pointer-events="none"/></svg>`;
function plant(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0q-12-85-28-136M0 0q20-105 36-172M0 0q-1-128-6-191" stroke="#5d6743" stroke-width="4" fill="none"/><g fill="#7e9067"><ellipse cx="-28" cy="-128" rx="14" ry="32" transform="rotate(-35 -28 -128)"/><ellipse cx="-15" cy="-74" rx="14" ry="34" transform="rotate(-43 -15 -74)"/><ellipse cx="33" cy="-151" rx="15" ry="33" transform="rotate(38 33 -151)"/><ellipse cx="-6" cy="-185" rx="14" ry="35"/><ellipse cx="19" cy="-102" rx="17" ry="31" transform="rotate(55 19 -102)"/></g><path d="m-31-12 10 73h43l10-73Z" fill="#d8c5a4"/><ellipse cy="-12" rx="32" ry="7" fill="#b29d7d"/></g>`;
}
function cabinet(x, y, width, height, color, upper = false) {
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" stroke="#253529" stroke-opacity=".22" stroke-width="2"/><rect x="${x + 12}" y="${y + 12}" width="${width - 24}" height="${height - 24}" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="4"/><rect x="${x + 17}" y="${y + 17}" width="${width - 34}" height="${height - 34}" fill="#000" fill-opacity=".035"/><rect x="${x + width - 23}" y="${y + (upper ? height - 63 : 27)}" width="5" height="36" rx="2" fill="#b39857"/></g>`;
}
function kitchen(color, before = false, vanity = false) {
  const c = before ? '#967552' : color;
  let scene = `<rect width="1200" height="800" fill="url(#wall)"/><path d="M0 0h1200v55H0Z" fill="#f5f2e6"/><path d="M0 550h1200v250H0Z" fill="url(#floor)"/><path d="M0 550h1200v250H0Z" fill="url(#wood)"/><path d="M0 0h115v562L0 652Z" fill="#e2dece"/><path d="M1030 0h170v800l-170-236Z" fill="#e9e5d8"/><rect x="112" y="240" width="920" height="220" fill="url(#tile)"/>`;
  if (vanity) {
    scene += `<rect x="142" y="68" width="570" height="340" rx="160" fill="#b7a16b"/><rect x="153" y="78" width="548" height="320" rx="150" fill="url(#glass)"/><path d="m160 280 365-180h180L290 398H160Z" fill="#fff" opacity=".13"/>`;
  } else {
    scene += `<rect x="454" y="107" width="330" height="273" fill="#c2c5b4"/><rect x="465" y="117" width="308" height="250" fill="url(#glass)"/><path d="M474 269q63-78 102-38t194-66v198H474Z" fill="#a3b38b"/><path d="M485 301q51-79 108-34t167-39v133H485Z" fill="#b8c29e"/><path d="M619 118v249M466 242h307" stroke="#f5f3e6" stroke-width="9"/>${cabinet(131, 103, 150, 268, c, true)}${cabinet(282, 103, 150, 268, c, true)}${cabinet(806, 103, 103, 268, c, true)}${cabinet(910, 103, 102, 268, c, true)}`;
  }
  scene += `<rect x="123" y="432" width="900" height="150" fill="#3d4435"/>`;
  for (let x = 128; x < 1010; x += 147) scene += cabinet(x, 443, 145, 132, c);
  scene += `<path d="M121 417h903l18 23H108Z" fill="#f9f6ed" filter="url(#shadow)"/><path d="M108 440h934v9H108Z" fill="#d7d5c8"/><ellipse cx="612" cy="426" rx="74" ry="9" fill="#a9b3aa"/><path d="M613 423v-57q0-21 21-21t21 21v15" fill="none" stroke="#a89156" stroke-width="8"/><path d="M670 405v22" stroke="#a89156" stroke-width="5"/>${plant(919, 397, 0.39)}<rect x="257" y="363" width="51" height="55" rx="3" fill="#b69267"/><rect x="271" y="354" width="43" height="66" rx="8" fill="#c8aa7b"/>`;
  if (!vanity) {
    scene += `<g filter="url(#shadow)"><path d="M246 567h565l168 70H100Z" fill="#f4f0e5"/><path d="M100 637h879v17H100Z" fill="#d5d2c3"/><path d="M148 654h780v146H148Z" fill="${before ? '#896443' : '#b99c70'}"/><path d="M148 654h780v146H148Z" fill="url(#wood)"/><path d="M788 654h140v146H788Z" fill="#000" opacity=".11"/></g><g stroke="#766044" stroke-width="5" fill="#d3bd94"><path d="m340 722-9 78m105-78 11 78M607 722l-9 78m106-78 11 78"/><ellipse cx="384" cy="715" rx="62" ry="17"/><ellipse cx="652" cy="715" rx="62" ry="17"/></g><ellipse cx="615" cy="605" rx="46" ry="15" fill="#c5b697"/><path d="M568 605q6 31 47 31t47-31" fill="#c9bba0"/><g fill="#a0a35d"><circle cx="593" cy="603" r="11"/><circle cx="615" cy="598" r="13"/><circle cx="637" cy="604" r="10"/></g><g stroke="#544e3c" stroke-width="3"><path d="M387 0v181M830 0v181"/></g><g fill="#b6a47a"><path d="M336 207q0-57 51-57t51 57Z"/><path d="M779 207q0-57 51-57t51 57Z"/></g><g fill="#fbf1d1"><ellipse cx="387" cy="207" rx="51" ry="8"/><ellipse cx="830" cy="207" rx="51" ry="8"/></g>`;
  } else {
    scene += `<path d="M273 565h379v116H273Z" fill="${c}"/><path d="M293 586h339v72H293Z" fill="#fff" opacity=".04"/><rect x="769" y="97" width="8" height="245" fill="#b39a5e"/><rect x="751" y="150" width="44" height="112" rx="22" fill="#fffae5"/>${plant(923, 609, 0.95)}<path d="M337 664h181v69H337Z" fill="#f0ebdc"/><path d="M337 682h181m-181 21h181" stroke="#d4cebc" stroke-width="3"/>`;
  }
  scene += `<path d="m710 367 490-78v227L785 685 608 604Z" fill="#fff9d9" opacity=".12"/>`;
  return scene;
}
function windowShape(x, y, w = 110, h = 160, trim = '#39443b') {
  return `<g><rect x="${x - 9}" y="${y - 9}" width="${w + 18}" height="${h + 18}" fill="#e9e7d9"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${trim}"/><rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" fill="url(#glass)"/><path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="${trim}" stroke-width="6"/><path d="m${x + 7} ${y + h - 15} ${w - 15}-${h - 30}" stroke="#fff" stroke-opacity=".15" stroke-width="24"/></g>`;
}
function house(color, before = false, type = 'brick') {
  const c = before ? (type === 'brick' ? '#a97b60' : '#bcae8d') : color;
  const trim = type === 'doors' && !before ? '#28332d' : '#455047';
  let scene = `<rect width="1200" height="800" fill="url(#sky)"/><g opacity=".65" fill="#a6b698"><circle cx="94" cy="202" r="136"/><circle cx="1073" cy="238" r="160"/><circle cx="1176" cy="136" r="153"/></g><path d="M0 599q382-33 1200-19v220H0Z" fill="#9bab79"/><path d="M0 723q443-89 1200-35v112H0Z" fill="#aab98c"/><path d="M150 252h911v333H150Z" fill="${c}"/><path d="M150 252h911v333H150Z" fill="url(#${type === 'brick' || type === 'doors' ? 'brick' : 'siding'})"/><path d="M103 264 238 116h685l190 148Z" fill="#566056"/><path d="M130 264h962v15H130Z" fill="#e6e5d5"/><path d="M465 264V174l179-139 182 139v409H465Z" fill="${c}"/><path d="M465 264V174l179-139 182 139v409H465Z" fill="url(#${type === 'brick' ? 'brick' : 'siding'})"/><path d="m442 188 203-160 205 160-14 17L645 56 455 205Z" fill="#525c52"/><path d="m465 184 180-140 180 140" stroke="#e8e7d9" stroke-width="12" fill="none"/>${windowShape(595, 134, 101, 123, trim)}${windowShape(203, 322, 113, 160, trim)}${windowShape(348, 322, 80, 160, trim)}${windowShape(865, 322, 123, 160, trim)}<path d="M526 376h243v206H526Z" fill="#36443a"/><rect x="581" y="377" width="137" height="206" fill="${type === 'doors' && !before ? '#26312b' : '#997957'}"/><rect x="594" y="391" width="49" height="78" fill="#bfccc0"/><rect x="654" y="391" width="49" height="78" fill="#bfccc0"/><rect x="595" y="483" width="108" height="83" fill="none" stroke="#4c422c" stroke-opacity=".4" stroke-width="3"/><rect x="695" y="479" width="5" height="26" rx="2" fill="#d1bd80"/><path d="m494 374 152-76 151 76Z" fill="#535f53"/><path d="M502 374h288v10H502Z" fill="#ebe9dc"/><rect x="507" y="382" width="19" height="212" fill="#eeeadd"/><rect x="766" y="382" width="19" height="212" fill="#eeeadd"/><path d="M493 586h306v17H493Z" fill="#c3c1ac"/><path d="M484 603h324v14H484Z" fill="#d2ccb8"/><path d="M581 616h145l243 184H439Z" fill="#d9d0b7"/><path d="M648 616 714 800" stroke="#b4b09b" stroke-width="2"/><path d="M538 695h295M490 762h419" stroke="#b4b09b" stroke-width="2"/>`;
  for (let i = 0; i < 7; i++)
    scene += `<ellipse cx="${177 + i * 50}" cy="584" rx="37" ry="34" fill="${i % 2 ? '#6c8056' : '#7d9162'}"/>`;
  for (let i = 0; i < 5; i++)
    scene += `<ellipse cx="${846 + i * 45}" cy="580" rx="34" ry="33" fill="${i % 2 ? '#6e8058' : '#8e9a6b'}"/>`;
  scene += `${plant(544, 566, 0.37)}${plant(744, 566, 0.37)}<path d="M84 191q-9 217-6 450" stroke="#82785b" stroke-width="24"/><g fill="#7f956f"><ellipse cx="65" cy="192" rx="136" ry="136"/><ellipse cx="1" cy="318" rx="103" ry="125"/></g><g fill="#a7b592" opacity=".6"><ellipse cx="120" cy="159" rx="63" ry="70"/><ellipse cx="48" cy="299" rx="63" ry="78"/></g><g fill="#819266"><ellipse cx="1094" cy="637" rx="84" ry="63"/><ellipse cx="1200" cy="655" rx="111" ry="99"/></g>`;
  return scene;
}
function shop(color, before) {
  const c = before ? '#a5a28b' : color;
  return `<rect width="1200" height="800" fill="url(#sky)"/><rect y="632" width="1200" height="168" fill="#c7c7b8"/><rect x="120" y="158" width="960" height="475" fill="${c}"/><rect x="120" y="158" width="960" height="475" fill="url(#siding)"/><rect x="96" y="142" width="1008" height="30" fill="#4b5346"/><rect x="151" y="280" width="898" height="38" fill="#4b5346"/><rect x="162" y="318" width="873" height="281" fill="#e7e5d5"/>${windowShape(180, 338, 255, 240)}${windowShape(461, 338, 255, 240)}${windowShape(742, 338, 275, 240)}<rect x="755" y="339" width="114" height="277" fill="#3c483d"/><rect x="764" y="350" width="96" height="218" fill="url(#glass)"/><path d="M850 475v41" stroke="#d0bd87" stroke-width="5"/><rect x="463" y="203" width="273" height="40" rx="5" fill="#e5dcc8"/><text x="600" y="230" text-anchor="middle" font-family="sans-serif" font-size="17" letter-spacing="5" fill="#4c5645">THE CORNER</text>${plant(211, 600, 0.65)}${plant(980, 598, 0.65)}<path d="M0 694h1200M0 770h1200M252 633v167m443-167v167m438-167v167" stroke="#a7ab9b" stroke-width="2"/>`;
}
const scenes = [
  ['sage-kitchen', '#889581', 'kitchen'],
  ['white-kitchen', '#e5e5d8', 'kitchen'],
  ['white-brick', '#e6e3d6', 'brick'],
  ['blue-siding', '#647a85', 'siding'],
  ['tan-vanity', '#b7ad94', 'vanity'],
  ['gray-stucco', '#a2a498', 'stucco'],
  ['black-doors', '#dfdfd1', 'doors'],
  ['terracotta-shop', '#b78065', 'shop'],
  ['blue-kitchen', '#536a77', 'kitchen'],
  ['green-siding', '#788674', 'siding'],
];
for (const [name, color, type] of scenes) {
  const render = (before) =>
    ['kitchen', 'vanity'].includes(type)
      ? kitchen(color, before, type === 'vanity')
      : type === 'shop'
        ? shop(color, before)
        : house(color, before, type);
  save(`media/projects/${name}-before.svg`, wrap(render(true)));
  save(`media/projects/${name}-after.svg`, wrap(render(false)));
  save(
    `media/projects/${name}-detail.svg`,
    wrap(
      render(false),
      ['kitchen', 'vanity'].includes(type) ? '390 230 600 400' : '450 240 600 400',
    ),
  );
}
save(
  'media/reviews/sample-review.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="450" viewBox="0 0 900 450"><rect width="900" height="450" rx="20" fill="#f4f6eb"/><circle cx="75" cy="76" r="32" fill="#d8e2c6"/><text x="75" y="87" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#425737">T</text><g font-family="sans-serif" fill="#344531"><text x="129" y="70" font-size="23" font-weight="bold">Taylor L.</text><text x="129" y="101" font-size="17" fill="#758067">Sample customer · Weddington, NC</text><text x="45" y="166" font-size="26" fill="#648140">★ ★ ★ ★ ☆</text><text x="45" y="229" font-size="25">A beautiful update to our bathroom.</text><text x="45" y="270" font-size="25">The softer color makes the space feel calm</text><text x="45" y="311" font-size="25">and pulled together.</text><text x="45" y="405" font-size="16" fill="#758067">FICTIONAL REVIEW · DEMONSTRATION ONLY</text></g></svg>`,
);
// Corporate logo and icon assets are maintained separately; do not recreate them here.
save(
  'media/videos/process-demo.vtt',
  'WEBVTT\n\n00:00.000 --> 00:04.000\nStep 1: Thoughtful preparation. Protect, clean, and prepare.\n\n00:04.000 --> 00:08.000\nStep 2: A fresh finish. Apply the selected coating.\n\n00:08.000 --> 00:12.000\nStep 3: The final reveal. Review the finish and care instructions.\n',
);
console.log(
  'Created 30 original project illustrations, review screenshot and captions. Corporate branding is preserved.',
);
