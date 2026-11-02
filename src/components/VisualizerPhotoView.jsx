import {useId,useState} from 'react';

export default function VisualizerPhotoView({src,alt,region,showHighlight}) {
  const maskId=useId().replace(/:/g,'');
  const [size,setSize]=useState({width:1,height:1});
  return <>
    <img src={src} alt={alt} onLoad={event=>setSize({width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight})}/>
    {showHighlight && !!region?.polygons?.length && <svg className="viz-region-overlay" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Approximate detected area: ${region.description}`}>
      <defs><mask id={maskId}><rect width={size.width} height={size.height} fill="white"/>{(region.holes || []).map((polygon,i)=><polygon key={i} fill="black" stroke="none" points={polygon.map(({x,y})=>`${x*size.width/1000},${y*size.height/1000}`).join(' ')}/>)}</mask></defs>
      <g mask={`url(#${maskId})`}>{region.polygons.map((polygon,i)=><polygon key={i} points={polygon.map(({x,y})=>`${x*size.width/1000},${y*size.height/1000}`).join(' ')} vectorEffect="non-scaling-stroke"/>)}</g>
    </svg>}
  </>;
}
