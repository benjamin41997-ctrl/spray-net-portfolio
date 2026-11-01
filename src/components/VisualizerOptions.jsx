import {useEffect,useRef,useState} from 'react';
export const finishOptions={
  hardwareStyle:{label:'Hardware Style',options:{keep:'Keep Existing',bar:'Bar Pulls',knob:'Knobs',cup:'Cup Pulls',none:'No Hardware'}},
  hardwareFinish:{label:'Hardware Finish',options:{keep:'Keep Existing','matte-black':'Matte Black','brushed-nickel':'Brushed Nickel',brass:'Brass',chrome:'Chrome',bronze:'Bronze'}},
  backsplash:{label:'Backsplash',options:{keep:'Keep Existing','white-subway':'White Subway Tile',marble:'Marble Look','warm-neutral':'Warm Neutral Tile'}},
  countertop:{label:'Countertops',options:{keep:'Keep Existing','white-quartz':'White Quartz Look',marble:'Marble Look','dark-stone':'Dark Stone Look','butcher-block':'Butcher Block Look'}},
};
export default function VisualizerOptions({design,onChange,disabled}) {
  const [open,setOpen]=useState(false);const dialog=useRef(null);
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
  return <><button className="button viz-options-button" disabled={disabled} onClick={()=>setOpen(true)}>Hardware &amp; Finishes</button>
    <dialog ref={dialog} className="viz-options-dialog" aria-labelledby="viz-options-title" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}>
      <h2 id="viz-options-title">Hardware &amp; Finishes</h2>
      <div className="viz-options-grid">{Object.entries(finishOptions).map(([key,item])=><label className="viz-label" key={key}>{item.label}<select aria-label={item.label} disabled={disabled || (key==='hardwareFinish'&&design.hardwareStyle==='none')} value={design[key]} onChange={e=>onChange(d=>({...d,[key]:e.target.value,...(key==='hardwareStyle'&&e.target.value==='none'?{hardwareFinish:'keep'}:{})}))}>{Object.entries(item.options).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>)}</div>
      <button className="button button-dark" onClick={()=>setOpen(false)}>Done</button>
    </dialog></>;
}
