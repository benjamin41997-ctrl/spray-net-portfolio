import test from 'node:test';
import assert from 'node:assert/strict';
import {sameCabinetColors,findCabinetReference} from '../src/lib/cabinetAppearance.js';
const design={mode:'kitchen',surfaces:{cabinets:'white',island:'navy'}};
const look=(id,extra={})=>({id,photoId:'kitchen-1',design,rawRenderPhoto:new Blob(['raw']),createdAt:`2026-11-02T12:00:0${id==='base'?0:1}Z`,...extra});
test('cabinet identity ignores property order but changes with any color, layout, photo or project type',()=>{
  assert.ok(sameCabinetColors(design,{mode:'kitchen',surfaces:{island:'navy',cabinets:'white'},hardwareFinish:'gold'}));
  assert.ok(sameCabinetColors(design,{mode:'kitchen',surfaces:[{surface:'cabinets',color:{id:'white'}},{surface:'island',color:{id:'navy'}}]}));
  assert.equal(sameCabinetColors(design,{mode:'kitchen',surfaces:{cabinets:'white',island:'black'}}),false);
  assert.equal(sameCabinetColors(design,{mode:'kitchen',surfaces:{upperCabinets:'white',lowerCabinets:'navy',island:'navy'}}),false);
  assert.equal(findCabinetReference([look('base')],'other-photo',design),null);
  assert.equal(findCabinetReference([look('base')],'kitchen-1',{mode:'exterior',surfaces:{}}),null);
});
test('successive variants resolve to the same root and explicitly corrected Looks can establish a new root',()=>{
  const base=look('base');const variant=look('variant',{cabinetReferenceId:'base',design:{...design,hardwareFinish:'gold'}});
  assert.equal(findCabinetReference([variant,base],'kitchen-1',design,'variant').id,'base');
  const corrected=look('corrected',{cabinetReferenceId:'corrected'});
  assert.equal(findCabinetReference([corrected,variant,base],'kitchen-1',design,'corrected').id,'corrected');
  assert.equal(findCabinetReference([variant,base],'kitchen-1',design,'base').id,'base');
});
test('labels and manual custom previews never become automatic color references',()=>{
  const custom=look('custom',{design:{...design,customPrompt:'Make the cabinets purple'}});
  const labeledOnly=look('label',{rawRenderPhoto:null,renderPhoto:new Blob(['label'])});
  assert.equal(findCabinetReference([custom,labeledOnly],'kitchen-1',design),null);
  assert.equal(findCabinetReference([look('legacy')],'kitchen-1',design).id,'legacy');
});
