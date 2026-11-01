import { colorsById } from '../data/colors';
import { exteriorSurfaces, surfaceNames } from '../lib/visualizerDesign';

export default function VisualizerExteriorSteps({active, surfaces, onSelect, disabled}) {
  return <div className="viz-step-tabs" role="group" aria-label="Exterior surfaces">{exteriorSurfaces.map(id=><button key={id} className={`chip ${id===active?'selected':''} ${surfaces[id]?'has-color':''}`} style={{'--step-color':colorsById.get(surfaces[id])?.hex}} title={`${surfaceNames[id]}${surfaces[id]?`: ${colorsById.get(surfaces[id])?.name}`:''}`} aria-label={surfaceNames[id]} aria-pressed={id===active} disabled={disabled} onClick={()=>onSelect(id)}>{id==='frontDoor'?'Door':id==='garageDoor'?'Garage':surfaceNames[id]}</button>)}</div>;
}
export function ExteriorStepNavigation({active,onSelect,disabled}) {
  const index=exteriorSurfaces.indexOf(active);
  return <div className="viz-step-actions"><button className="button" disabled={disabled || index===0} onClick={()=>onSelect(exteriorSurfaces[index-1])}>Back</button><button className="button" disabled={disabled || index===exteriorSurfaces.length-1} onClick={()=>onSelect(exteriorSurfaces[index+1])}>{index===exteriorSurfaces.length-1?'Last Surface':`Next: ${surfaceNames[exteriorSurfaces[index+1]]}`}</button></div>;
}
