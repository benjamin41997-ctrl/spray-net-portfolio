"""Read-only import of Sherwin-Williams' published XLSX name/RGB/hex data."""
from pathlib import Path
import argparse, colorsys, hashlib, json, re, zipfile
import xml.etree.ElementTree as E

parser=argparse.ArgumentParser()
parser.add_argument('--source-dir',type=Path,required=True,help='Directory with the official colorsnap.zip and designer.zip downloads')
args=parser.parse_args()
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
source_url='https://www.sherwin-williams.com/painting-contractors/2020-color-forecast/color-tools/downloadable-color-palettes'
urls={'colorsnap':'https://images.sherwin-williams.com/content_images/SW-XCL-SHERWIN-WILLIAMS-COLORC.zip','designer':'https://images.sherwin-williams.com/content_images/sw-xcl-sherwin-williams-ede.zip'}

def family(hex,name):
    h,l,s=colorsys.rgb_to_hls(*[int(hex[i:i+2],16)/255 for i in (1,3,5)])
    if ('white' in name.lower() and l>.7) or (l>.86 and s<.4):return 'White'
    if l<.25 and s<.3:return 'Black'
    if s<.13:return 'Gray'
    if .53<=h<.75:return 'Blue'
    if .19<=h<.53:return 'Green'
    if .05<=h<.19:return 'Beige / Tan'
    return 'Other'

rows=[];sources=[]
for kind,url in urls.items():
    archive=args.source_dir/(kind+'.zip')
    with zipfile.ZipFile(archive) as outer:
        names=[n for n in outer.namelist() if n.endswith('.xlsx') and not n.startswith('__MACOSX/') and not Path(n).name.startswith('._')]
        assert len(names)==1,'Expected exactly one official workbook'
        workbook=outer.read(names[0])
    import io
    with zipfile.ZipFile(io.BytesIO(workbook)) as z:
        strings=[''.join(node.itertext()) for node in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
        sheet=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
        count=0
        for row in sheet.findall('.//s:sheetData/s:row',ns):
            values={}
            for cell in row.findall('s:c',ns):
                node=cell.find('s:v',ns);value=node.text if node is not None else ''
                if cell.get('t')=='s':value=strings[int(value)]
                if cell.get('t')=='inlineStr':value=''.join(cell.find('s:is',ns).itertext())
                values[re.sub(r'\d+','',cell.get('r'))]=value
            code=values.get('A' if kind=='colorsnap' else 'E','').strip()
            if not re.fullmatch('SW[0-9]{4}',code):continue
            name=values.get('B' if kind=='colorsnap' else 'D','').strip()
            channels=[int(float(values.get(col,'-1'))) for col in (('D','E','F') if kind=='colorsnap' else ('I','J','K'))]
            assert name and all(0<=v<=255 for v in channels)
            hex='#'+''.join(f'{v:02X}' for v in channels)
            assert hex=='#'+values.get('G' if kind=='colorsnap' else 'L','').strip().lstrip('#').upper(),f'RGB/hex disagreement: {code}'
            rows.append({'id':'sw-'+code[2:],'name':name,'code':'SW '+code[2:],'hex':hex,'family':family(hex,name),'palette':'ColorSnap' if kind=='colorsnap' else 'Designer Color Collection'})
            count+=1
        sources.append({'palette':kind,'url':url,'workbook':names[0],'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'workbookSha256':hashlib.sha256(workbook).hexdigest(),'colors':count})
assert len(rows)==len({c['id'] for c in rows}),'Duplicate manufacturer code'
meta={'id':'sherwin-williams-official','verifiedOn':'2026-11-01','sourcePage':source_url,'files':sources,'note':'Official digital color references; these values do not establish coating availability or a calibrated paint match. The ColorSnap workbook filename is dated 2019; it is still the file linked by the official downloads page on the verification date.'}
out=Path(__file__).resolve().parents[1]/'src/data/sherwinWilliams.js'
out.write_text('// Published manufacturer color references; regenerate with scripts/import-sherwin.py.\nexport const sherwinWilliamsSource = '+json.dumps(meta,indent=2)+';\nexport const sherwinWilliamsColors = [\n'+''.join('  '+json.dumps(c,ensure_ascii=False,separators=(',',':'))+',\n' for c in rows)+'];\n',encoding='utf-8')
print(json.dumps({'colors':len(rows),'sources':[{k:s[k] for k in ('palette','colors','workbook')} for s in sources]}))
