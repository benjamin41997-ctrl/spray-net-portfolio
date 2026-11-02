import {useEffect,useRef,useState} from 'react';

export default function VisualizerCorrection({onClose,onSubmit,disabled,notes=[],areas=false}) {
  const dialog=useRef(null);const [feedback,setFeedback]=useState('');
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog className="viz-correction" ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="correction-title">
    <div className="viz-tools-heading"><h2 id="correction-title">{areas?'Correct Detected Areas':'Correct This Preview'}</h2><button className="button" onClick={onClose}>Cancel</button></div>
    <p>{areas?'Describe which surface was identified incorrectly and where it actually is. This updates the highlights without creating an image.':'Tell us what went wrong and what should change. The next preview uses your original photo, this preview and your feedback.'}</p>
    <label className="viz-label">What Should We Fix?<textarea autoFocus maxLength={1500} rows={5} value={feedback} onChange={event=>setFeedback(event.target.value)} placeholder="Example: You painted the brick. Restore the original brick and change only the horizontal siding above the garage."/></label>
    {!!notes.length && <details><summary>Corrections Remembered for This Photo ({notes.length})</summary><ul>{notes.map((note,i)=><li key={i}>{note}</li>)}</ul></details>}
    <p className="viz-correction-help">Keeps the latest five corrections with this photo for this consultation. {areas?'Surface analysis uses a small separate AI allowance.':'Each revision creates one new preview.'}</p>
    <button className="button button-dark" disabled={disabled || !feedback.trim()} onClick={()=>onSubmit(feedback)}>{areas?'Update Detected Areas':'Apply Correction'}</button>
  </dialog>;
}
