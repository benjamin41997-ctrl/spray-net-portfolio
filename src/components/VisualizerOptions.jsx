export const finishOptions={
  hardwareStyle:{label:'Hardware Style',options:{keep:'Keep Existing',knob:'Knobs','small-handle':'Small Handles','big-handle':'Big Handles'}},
  hardwareFinish:{label:'Hardware Finish',options:{keep:'Keep Existing','matte-black':'Matte Black','brushed-nickel':'Brushed Nickel',gold:'Gold',copper:'Copper',brass:'Brass',chrome:'Chrome',bronze:'Bronze'}},
  backsplash:{label:'Backsplash',options:{keep:'Keep Existing','match-countertop':'Match Countertop',calacatta:'Calacatta Slab','white-subway':'White Subway Tile',marble:'Marble Look','warm-neutral':'Warm Neutral Tile'}},
  countertop:{label:'Countertops',options:{keep:'Keep Existing',calacatta:'White Calacatta','white-quartz':'White Quartz Look',marble:'Marble Look','dark-stone':'Dark Stone Look','butcher-block':'Butcher Block Look'}},
};
export default function VisualizerOptions({design,onChange,disabled}) {
  return <div className="viz-hardware-panel" role="region" aria-label="Hardware Finishes">
    <div className="viz-options-grid">{Object.entries(finishOptions).map(([key,item])=><label className="viz-label" key={key}>{item.label}<select aria-label={item.label} disabled={disabled || (key==='hardwareFinish'&&design.hardwareStyle==='none')} value={design[key]} onChange={e=>onChange(d=>({...d,[key]:e.target.value,...(key==='hardwareStyle'&&e.target.value==='none'?{hardwareFinish:'keep'}:{})}))}>{Object.entries(item.options).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>)}</div>
    {design.backsplash==='match-countertop' && <p className="viz-notice">The countertop color and pattern continue up the backsplash in a seamless slab look.</p>}
  </div>;
}
