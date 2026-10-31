#!/usr/bin/env python3
"""Import customer color names and digital swatches; requires pypdf and Pillow.

Only color names, codes, supported coating families and sampled RGB are exported.
No color formulas, inventory data, pricing, customer-specific matches or raw PDFs
are copied into the public app. See docs/COLOR-SOURCES.md for coverage and limits.
"""
import csv, json, re, sys, hashlib, colorsys, argparse, tempfile
from collections import Counter, defaultdict
from pathlib import Path
from PIL import Image
from pypdf import PdfReader
from pypdf.generic import ContentStream

parser=argparse.ArgumentParser(description='Import verified digital color swatches from the local Spray-Net inventory catalogs.')
parser.add_argument('--catalog-dir',type=Path,required=True,help='Folder containing the seven OCT 2026 PDFs and FULL COLOR LIST OCT 2026.csv')
parser.add_argument('--cached-swatches',type=Path,help='Optional previously extracted records.json; source PDFs and CSV are still required for validation and hashing.')
args=parser.parse_args()
SRC=args.catalog_dir.resolve()
REPO=Path(__file__).resolve().parents[1]
OUT=Path(tempfile.mkdtemp(prefix='spraynet-colors-'))
rows={r['PartNumber']:r for r in csv.DictReader((SRC/'FULL COLOR LIST OCT 2026.csv').open(encoding='utf-8-sig'))}

def mul(a,b):
    return [a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3],a[4]*b[0]+a[5]*b[2]+b[4],a[4]*b[1]+a[5]*b[3]+b[5]]

def sample(obj):
    w,h=int(obj['/Width']),int(obj['/Height'])
    if obj.get('/BitsPerComponent')!=8 or str(obj.get('/ColorSpace')) not in ['/DeviceRGB','/DeviceGray']:
        return None
    im=Image.frombytes('RGB' if str(obj['/ColorSpace'])=='/DeviceRGB' else 'L',(w,h),obj.get_data()).convert('RGB')
    # Avoid headings, names, swatch borders and photograph edges. Flat digital
    # swatches dominate this center/bottom region; photos/wood finishes do not.
    crop=im.crop((int(w*.25),int(h*.35),int(w*.75),int(h*.65)))
    pixels=list(crop.getdata())
    dominant,n=Counter(pixels).most_common(1)[0]
    nearby=sum(1 for p in pixels if max(abs(p[i]-dominant[i]) for i in range(3))<=3)
    if nearby/len(pixels)<.9: return None
    return '#'+''.join(f'{v:02X}' for v in dominant)

if not args.cached_swatches:
    all_records=[]
    stats=[]
    for system in ['KITCHEN','BRICK','D+W','ELASTO','MAT','SATIN','VINYL']:
        pdf=SRC/f'{system} OCT 2026.pdf'; reader=PdfReader(pdf); page=reader.pages[0]
        cm=[1,0,0,1,0,0];tm=[1,0,0,1,0,0];stack=[];images=[];texts=[]
        xobjects=page['/Resources']['/XObject']
        for args,op in ContentStream(page['/Contents'].get_object(),reader).operations:
            if op==b'q':stack.append(cm[:])
            elif op==b'Q':cm=stack.pop()
            elif op==b'cm':cm=mul([float(x) for x in args],cm)
            elif op==b'Tm':tm=[float(x) for x in args]
            elif op==b'Td':tm[4]+=float(args[0]);tm[5]+=float(args[1])
            elif op==b'Do':
                images.append({'x':cm[4], 'y':cm[5], 'w':cm[0], 'h':cm[3], 'object':str(args[0])})
            elif op==b'Tj':
                value=str(args[0]);m=mul(tm,cm)
                texts.append({'x':m[4], 'y':m[5], 'text':value})
        image_cols=defaultdict(list)
        for im in images: image_cols[int((im['x']-20)//144)].append(im)
        records=[];seen=set();skipped=[]
        for text in texts:
            if not text['text'].startswith(('G-','MATCH-','NSG-')):continue
            sku=text['text'];base=re.sub(r'-(?:1|2|2\.5|5|P)$','',sku)
            if base in seen:continue
            seen.add(base)
            row=rows.get(base)
            if not row or row['Active']!='TRUE':continue
            if any(token in row['PartDescription'].upper() for token in ['PRIMER','BASE','HARDENER','METAL FLAKE','*MAT*','*MATTE*']):continue
            candidates=[i for i in image_cols[int((text['x']-20)//144)] if 0<i['y']-text['y']<70]
            if not candidates:skipped.append([base,'no image']);continue
            image=min(candidates,key=lambda im:im['y']-text['y'])
            try:hex=sample(xobjects[image['object']].get_object())
            except Exception as err:hex=None
            if hex is None:skipped.append([base,'not a flat swatch']);continue
            records.append({'sku':base,'label':row['PartDescription'],'hex':hex,'system':system,'source':pdf.name,'image':image['object']})
        all_records.extend(records)
        stats.append({'system':system,'records':len(records),'uniqueProducts':len(seen),'skipped':skipped})
        print(system,len(records),'verified flat swatches;',len(skipped),'unusable swatches',flush=True)
        (OUT/f'{system.replace("+","")}-records.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
    (OUT/'records.json').write_text(json.dumps(all_records,indent=2),encoding='utf-8')
    (OUT/'stats.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')

import json,csv,re,hashlib,colorsys
from pathlib import Path
from collections import defaultdict, Counter

records=json.loads((args.cached_swatches or (OUT/'records.json')).read_text())
inventory=list(csv.DictReader((SRC/'FULL COLOR LIST OCT 2026.csv').open(encoding='utf-8-sig')))
SUFFIX={'KITCHEN':'K','BRICK':'B','D+W':'W','ELASTO':'E','MAT':'M','SATIN':'S','VINYL':'V'}
CORE={
'204110':'Hunter Green','211140':'Taos Taupe','211810':'Universal Black','212110':'Gray','213040':'Black Pepper',
'525':'Black','CC20':"Decorator's White",'CC30':'Oxford White','HC154':'Hale Navy','HC166':'Kendall Charcoal',
'HC167':'Amherst Gray','HC168':'Chelsea Gray','HC171':'Wickham Gray','OC27':'Balboa Mist','OC28':'Collingwood','OC65':'Chantilly Lace',
'265':'Antique Brown','298':'White 298','403':'Clay 403','429':'Ice White','431':'Bright White','506':'Windswept Smoke',
'509':'Midnight Surf','510':'Canyon Clay 510','514':'Cashmere','523':'Slate','534':'Pearl','535':'Wedgewood Blue',
'536':'Dover Gray','538':'Wicker','540':'Sandstone','541':'Kaki XL','542':'Old World Blue','547':'Sable','557':'Dark Drift',
'559':'Pebble','562':'Commercial Brown','568':'Nutmeg','569':'Saddle Brown','570':'Storm','571':'Brownstone','576':'Mist Grey XL',
'587':'Sand XL','5P5':'Graphite','5P6':'Iron Ore','5P8':'Monterey Sand','5P9':'Coastal Blue','5X3':'Coastline XL',
'780F5':'Anonymous','567':'Burgundy'}

def title(s):
    return re.sub(r"\b([a-z])",lambda m:m[1].upper(),s.lower()).replace("'S","'s")

def key(sku,label):
    if not re.search('[BEKMWSV]$',sku):return None
    code=re.sub('[BEKMWSV]$','',sku)
    if code.startswith('G-') and code[2:] in CORE:return ('Spray-Net',code)
    brand='Sherwin-Williams' if label.startswith('SW ') else 'Benjamin Moore' if label.startswith('BM ') else None
    if not brand or not code.startswith('MATCH-'):return None
    # The inventory uses both MATCH-7040 and MATCH-SW7040 for the same color.
    if brand=='Sherwin-Williams':code=re.sub(r'^MATCH-(?:SW|HGSW)','MATCH-',code)
    if brand=='Benjamin Moore':code=re.sub(r'^MATCH-BM','MATCH-',code)
    return (brand,code)

def clean_name(label,brand,code):
    if brand=='Spray-Net':return CORE[code[2:]]
    name=re.sub(r'^(?:SW|BM)\s+','',label)
    name=re.sub(r'\s+(?:KITCHEN|CUISINE|BRICK|BRIQUE|D\+W|P\+F|STUCCO|ELASTO|MAT|SATIN|VINYL|VINYLE)(?:\b|/).*$', '', name,flags=re.I)
    name=name.split('/')[0].strip()
    name=re.sub(r'^\d+\s+','',name)
    name=re.sub(r'^(?:NOIR|GRIS|BLEU)\s+','',name)
    name=re.sub(r'\s+(?:NOIR|GRIS|REALISTE|HGTV \d+)$','',name)
    name={'NOCTURNE':'NOCTURNAL GREY','VERT DE TOSCANE':'TUSCANY GREEN'}.get(name,name)
    return title(re.sub(r'\s+',' ',name))

def family(hex,name):
    rgb=[int(hex[i:i+2],16)/255 for i in (1,3,5)]
    h,l,s=colorsys.rgb_to_hls(*rgb)
    if 'white' in name.lower() and l>.7:return 'White'
    if l>.86 and s<.4:return 'White'
    if l<.25 and s<.3:return 'Black'
    if s<.13:return 'Gray'
    if h>=.53 and h<.75:return 'Blue'
    if h>=.19 and h<.53:return 'Green'
    if h>=.05 and h<.19:return 'Beige / Tan'
    return 'Other'

groups=defaultdict(list)
for r in records:
    if not r['sku'].endswith(SUFFIX[r['system']]):continue
    k=key(r['sku'],r['label'])
    if k:groups[k].append(r)

applicable=defaultdict(set)
for row in inventory:
    if row['Active']!='TRUE':continue
    k=key(row['PartNumber'],row['PartDescription'])
    if not k:continue
    for system,suffix in SUFFIX.items():
        if row['PartNumber'].endswith(suffix):applicable[k].add(system)

colors=[]
for (brand,code),g in groups.items():
    r=g[0]
    systems=sorted(applicable[(brand,code)])
    name=clean_name(r['label'],brand,code)
    swatch=Counter(x['hex'] for x in g).most_common(1)[0][0]
    prefix={'Spray-Net':'sn','Sherwin-Williams':'sw','Benjamin Moore':'bm'}[brand]
    identifier=prefix+'-'+code.replace('G-','').replace('MATCH-','').lower()
    colors.append({'id':identifier,'name':name,'code':code,'hex':swatch,'brand':brand,
        'collections':(['kitchen'] if 'KITCHEN' in systems else [])+(['exterior'] if any(s!='KITCHEN' for s in systems) else []),
        'family':family(swatch,name),'source':'spray-net-oct-2026',
        'coatingSystems':systems,'systems':[s.lower().replace('+','') for s in systems],'swatchSource':r['source'],'swatchSku':r['sku'],
        'catalogMatch':brand!='Spray-Net','digitalApproximation':True})

# Lead with the familiar Spray-Net deck; then alphabetize each matched collection.
priority={'Spray-Net':0,'Sherwin-Williams':1,'Benjamin Moore':2}
colors.sort(key=lambda c:(priority[c['brand']],0 if c['id']=='sn-oc65' else 1,c['name']))
assert len(colors)==len({c['id'] for c in colors})
assert all(c['collections'] and re.fullmatch('#[0-9A-F]{6}',c['hex']) and c['name'] for c in colors)
source_files=[*SRC.glob('*.pdf'),SRC/'FULL COLOR LIST OCT 2026.csv']
source_info={'id':'spray-net-oct-2026','label':'Spray-Net October 2026 Color Catalogs','verifiedOn':'2026-10-30',
'swatchNote':'Digital swatches are sampled from the Spray-Net catalog images. Confirm final selections with physical samples.',
'matchNote':'Named Sherwin-Williams and Benjamin Moore colors are matches listed in the Spray-Net catalog; these are not complete manufacturer decks.',
'files':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in source_files]}
js='// Verified customer color data. Regenerate from the local catalog with scripts/import-colors.py.\n'
js+='// Screen swatches are digital approximations, not calibrated paint measurements.\n'
js+='export const colorSource = '+json.dumps(source_info,indent=2)+';\n\n'
js+='export const colors = [\n'+''.join('  '+json.dumps(c,ensure_ascii=False,separators=(',',':'))+',\n' for c in colors)+'];\n\n'
js+='export const colorBrands = [...new Set(colors.map((color) => color.brand))];\n'
js+='export const colorFamilies = [\'White\', \'Black\', \'Gray\', \'Blue\', \'Green\', \'Beige / Tan\', \'Other\'];\n'
js+='export const colorsById = new Map(colors.map((color) => [color.id, color]));\n'
(REPO/'src/data/colors.js').write_text(js,encoding='utf-8')
print(len(colors),Counter(c['brand'] for c in colors),Counter(x for c in colors for x in c['collections']))
