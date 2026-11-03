import {colorsById} from '../data/colors.js';
import {photoViewLabel} from './photoViews.js';

export function renderName(record,photo) {
  const design=record.design || {};
  const ids=[...Object.values(design.surfaces || {})];
  if(design.customPrompt)for(const match of design.customPrompt.matchAll(/\b(?:SW|MATCH)[ -]?(\d{4})\b/gi))ids.push(`sw-${match[1]}`);
  const names=[...new Set(ids.map(id=>colorsById.get(id)?.name).filter(Boolean))];
  const color=names.length?names.join(' / '):design.customPrompt?'Custom Design':'Existing Colors';
  const view=photo?.viewLabel || record.viewLabel || photoViewLabel(design.mode);
  return `${color} · ${view}`;
}
export function renderDetails(record) {
  const d=record.design || {},parts=[];
  const finish={'matte-black':'Matte Black',black:'Black',brass:'Brass',bronze:'Bronze',gold:'Gold',copper:'Copper',chrome:'Chrome',nickel:'Nickel','brushed-nickel':'Brushed Nickel'}[d.hardwareFinish];
  const style={knob:'Knobs',knobs:'Knobs','small-handle':'Small Handles','large-handle':'Big Handles','big-handle':'Big Handles',bar:'Handles'}[d.hardwareStyle];
  if(finish || style)parts.push([finish,style || 'Hardware'].filter(Boolean).join(' '));
  const counter={calacatta:'Calacatta Countertops','white-quartz':'White Quartz Countertops',marble:'Marble Countertops','dark-stone':'Dark Stone Countertops','butcher-block':'Butcher Block Countertops'}[d.countertop];
  if(counter)parts.push(counter);
  if(d.backsplash==='match-countertop')parts.push('Matching Slab Backsplash');
  else if(d.backsplash && d.backsplash!=='keep')parts.push(({calacatta:'Calacatta Slab',marble:'Marble','white-subway':'White Subway','warm-neutral':'Warm Neutral'}[d.backsplash] || 'Updated')+' Backsplash');
  if(d.shutterAction==='remove')parts.push('Shutters Removed');
  if(d.customPrompt)parts.push('Custom Instructions');
  return parts.join(' · ');
}
export function renderFilename(record,index=0) {
  const slug=renderName(record).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110).toLowerCase();
  return `spray-net-${slug}-${record.id?.slice(0,8) || index+1}`;
}
