import subprocess,sys,re
L='docs/reviews/feature-streams/geometry/12-mutations.log'
T='src/graphs/compgeo/BentleyOttmannLessonActions.host.test.tsx'
muts=[
 ('clamp removed (setTraceStep)','src/graphs/compgeo/BentleyOttmannGraph.tsx','step: this.run().clamp(step)}','step}'),
 ("'end' off by one (helper)",'src/graphs/compgeo/traceLessonActions.ts','runLength - 1 : requested','runLength : requested'),
 ('next-step command does nothing (helper)','src/graphs/compgeo/traceLessonActions.ts','if (command === "next-step") controls.nextStep();','if (command === "next-step") controls.pause();'),
 ('Back does not pause','src/graphs/compgeo/BentleyOttmannGraph.tsx','protected override stopLessonAnimations(): void {\n        this.pause();','protected override stopLessonAnimations(): void {\n        void 0;'),
 ('edit leaves controller playing','src/graphs/compgeo/BentleyOttmannGraph.tsx','this.controller.reset(namedStep ? this.step : 0);','void 0;'),
 ('lesson first swap step 16 -> 15','src/learning/content/compgeoGuidedLessons.ts','firstSwap: 16','firstSwap: 15'),
 ('lesson view top of default example','src/learning/content/compgeoGuidedLessons.ts','Math.max(...ys) + 1,','Math.max(...ys),'),
 ('lesson degenerate step 15 -> 14','src/learning/content/compgeoGuidedLessons.ts','degenerateSwap: 15','degenerateSwap: 14'),
]
out=open(L,'a',encoding='utf8')
for name,f,a,b in muts:
    s=open(f,encoding='utf8',newline='').read()
    if a not in s: out.write(f'MUTATION NOT APPLIED: {name}\n'); continue
    open(f,'w',encoding='utf8',newline='').write(s.replace(a,b,1))
    try:
        r=subprocess.run('just unit '+T,shell=True,capture_output=True,text=True,encoding="utf-8",errors="replace",timeout=900)
        txt=(r.stdout or "")+(r.stderr or "")
    finally:
        open(f,'w',encoding='utf8',newline='').write(s)
    fails=sorted(set(re.findall(r'(?:FAIL|×)\s+[^\n]*?>\s*([^\n]+)',txt)))
    summ=[l for l in txt.splitlines() if l.startswith('unit:')]
    out.write(f'## {name}\nexit={r.returncode} {summ[:1]}\nfailing: {fails[:6]}\n\n'); out.flush()
