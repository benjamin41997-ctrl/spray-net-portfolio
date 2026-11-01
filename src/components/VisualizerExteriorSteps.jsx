import { useEffect, useRef } from 'react';
import { colorsById } from '../data/colors';
import { exteriorSurfaces, surfaceNames } from '../lib/visualizerDesign';

export default function VisualizerExteriorSteps({active, surfaces, onSelect, disabled}) {
  const list=useRef(null);const index=exteriorSurfaces.indexOf(active);
  useEffect(()=>{list.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});},[active]);
  return <div className="viz-exterior-steps">
    <div className="viz-step-tabs" ref={list} role="group" aria-label="Exterior surfaces">{exteriorSurfaces.map(id=><button key={id} className={`chip ${id===active?'selected':''}`} aria-label={surfaceNames[id]} aria-pressed={id===active} disabled={disabled} onClick={()=>onSelect(id)}>{surfaces[id] && <span className="viz-step-color" style={{background:colorsById.get(surfaces[id])?.hex}}/>}{surfaceNames[id]}</button>)}</div>
    <div className="viz-step-actions"><button className="button" disabled={disabled || index===0} onClick={()=>onSelect(exteriorSurfaces[index-1])}>Back</button><button className="button" disabled={disabled || index===exteriorSurfaces.length-1} onClick={()=>onSelect(exteriorSurfaces[index+1])}>{index===exteriorSurfaces.length-1?'Last Surface':`Next: ${surfaceNames[exteriorSurfaces[index+1]]}`}</button></div>
  </div>;
}
