import { useEffect, useState } from 'react';
function PhotoThumb({ photo, index, selected, onSelect, disabled }) {
  const [url,setUrl] = useState('');
  useEffect(() => { const next=URL.createObjectURL(photo.blob); setUrl(next); return()=>URL.revokeObjectURL(next); },[photo.blob]);
  return <button className={`viz-photo-thumb ${selected ? 'selected' : ''}`} disabled={disabled} aria-pressed={selected} aria-label={`Select Photo ${index+1}`} onClick={onSelect} title={photo.name || `Photo ${index+1}`}><img src={url} alt="" /><span>Photo {index+1}</span></button>;
}
export default function VisualizerPhotos({ photos, photoId, onSelect, disabled }) {
  if (!photos.length) return null;
  return <div className="viz-photo-library"><p>{photos.length} {photos.length === 1 ? 'Photo' : 'Photos'} · Choose an Angle to Preview</p><div className="viz-photo-strip" aria-label="Uploaded photos">{photos.map((photo,index)=><PhotoThumb key={photo.id} photo={photo} index={index} selected={photo.id===photoId} disabled={disabled} onSelect={()=>onSelect(photo.id)} />)}</div></div>;
}
