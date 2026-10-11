const {readFileSync}=require('node:fs');
const path=require('node:path');

async function locatePoint(page,boardId,coordinate,targetPointId,targetPointName){
  await page.locator('#'+boardId).scrollIntoViewIfNeeded();
  return page.evaluate(({boardId,coordinate,targetPointId,targetPointName})=>{
    const container=document.getElementById(boardId),board=Object.values(window.JXG?.boards||{}).find(item=>item.container===boardId||item.containerObj===container);
    const boardRect=container.getBoundingClientRect(),bbox=board?.getBoundingBox?.()||[],unitX=Number(board?.unitX)||boardRect.width/Math.abs(bbox[2]-bbox[0]),unitY=Number(board?.unitY)||boardRect.height/Math.abs(bbox[1]-bbox[3]);
    const candidates=Object.values(board?.objects||{}).filter(object=>object.elType==='point'&&object.rendNode?.isConnected&&object.visProp?.visible!==false&&object.visProp?.visible!=='false'&&object.visProp?.fixed!==true&&typeof object.X==='function'&&typeof object.Y==='function').map(object=>{
      const x=Number(object.X()),y=Number(object.Y()),node=object.rendNode.querySelector?.('circle')||object.rendNode,elementRect=node.getBoundingClientRect();
      const mappedScreen=[boardRect.left+(x-bbox[0])*boardRect.width/(bbox[2]-bbox[0]),boardRect.top+(bbox[1]-y)*boardRect.height/(bbox[1]-bbox[3])];
      return {id:object.id,name:object.name||object.label?.content||object.id,xy:[x,y],screen:[elementRect.left+elementRect.width/2,elementRect.top+elementRect.height/2],mappedScreen,unit:[unitX,unitY],distance:Math.hypot(x-coordinate[0],y-coordinate[1])};
    }).filter(item=>Number.isFinite(item.screen[0])&&Number.isFinite(item.screen[1]));
    const exactId=candidates.find(item=>targetPointId&&item.id===targetPointId);
    if(exactId)return exactId;
    const named=candidates.filter(item=>targetPointName&&item.name===targetPointName&&item.distance<=.2);
    return named.length===1?named[0]:null;
  },{boardId,coordinate,targetPointId,targetPointName});
}

async function dragPointByBaselineOffset(page,boardId,before,after,pointerDelta,targetPointId,targetPointName){
  if(!Array.isArray(pointerDelta)||pointerDelta.length!==2||pointerDelta.some(x=>!Number.isFinite(x)))throw Error('baseline fixture lacks a valid pointerDelta');
  let point=await locatePoint(page,boardId,before,targetPointId,targetPointName);
  if(!point||point.distance>.2)throw Error(`could not target baseline free ${boardId} input point: ${JSON.stringify({before,targetPointId,targetPointName,point})}`);
  let last;
  for(let attempt=0;attempt<3;attempt++){
    const dx=(after[0]-point.xy[0])*point.unit[0],dy=-(after[1]-point.xy[1])*point.unit[1];
    await page.mouse.move(point.screen[0],point.screen[1]);await page.mouse.down();
    for(let i=1;i<=12;i++)await page.mouse.move(point.screen[0]+dx*i/12,point.screen[1]+dy*i/12);
    await page.mouse.up();await page.waitForTimeout(100);
    last=await locatePoint(page,boardId,after,targetPointId,targetPointName);
    if(last&&last.distance<=1e-9)return {name:last.name,id:last.id,before:attempt===0?before:point.xy,after:last.xy,fixtureCoordinate:after.slice(),inputMethod:'pointer drag to baseline user-coordinate using JSXGraph board scale',baselinePointerDelta:pointerDelta.slice(),attempts:attempt+1,matchedTargetBy:last.id===targetPointId?'baseline JSXGraph id':'baseline label and initial coordinates'};
    if(!last)break;
    point=last;
  }
  throw Error(`JSXGraph pointer drag did not reach matched coordinate within 1e-9: ${JSON.stringify({before,after,pointerDelta,last})}`);
}

async function applyFixtureEdit(page,id,boardId,before,coordinate,pointerDelta,targetPointId,targetPointName){
  if(!targetPointId&&!targetPointName)throw Error(`baseline edit fixture for ${id} has no target id or label; refusing to guess which free point to edit`);
  return dragPointByBaselineOffset(page,boardId,before,coordinate,pointerDelta,targetPointId,targetPointName);
}

function readFixture(dataRoot,phase,id){
  const file=path.join(dataRoot,phase,'pilots',id,'edited.json');
  return JSON.parse(readFileSync(file,'utf8'));
}
module.exports={applyFixtureEdit,readFixture};
