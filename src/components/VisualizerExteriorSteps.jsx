import { colorsById } from '../data/colors';
import { surfaceNames } from '../lib/visualizerDesign';

export default function VisualizerExteriorSteps({active, available, surfaces, onSelect, disabled, status}) {
  if(!available.length)return <div className="viz-surface-status" role="status" aria-live="polite">{status==='loading' && <span className="viz-spinner"/>}{status==='loading'?'Detecting Visible Surfaces...':status==='ready'?'No Editable Surfaces Detected':status==='error'?'Surface Detection Needs Another Try':status==='connection'?'Connect to Detect Visible Surfaces':'Upload an Exterior Photo to Detect Surfaces'}</div>;
  return <div className="viz-step-tabs" style={{'--surface-count':available.length}} role="group" aria-label="Exterior surfaces">{available.map(id=><button key={id} className={`chip ${id===active?'selected':''} ${surfaces[id]?'has-color':''}`} style={{'--step-color':colorsById.get(surfaces[id])?.hex}} title={`${surfaceNames[id]}${surfaces[id]?`: ${colorsById.get(surfaces[id])?.name}`:''}`} aria-label={surfaceNames[id]} aria-pressed={id===active} disabled={disabled} onClick={()=>onSelect(id)}>{id==='frontDoor'?'Door':id==='garageDoor'?'Garage':surfaceNames[id]}</button>)}</div>;
}
export function ExteriorStepNavigation({active,available,onSelect,disabled}) {
  const index=available.indexOf(active);
  return <div className="viz-step-actions"><button className="button" disabled={disabled || index<=0} onClick={()=>onSelect(available[index-1])}>Back</button><button className="button" disabled={disabled || index<0 || index===available.length-1} onClick={()=>onSelect(available[index+1])}>{index===available.length-1?'Last Surface':`Next: ${surfaceNames[available[index+1]]}`}</button></div>;
}
