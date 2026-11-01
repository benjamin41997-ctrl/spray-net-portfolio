export function mergeColorCatalog(catalog, references) {
  const referenceIds = new Set(references.map(color => color.id));
  const known = new Map(catalog.map(color => [color.id,color]));
  const retained = catalog.filter(color => !referenceIds.has(color.id));
  return [...retained, ...references.map(color => {
    const match = known.get(color.id);
    return { ...match, ...color, brand:'Sherwin-Williams', source:'sherwin-williams-official',
      referenceOnly:true, digitalApproximation:true, catalogMatch:Boolean(match),
      collections:['kitchen','exterior'], systems:match?.systems || [], coatingSystems:match?.coatingSystems || [],
      ...(match ? {catalogSource:match.source,catalogHex:match.hex} : {}),
    };
  })].sort((a,b) => {
    const order={'Spray-Net':0,'Sherwin-Williams':1,'Benjamin Moore':2};
    return order[a.brand]-order[b.brand] || (a.id==='sn-oc65'?-1:b.id==='sn-oc65'?1:a.name.localeCompare(b.name));
  });
}
