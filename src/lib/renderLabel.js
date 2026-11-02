import {colorsById} from '../data/colors.js';
import {surfaceNames} from './visualizerDesign.js';

export function renderLabelLines(design) {
  if (design.customPrompt) {
    const ids=[...design.customPrompt.matchAll(/\bSW[ -]?(\d{4})\b/gi)].map(match=>`sw-${match[1]}`);
    const selected=[...new Set([...Object.values(design.surfaces || {}),...ids])].map(id=>colorsById.get(id)).filter(Boolean);
    return selected.length ? ['Custom Design Â· Color References',...selected.map(c=>`${c.name} (${c.code})`)] : ['Custom Design Â· Colors Not Specified'];
  }
  const grouped=new Map();
  for(const [surface,id] of Object.entries(design.surfaces || {})) {
    const color=colorsById.get(id);if(!color)continue;
    const entry=grouped.get(id)||{color,surfaces:[]};entry.surfaces.push(surfaceNames[surface]||surface);grouped.set(id,entry);
  }
  const lines=[...grouped.values()].map(({color,surfaces})=>`${surfaces.join(' / ')}: ${color.name} (${color.code})`);
  if(design.shutterAction==='remove')lines.push('Shutters: Removed');
  return lines.length?lines:['Existing Colors Â· Hardware & Finish Preview'];
}

export async function labelRender(blob, design) {
  const url=URL.createObjectURL(blob);const img=new Image();
  try {
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Unable to label the design preview.'));img.src=url;});
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Unable to label the design preview.');
    ctx.drawImage(img,0,0);
    const font=Math.max(14,Math.round(canvas.width*.016)),pad=Math.max(8,Math.round(font*.6)),margin=pad,lineHeight=Math.round(font*1.35),maxWidth=canvas.width*.88-pad*2;
    ctx.font=`600 ${font}px Arial, sans-serif`;ctx.textBaseline='top';
    const lines=[];
    for(const text of renderLabelLines(design)) {
      let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    }
    const width=Math.min(canvas.width-margin*2,Math.ceil(Math.max(...lines.map(line=>ctx.measureText(line).width)))+pad*2),height=lines.length*lineHeight+pad*2,y=canvas.height-margin-height;
    ctx.fillStyle='#003965';ctx.fillRect(margin,y,width,height);ctx.fillStyle='#FFFFFF';
    lines.forEach((line,i)=>ctx.fillText(line,margin+pad,y+pad+i*lineHeight));
    return await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Unable to save the labeled preview.')),'image/webp',.94));
  } finally {URL.revokeObjectURL(url);}
}
