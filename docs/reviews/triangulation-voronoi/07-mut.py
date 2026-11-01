import subprocess, shutil, re, sys
root='src/graphs/compgeo/'
G=root+'EarClippingGraph.tsx'; C=root+'EarClippingControls.tsx'; R=root+'earClippingRun.ts'
muts=[
 ('M1 trace draws one triangle too few', G, 'const objects = state.triangles.map(', 'const objects = state.triangles.slice(1).map('),
 ('M2 edit does not reset step', G, 'return this.patch({...patch, step: 0});', 'return patch;'),
 ('M3 class sizes reversed', R, 'triangles: triangles.length, diagonals: diagonalsOf(triangles, n).length, classSizes,', 'triangles: triangles.length, diagonals: diagonalsOf(triangles, n).length, classSizes: [...classSizes].reverse() as [number, number, number],'),
 ('M4 guard view ignores selection', G, 'return selected !== undefined && guards.includes(selected) ? selected : guards[0];', 'return guards[0];'),
 ('M5 collinear refusal gets not-simple text', C, 'case "collinear-vertices": return t("earclip_refusal_collinear");', 'case "collinear-vertices": return t("earclip_refusal_not_simple");'),
 ('M5b refusal still draws reflex markers', R, 'refusal, reversed: false, length: 0, totalPredicates: 0, triangles: [], colours: [], reflex: [],', 'refusal, reversed: false, length: 0, totalPredicates: 0, triangles: [], colours: [], reflex: [0],'),
 ('M5c refusal draws on (equivalent while a refusal has length 0 and no reflex: defence in depth)', G, 'if (run.refusal !== undefined || run.length === 0) return [];', 'if (run.length === 0 && run.reflex.length === 0) return [];'),
 ('M5d refusal reports length 1', R, 'refusal, reversed: false, length: 0,', 'refusal, reversed: false, length: 1,'),
 ('M5e refusal guard removed in drawOverlay', G, 'if (run.refusal !== undefined || run.length === 0) return [];', ''),
 ('M13 guard marker is a filled diamond again', G, 'face: "circle", size: i === shown ? 13 : 11, fillOpacity: 0,', 'face: "diamond", size: i === shown ? 13 : 11, fillOpacity: 0.8,'),
 ('M6 clockwise note hidden', C, '{traced && reversed &&', '{false && traced && reversed &&'),
 ('M7 preset drops step', G, 'const state: EarClippingGraphState = {...this.state, step: this.step};', 'const state: EarClippingGraphState = {...this.state, step: 0};'),
 ('M8 overlay label not localized', G, 'case "colouring": return t("earclip_overlay_colouring");', 'case "colouring": return "Colouring";'),
 ('M9 unmount does not dispose controller', G, '        this.controller.dispose();\n        this.controllerDisposed = true;\n        super.unmount();', '        super.unmount();'),
 ('M10 Play ticks skip a step', G, 'const next = Math.min(this.step + 1, Math.max(run.length - 1, 0));', 'const next = Math.min(this.step + (this.controller.isPlaying() ? 2 : 1), Math.max(run.length - 1, 0));'),
 ('M12 closed checkbox shown again', G, 'showsClosedToggle(): boolean {'+chr(10)+'        return false;', 'showsClosedToggle(): boolean {'+chr(10)+'        return true;'),
 ('M11 reversed polygon stored reversed back', G, 'const patch = raw.model ? {...raw, model: asClosedPolygon(raw.model)} : raw;', 'const patch = raw.model ? {...raw, model: asClosedPolygon({...raw.model, points: [...raw.model.points].sort((a, b) => a.x - b.x)})} : raw;'),
]
import os
only=sys.argv[1:]
for name,f,a,b in muts:
    if only and name.split()[0] not in only: continue
    s=open(f,encoding='utf8').read()
    if a not in s: print(name,'ANCHOR MISSING'); continue
    open(f,'w',encoding='utf8').write(s.replace(a,b,1))
    try:
        out=subprocess.run(['just','unit',root+'EarClippingGraph.host.test.tsx','--maxWorkers=2'],capture_output=True,text=True,encoding='utf8',errors='replace').stdout
    finally:
        open(f,'w',encoding='utf8').write(s)
    m=re.search(r'log (\.command-logs[^\s;]+)',out)
    out=open(m.group(1),encoding='utf8',errors='replace').read() if m else out
    fails=sorted(set(re.findall(r'^ FAIL .*? > (.{0,60})',out,re.M)))
    print(name,'->',len(fails),'failing:',[x[:50] for x in fails][:6])
