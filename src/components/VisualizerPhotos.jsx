import { useEffect, useState } from 'react';

function PhotoThumb({ photo, preview, index, selected, onSelect, disabled }) {
  const [url, setUrl] = useState('');
  const image = preview?.renderPhoto || photo.blob;
  useEffect(() => {
    const next = URL.createObjectURL(image);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [image]);

  return <button className={`viz-photo-thumb ${selected ? 'selected' : ''}`} disabled={disabled}
    aria-pressed={selected} aria-label={`Select Photo ${index + 1}`} aria-description={preview ? 'Preview ready' : undefined}
    onClick={onSelect} title={photo.name || `Photo ${index + 1}`}>
    <img src={url || undefined} alt="" />
    {preview && <span className="viz-photo-ready" aria-hidden="true">Preview Ready</span>}
    <span className="viz-photo-number">{index + 1}</span>
  </button>;
}

export default function VisualizerPhotos({ photos, photoId, previews, selectedIds, onSelect, disabled }) {
  if (!photos.length) return null;
  return <div className="viz-photo-library">
    <div className="viz-photo-strip" aria-label="Uploaded photos">
      {photos.map((photo, index) => {
        const photoPreviews = previews.filter(preview => preview.photoId === photo.id);
        const preview = photoPreviews.find(preview => preview.id === selectedIds[photo.id]) || photoPreviews[0];
        return <PhotoThumb key={photo.id} photo={photo} preview={preview} index={index} selected={photo.id === photoId}
          disabled={disabled} onSelect={() => onSelect(photo.id)} />;
      })}
    </div>
  </div>;
}
