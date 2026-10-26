(() => {
  const $ = id => document.getElementById(id);
  const state = { kind: 'tensor', mesh: 'surface', iso: 8, tiling: 8, showIso: true, showNet: true, zMode: false, uv: [0.32, 0.44] };
  const owned = { board: null, inset: null, resize: null, points: [], objects: [], construction: [], insetObjects: [], net: [], grid: [], netKind: null, listeners: [], disposed: false, view: null };
  const binom = (n, k) => { let v = 1; for (let i = 1; i <= k; i++) v = v * (n - i + 1) / i; return v; };
  const mix = (a, b, t) => a.map((x, i) => x * (1 - t) + b[i] * t);
  function sampleControlLine(points, s) { const q=Math.max(0,Math.min(1,s))*3; return q>=3?[...points[3]]:mix(points[Math.floor(q)],points[Math.floor(q)+1],q%1); }
  const casteljau = (pts, t) => { let row = pts.map(p => [...p]); while (row.length > 1) row = row.slice(0, -1).map((p, i) => mix(p, row[i + 1], t)); return row[0]; };
  const tensorPreset = () => Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j) => {
    const x = (j - 1.5) * 2, y = (1.5 - i) * 2;
    return [x, y, 1.4 * Math.exp(-(x*x + y*y) / 8) + 0.16 * Math.sin(i * 1.5 + j)];
  }));
  const triPreset = () => [[-3,-2,0],[-1,-2,1.6],[1,-2,0],[3,-2,-0.2],[-2,0,1], [0,0,2.2],[2,0,0.7],[-1,2,0],[1,2,1.4],[0,4,0.2]];
  function evalTensor(net, u, v) {
    const bernstein = (n,i,t) => binom(n,i)*Math.pow(1-t,n-i)*Math.pow(t,i);
    return [0,1,2].map(d=>net.reduce((sum,row,i)=>sum+row.reduce((rowSum,p,j)=>rowSum+bernstein(3,i,u)*bernstein(3,j,v)*p[d],0),0));
  }
  function evalTri(net, u, v) {
    const w = 1-u-v, n = 3; let p = [0,0,0], idx = 0;
    for (let i=n; i>=0; i--) for (let j=n-i; j>=0; j--) {
      const k=n-i-j, coeff=binom(n,i)*binom(n-i,j)*Math.pow(u,i)*Math.pow(v,j)*Math.pow(w,k);
      for (let d=0; d<3; d++) p[d] += coeff*net[idx][d]; idx++;
    }
    return p;
  }
  function triangularIsoFamilies(evaluateAt) {
    return [t=>s=>evaluateAt(t,s*(1-t)),t=>s=>evaluateAt(s*(1-t),t),t=>s=>evaluateAt(s*(1-t),(1-s)*(1-t))];
  }
  const evaluate = (u,v,offset=[0,0,0]) => {
    const p = state.kind === 'tensor' ? evalTensor(owned.grid,u,v) : evalTri(owned.net,u,v);
    return p.map((x,i)=>x+offset[i]);
  };
  function assertMath() {
    const tn=tensorPreset(), tr=triPreset(), u=.37,v=.41;
    const tensorConstruction=casteljau(tn.map(row=>casteljau(row,v)),u);
    const simplexConstruction=(net,bu,bv) => {
      let degree=3, rows=new Map(), pos=0;
      for(let i=degree;i>=0;i--) for(let j=degree-i;j>=0;j--){const k=degree-i-j;rows.set(`${i},${j},${k}`,net[pos++]);}
      const bw=1-bu-bv;
      while(degree>0){const next=new Map();for(let i=degree-1;i>=0;i--)for(let j=degree-1-i;j>=0;j--){const k=degree-1-i-j;next.set(`${i},${j},${k}`,rows.get(`${i+1},${j},${k}`).map((x,d)=>bu*x+bv*rows.get(`${i},${j+1},${k}`)[d]+bw*rows.get(`${i},${j},${k+1}`)[d]));}rows=next;degree--;}
      return rows.values().next().value;
    };
    const a=evalTensor(tn,u,v), b=evalTri(tr,.21,.31);
    if (a.some((x,i)=>Math.abs(x-tensorConstruction[i])>1e-10)) throw Error('Tensor Bernstein and nested de Casteljau differ');
    const triConstruction=simplexConstruction(tr,.21,.31);
    if(b.some((x,i)=>Math.abs(x-triConstruction[i])>1e-10)) throw Error('Triangular Bernstein and simplex de Casteljau differ');
    return {tensorError:Math.max(...a.map((x,i)=>Math.abs(x-tensorConstruction[i]))), triangularError:Math.max(...b.map((x,i)=>Math.abs(x-triConstruction[i])))};
  }
  function cleanList(list) { for (const o of list.splice(0)) { try { if(o.is3D)owned.view?.removeObject(o);else o.board?.removeObject(o); } catch {} } }
  function teardown() {
    if (owned.disposed) return;
    owned.disposed = true; owned.resize?.disconnect(); owned.resize = null;
    for (const [node,event,fn] of owned.listeners.splice(0)) node.removeEventListener(event,fn);
    try { if (owned.board) JXG.JSXGraph.freeBoard(owned.board); } catch {}
    try { if (owned.inset) JXG.JSXGraph.freeBoard(owned.inset); } catch {}
    owned.board = owned.inset = owned.view = null; owned.points = []; owned.objects = []; owned.construction = []; owned.insetObjects = []; owned.net = []; owned.grid = []; owned.netKind = null;
    return true;
  }
  function setupBoard() {
    owned.disposed = false;
    const board = JXG.JSXGraph.initBoard('main-board',{boundingbox:[-8,8,8,-8],axis:false,showcopyright:false,shownavigation:false,pan:{enabled:false},zoom:{enabled:false}});
    owned.board = board;
    const view = board.create('view3d',[[-6,-5],[12,10],[[-5,5],[-5,5],[-2.5,3.5]]],{az:{value:0.8},el:{value:0.5},xPlaneRear:{visible:false},yPlaneFront:{visible:false},zPlaneFront:{visible:false}});
    owned.view = view;
    owned.resize = new ResizeObserver(entries => { const r=entries[0]?.contentRect; if(r?.width>0 && r?.height>0 && owned.board===board) board.resizeContainer(r.width,r.height,true); });
    owned.resize.observe($('main-board'));
    const inset = JXG.JSXGraph.initBoard('domain-board',{boundingbox:[-0.08,1.08,1.08,-0.08],axis:false,showcopyright:false,shownavigation:false,keepaspectratio:true,pan:{enabled:false},zoom:{enabled:false}});
    owned.inset=inset;
    inset.create('polygon',[[0,0],[1,0],[1,1],[0,1]],{fillColor:'#eef3e8',fillOpacity:.3,vertices:{visible:false},borders:{strokeColor:'#aab6a3',dash:2}});
    inset.create('polygon',[[0,0],[1,0],[0,1]],{fillColor:'#eef3e8',fillOpacity:.3,vertices:{visible:false},borders:{strokeColor:'#78906b',dash:2}});
    const ip=inset.create('point',[state.uv[0],state.uv[1]],{name:'(u,v)',size:4,fillColor:'#bc7438',strokeColor:'#6d3e1e',withLabel:true,highlight:false});
    owned.insetObjects.push(ip);
    const changeUv = () => { let [u,v]=ip.coords.usrCoords.slice(1); u=Math.max(0,Math.min(1,u)); v=Math.max(0,Math.min(1,v)); if(state.kind==='triangular' && u+v>1){const q=u+v;u/=q;v/=q;} state.uv=[u,v]; ip.moveTo([u,v]); rebuildConstruction(); $('uv-label').textContent=`u=${u.toFixed(3)}, v=${v.toFixed(3)}${state.kind==='triangular'?`, w=${(1-u-v).toFixed(3)}`:''}`; };
    ip.on('drag',changeUv); ip.on('up',changeUv); owned.listeners.push([inset.containerObj,'pointerup',changeUv]);
    rebuild();
    return true;
  }
  function addLine(points, attrs={}) { const c=owned.view.create('curve3d',[t=>points(t)[0],t=>points(t)[1],t=>points(t)[2],[0,1]],{strokeColor:'#465646',strokeWidth:1.4,...attrs}); owned.objects.push(c); return c; }
  function buildSurface(offset=[0,0,0]) {
    const [uN,vN]=[Math.max(2,state.tiling),Math.max(2,state.tiling)];
    if(state.kind==='tensor' || state.mesh==='surface') {
      const surf=owned.view.create('parametricsurface3d',[state.kind==='triangular'?(s,t)=>evaluate(s*(1-t),s*t,offset):(u,v)=>evaluate(u,v,offset),[0,1],[0,1]],{strokeColor:'#bd8253',strokeWidth:.4,fillColor:'#dcae78',fillOpacity:.6,stepsU:uN,stepsV:vN,highlight:false}); owned.objects.push(surf);
    } else {
      const n=state.tiling, pts=[];
      for(let i=0;i<=n;i++){pts[i]=[];for(let j=0;j<=n-i;j++){const point=owned.view.create('point3d',[()=>evaluate(i/n,j/n,offset)],{visible:false,withLabel:false,fixed:true});pts[i][j]=point;owned.objects.push(point);}}
      for(let i=0;i<n;i++) for(let j=0;j<n-i;j++) {
        const a=pts[i][j], b=pts[i+1][j], c=pts[i][j+1];
        owned.objects.push(owned.view.create('polygon3d',[a,b,c],{fillColor:'#dcae78',fillOpacity:.58,strokeColor:'#bd8253',strokeWidth:.35,highlight:false}));
        if(j<n-i-1) owned.objects.push(owned.view.create('polygon3d',[b,pts[i+1][j+1],c],{fillColor:'#dcae78',fillOpacity:.58,strokeColor:'#bd8253',strokeWidth:.35,highlight:false}));
      }
    }
  }
  function buildTeapot() {
    const data=window.BezierTeapotData;
    if(!data||data.teapotPatches.length!==512||data.teapotVertices.length!==870)throw Error('Reviewed 32-patch teapot data is unavailable');
    for(let i=0;i<32;i++) { const flat=data.resolvePatch(i,{fitLid:false,blinn:true,displaySpace:false}),net=Array.from({length:4},(_,r)=>flat.slice(r*4,r*4+4)); const surf=owned.view.create('parametricsurface3d',[(u,v)=>evalTensor(net,u,v),[0,1],[0,1]],{strokeColor:'#bd8253',strokeWidth:.4,fillColor:'#dcae78',fillOpacity:.6,stepsU:Math.max(2,state.tiling),stepsV:Math.max(2,state.tiling),highlight:false}); owned.objects.push(surf); if(i===0&&state.showNet){for(const row of net)addLine(s=>sampleControlLine(row,s),{strokeColor:'#526950',dash:2});for(let j=0;j<4;j++)addLine(s=>sampleControlLine(net.map(row=>row[j]),s),{strokeColor:'#526950',dash:2});} }
  }
  function rebuild() {
    if(!owned.board || owned.disposed) return;
    $('domain-board').hidden=state.kind==='teapot';
    owned.board.suspendUpdate();
    cleanList(owned.objects); cleanList(owned.points);
    if(state.kind==='teapot') { cleanList(owned.construction); owned.net=[]; owned.grid=[]; owned.netKind='teapot'; $('uv-label').textContent='32 patches; no single parameter domain'; buildTeapot(); updateReadout(); owned.board.unsuspendUpdate(); return; }
    if(owned.netKind!==state.kind || !owned.net.length) {
      if(state.kind==='tensor'){owned.grid=tensorPreset();owned.net=owned.grid.flat();}else{owned.net=triPreset();owned.grid=[];}
      owned.netKind=state.kind;
    }
    buildSurface();
    const n=state.kind==='tensor'?4:10;
    if(state.showIso) {
      for(let i=0;i<=state.iso;i++) { const t=i/state.iso;
        if(state.kind==='tensor') {
          addLine(s=>evaluate(t,s)); addLine(s=>evaluate(s,t));
        } else {
          for(const family of triangularIsoFamilies(evaluate)) addLine(family(t));
        }
      }
    }
    const boundaries=state.kind==='tensor'?[[s=>evaluate(0,s)],[s=>evaluate(1,s)],[s=>evaluate(s,0)],[s=>evaluate(s,1)]]:[[s=>evaluate(s,0)],[s=>evaluate(1-s,s)],[s=>evaluate(0,1-s)]];
    for(const [fn] of boundaries) addLine(fn,{strokeColor:'#643f2f',strokeWidth:2.5});
    if(state.showNet) {
      const rows=state.kind==='tensor'?owned.grid:[];
      if(state.kind==='tensor') {
        rows.forEach((row,i)=>addLine(s=>sampleControlLine(row,s),{strokeColor:'#526950',dash:2}));
        for(let j=0;j<4;j++) addLine(s=>sampleControlLine(owned.grid.map(row=>row[j]),s),{strokeColor:'#526950',dash:2});
      } else {
        const lookup=new Map();let nidx=0;for(let i=3;i>=0;i--)for(let j=3-i;j>=0;j--){const k=3-i-j;lookup.set(`${i},${j},${k}`,nidx++);}
        for(let i=3;i>=0;i--)for(let j=3-i;j>=0;j--){const k=3-i-j,from=lookup.get(`${i},${j},${k}`);for(const key of [`${i-1},${j+1},${k}`,`${i-1},${j},${k+1}`,`${i},${j-1},${k+1}`]){const to=lookup.get(key);if(to!==undefined && from<to)addLine(s=>mix(owned.net[from],owned.net[to],s),{strokeColor:'#526950',dash:2});}}
      }
      owned.net.forEach((p,i)=>{ const point=owned.view.create('point3d',[p[0],p[1],p[2]],{name:String(i+1),size:3.8,fillColor:'#7d9d61',strokeColor:'#385239',withLabel:true,highlightFillColor:'#d67b36'}); const input=point.element2D; let dragStart=null; input.on('down',evt=>{dragStart={xyz:[point.X(),point.Y(),point.Z()],y:evt?.clientY};}); input.on('drag',evt=>{let xyz=[point.X(),point.Y(),point.Z()];if(dragStart){if(state.zMode&&Number.isFinite(dragStart.y)&&Number.isFinite(evt?.clientY)){const dz=(dragStart.y-evt.clientY)*10/Math.max(owned.board.containerObj.clientHeight,1);xyz=[dragStart.xyz[0],dragStart.xyz[1],dragStart.xyz[2]+dz];point.setPosition(xyz);}else if(!state.zMode) {xyz[2]=dragStart.xyz[2];point.setPosition(xyz);}}owned.net[i]=xyz;if(state.kind==='tensor')owned.grid[Math.floor(i/4)][i%4]=xyz;owned.board.suspendUpdate();if(state.kind==='triangular'&&state.mesh==='mesh'){for(const object of owned.objects)if(object.elType==='point3d'&&!owned.points.includes(object))object.update().updateVisibility();for(const object of owned.objects)if(object.elType==='polygon3d')object.element2D?.prepareUpdate().update().updateRenderer();}rebuildConstruction();owned.board.unsuspendUpdate();updateReadout();}); input.on('up',()=>{dragStart=null;}); owned.points.push(point); });
    }
    rebuildConstruction(); updateReadout(); owned.board.unsuspendUpdate();
  }
  function rebuildConstruction() {
    if(!owned.board || owned.disposed) return;
    if(state.kind==='teapot') return;
    cleanList(owned.construction);
    const [u,v]=state.uv, p=evaluate(u,v);
    $('uv-label').textContent=`u=${u.toFixed(3)}, v=${v.toFixed(3)}${state.kind==='triangular'?`, w=${(1-u-v).toFixed(3)}`:''}`;
    const dot=(q,label='')=>owned.construction.push(owned.view.create('point3d',q,{name:label,size:label?4:2.5,fillColor:label?'#ca5c37':'#e3a364',strokeColor:'#71341f',withLabel:!!label}));
    const segment=(a,b)=>owned.construction.push(owned.view.create('curve3d',[t=>mix(a,b,t)[0],t=>mix(a,b,t)[1],t=>mix(a,b,t)[2],[0,1]],{strokeColor:'#c45f3b',dash:2,strokeWidth:1.5}));
    if(state.kind==='tensor') {
      const rowEnds=owned.grid.map(row=>{let level=row.map(q=>[...q]);while(level.length>1){for(let i=0;i<level.length-1;i++){segment(level[i],level[i+1]);const next=mix(level[i],level[i+1],v);dot(next);level[i]=next;}level.pop();}return level[0];});
      let level=rowEnds; while(level.length>1){for(let i=0;i<level.length-1;i++){segment(level[i],level[i+1]);const next=mix(level[i],level[i+1],u);dot(next);level[i]=next;}level.pop();}
    } else {
      let degree=3, level=new Map(),pos=0;for(let i=degree;i>=0;i--)for(let j=degree-i;j>=0;j--){const k=degree-i-j;level.set(`${i},${j},${k}`,owned.net[pos++]);}
      const w=1-u-v;
      while(degree>0){const next=new Map();for(let i=degree-1;i>=0;i--)for(let j=degree-1-i;j>=0;j--){const k=degree-1-i-j,a=level.get(`${i+1},${j},${k}`),b=level.get(`${i},${j+1},${k}`),c=level.get(`${i},${j},${k+1}`);segment(a,b);segment(b,c);segment(c,a);const q=a.map((x,d)=>u*x+v*b[d]+w*c[d]);next.set(`${i},${j},${k}`,q);dot(q);}level=next;degree--;}
    }
    dot(p,'P(u,v)');
  }
  function boardCounts() {
    const objects=Object.values(owned.board?.objects||{}), count={objects:objects.length,points3d:objects.filter(o=>o.elType==='point3d').length,curves3d:objects.filter(o=>o.elType==='curve3d').length,polygons3d:objects.filter(o=>o.elType==='polygon3d').length,surfaces3d:objects.filter(o=>o.elType==='surface3d').length};
    return count;
  }
  function updateReadout() {
    const count=boardCounts();
    $('readout').textContent=JSON.stringify({ready:!!owned.board&&!owned.disposed,kind:state.kind,triangularRenderer:state.mesh,iso:state.iso,tiling:state.tiling,teapotPatches:state.kind==='teapot'?32:0,netCount:owned.net.length,uv:state.uv,pointCount:owned.points.length,counts:count},null,2);
  }
  function setCamera(name) { const a={front:[0,0],top:[0,Math.PI/2-.03],side:[Math.PI/2,.05],isometric:[Math.PI/4,.6]}[name]; if(!a||!owned.view)return; owned.view.az_slide.setValue(a[0]); owned.view.el_slide.setValue(a[1]); owned.board.fullUpdate(); }
  function snapshot() { return {ready:!!owned.board&&!owned.disposed,kind:state.kind,net:owned.net.map(p=>[...p]),uv:[...state.uv],camera:owned.view?{az:owned.view.az_slide.Value(),el:owned.view.el_slide.Value()}:null,counts:boardCounts(),disposed:owned.disposed}; }
  function editPoint(index,xyz) { const point=owned.points[index]; if(!point) throw Error('Unknown point index'); if(!Array.isArray(xyz)||xyz.length!==3||!xyz.every(Number.isFinite))throw Error('Expected three finite coordinates'); point.setPosition(xyz); owned.net[index]=xyz.slice(); if(state.kind==='tensor')owned.grid[Math.floor(index/4)][index%4]=xyz.slice(); owned.board.fullUpdate(); rebuildConstruction(); return snapshot(); }
  function exportSvgMarkup() {
    const svg=document.querySelector('#main-board svg'); if(!svg) throw Error('JSXGraph SVG renderer not active');
    const rect=svg.getBoundingClientRect(), clone=svg.cloneNode(true), ns='http://www.w3.org/2000/svg';
    for(const label of document.querySelectorAll('#main-board .JXGtext')) {
      const value=label.textContent.trim(), box=label.getBoundingClientRect(), style=getComputedStyle(label);
      if(!value||box.width<=0||box.height<=0||style.display==='none'||style.visibility==='hidden') continue;
      const text=document.createElementNS(ns,'text'), centered=style.textAlign==='center';
      text.setAttribute('x',String(box.left-rect.left+(centered?box.width/2:0)));
      text.setAttribute('y',String(box.top-rect.top+Math.min(box.height-1,parseFloat(style.fontSize)||12)));
      text.setAttribute('fill',style.color); text.setAttribute('font-size',style.fontSize); text.setAttribute('font-family',style.fontFamily);
      text.setAttribute('text-anchor',centered?'middle':'start'); text.textContent=value; clone.appendChild(text);
    }
    return new XMLSerializer().serializeToString(clone);
  }
  function exportSvg() { const blob=new Blob([exportSvgMarkup()],{type:'image/svg+xml'}); download(blob,'bezier-patch.svg'); }
  function download(blob,name) { const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  async function exportPng() { const svg=document.querySelector('#main-board svg'); if(!svg) throw Error('JSXGraph SVG renderer not active'); const url=URL.createObjectURL(new Blob([exportSvgMarkup()],{type:'image/svg+xml'})); const img=new Image(); await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url;}); const canvas=document.createElement('canvas');canvas.width=svg.clientWidth*2;canvas.height=svg.clientHeight*2;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);const blob=await new Promise(ok=>canvas.toBlob(ok));if(!blob)throw Error('Could not encode PNG export');download(blob,'bezier-patch.png'); }
  function bind(node,event,fn){node.addEventListener(event,fn);}
  function remount() { teardown(); setTimeout(setupBoard,0); }
  function init() {
    const math=assertMath(); setupBoard();
    bind($('kind'),'change',e=>{state.kind=e.target.value;state.uv=[.32,state.kind==='triangular'?.35:.44];rebuild();});
    bind($('triangle-renderer'),'change',e=>{state.mesh=e.target.value;rebuild();}); bind($('iso'),'change',e=>{state.iso=+e.target.value;rebuild();}); bind($('tiling'),'change',e=>{state.tiling=+e.target.value;rebuild();});
    bind($('show-iso'),'change',e=>{state.showIso=e.target.checked;rebuild();}); bind($('show-net'),'change',e=>{state.showNet=e.target.checked;rebuild();}); bind($('z-mode'),'change',e=>state.zMode=e.target.checked);
    for(const button of document.querySelectorAll('[data-view]'))bind(button,'click',()=>setCamera(button.dataset.view)); bind($('reset'),'click',()=>setCamera('isometric')); bind($('remount'),'click',remount);
    bind($('export-svg'),'click',exportSvg);bind($('export-png'),'click',()=>exportPng().catch(e=>alert(e.message)));
    bind($('presentation'),'click',()=>{document.body.classList.toggle('presentation');owned.board?.resizeContainer($('main-board').clientWidth,$('main-board').clientHeight,true);});
    bind($('stress'),'click',()=>{$('kind').value='teapot';state.kind='teapot';rebuild();});bind($('clear-stress'),'click',()=>{$('kind').value='tensor';state.kind='tensor';state.uv=[.32,.44];rebuild();});
    bind($('main-board'),'keydown',e=>{if(!owned.view||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const az=owned.view.az_slide.Value()+(e.key==='ArrowLeft'?.08:e.key==='ArrowRight'?-.08:0),el=owned.view.el_slide.Value()+(e.key==='ArrowUp'?.06:e.key==='ArrowDown'?-.06:0);owned.view.az_slide.setValue(az);owned.view.el_slide.setValue(el);owned.board.fullUpdate();});
    bind($('main-board'),'pointerdown',()=>{$('main-board').focus({preventScroll:true});});
    bind(window,'resize',()=>{owned.board?.resizeContainer($('main-board').clientWidth,$('main-board').clientHeight,true);owned.inset?.resizeContainer($('domain-board').clientWidth,$('domain-board').clientHeight,true);});
    window.BezierPatchSpike={ready:()=>!!owned.board&&!owned.disposed,snapshot,editPoint,pointInfo(i){const p=owned.points[i];return p?{id:p.id,xyz:[p.X(),p.Y(),p.Z()],x2d:p.element2D?.X(),y2d:p.element2D?.Y(),draggable:p.element2D?.draggable?.(),fixed:p.element2D?.visProp?.fixed,parents:p.element2D?.getParents?.()}:null;},setParameter(u,v){state.uv=[u,v];rebuildConstruction();owned.board.fullUpdate();return snapshot();},camera:setCamera,counts:()=>snapshot().counts,dispose:teardown,remount,assertMath};
    $('readout').textContent += `\nmath assertions: ${JSON.stringify(math)}`;
  }
  try { init(); } catch(e) { document.body.insertAdjacentHTML('beforeend',`<pre style="color:red">Prototype failed: ${e.stack}</pre>`); throw e; }
})();
