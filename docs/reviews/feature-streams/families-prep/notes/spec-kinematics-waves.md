# Note: kinematics and waves specs (worker)

Numbers computed with node scripts (k.js, w.js, run 2026-11-10). Output:

## Kinematics
```
cyc t=0 {"r":[0,0],"v":[0,0],"a":[0,1],"speed":0,"amag":1}
cyc t=1.5707963267948966 {"r":[0.5707963267948966,0.9999999999999999],"v":[0.9999999999999999,1],"a":[1,6.123233995736766e-17],"speed":1.414213562373095,"amag":1}
cyc t=3.141592653589793 {"r":[3.141592653589793,2],"v":[2,1.2246467991473532e-16],"a":[1.2246467991473532e-16,-1],"speed":2,"amag":1}
K5 t=pi/2 {"s":1.414213562373095,"aT":0.7071067811865476,"aN":-0.7071067811865475,"kappa":-0.3535533905932738,"kv2":-0.7071067811865475,"amag2":1}
K5 t=pi {"s":2,"aT":6.123233995736766e-17,"aN":-1,"kappa":-0.25,"kv2":-1,"amag2":1,"Rcurv":4}
K5 t=1 {"s":0.9588510772084059,"aT":0.8775825618903728,"aN":-0.479425538604203,"kappa":-0.5214574107333722,"kv2":-0.47942553860420295,"amag2":1,"v":[0.45969769413186023,0.8414709848078965],"a":[0.8414709848078965,0.5403023058681398]}
K2 t=0.0000 {"th":0,"speed":1.5,"aT":0,"aN":2.25,"kappa":1}
K2 t=1.5708 {"th":2.0707963267948966,"speed":1,"aT":-0.5,"aN":1,"kappa":1}
K2 t=3.1416 {"th":3.141592653589793,"speed":0.5,"aT":-6.123233995736766e-17,"aN":0.25,"kappa":1}
K2 t at quarter turn (b=.5) vs uniform [1.1206127155000227,1.5707963267948966]
K2 path length 0..2pi [6.283185307179559,6.283185307179586]
K3 30 {"vx":17.320508075688775,"vy":9.999999999999998,"T":2.0387359836901116,"range":35.311943069701876,"rangeFormula":35.311943069701876,"H":5.096839959225279,"tApex":1.0193679918450558,"tan":0.5773502691896257,"coefx2":-0.016349999999999996}
K3 45 {"vx":14.142135623730951,"vy":14.14213562373095,"T":2.8832080782326095,"range":40.77471967380224,"rangeFormula":40.77471967380224,"H":10.19367991845056,"tApex":1.4416040391163047,"tan":0.9999999999999999,"coefx2":-0.024524999999999995}
K3 60 {"vx":10.000000000000002,"vy":17.32050807568877,"T":3.5311943069701877,"range":35.31194306970188,"rangeFormula":35.31194306970188,"H":15.290519877675838,"tApex":1.7655971534850938,"tan":1.7320508075688767,"coefx2":-0.04904999999999998}
K3 apex curvature/radius {"k":0.049049999999999996,"R":20.387359836901123,"speedApex":14.142135623730951}
K3 t=1 (45deg) {"r":[14.142135623730951,9.23713562373095],"v":[14.142135623730951,4.3321356237309505],"speed":14.79078764171803,"y_param":9.23713562373095,"y_formula":9.23713562373095}
K4 {"T":4,"v":3.141592653589793,"ac":4.934802200544679,"vv":4.934802200544679,"r1":[1.2246467991473532e-16,2],"v1":[-3.141592653589793,1.9236706937217898e-16],"a1":[-3.021694859661178e-16,-4.934802200544679],"w2":{"ac":19.739208802178716,"v":6.283185307179586},"R2":{"ac":9.869604401089358,"v":6.283185307179586},"sameV_R2":2.4674011002723395}
```
## Waves
```
W1 {"A1":1,"A2":1,"dphi":0,"amp":2,"numericMax":2,"phaseDeg":0}
W1 {"A1":1,"A2":1,"dphi":120,"amp":1.0000000000000002,"numericMax":0.9999999997806761,"phaseDeg":59.99999999999999}
W1 {"A1":1,"A2":1,"dphi":180,"amp":0,"numericMax":1.0269562977782698e-15,"phaseDeg":90}
W1 {"A1":3,"A2":2,"dphi":90,"amp":3.605551275463989,"numericMax":3.6055512745817024,"phaseDeg":33.690067525979785}
W1 {"A1":3,"A2":2,"dphi":60,"amp":4.358898943540674,"numericMax":4.358898942623216,"phaseDeg":23.41322444637054}
W2 {"df":2,"fmean":11,"beatPeriod":0.5,"env0":2,"env025":1.2246467991473532e-16,"env05":2,"maxIdentityErr":6.850076061937216e-14,"s0":2,"s025":0,"peakCountIn1s":2}
W2 df=1 {"beatPeriod":1,"env05":1.2246467991473532e-16}
W3 {"lambda":2,"period":1,"maxErr":1.1102230246251565e-15,"nodes":[0,1,2],"antinodes":[0.5,1.5],"ampAtAnti":2,"f_0_5_quarterPeriod":1.2246467991473532e-16,"f_at_node":-7.568733460868299e-17}
W4 {"f0":9,"fs":12,"alias":3,"signed":{"amb":false,"f":-3}}
W4 {"f0":23,"fs":24,"alias":1,"signed":{"amb":false,"f":-1}}
W4 {"f0":25,"fs":24,"alias":1,"signed":{"amb":false,"f":1}}
W4 {"f0":12,"fs":24,"alias":12,"signed":{"amb":true,"f":12}}
W4 {"f0":13,"fs":24,"alias":11,"signed":{"amb":false,"f":-11}}
W4 {"f0":5,"fs":12,"alias":5,"signed":{"amb":false,"f":5}}
W4 {"f0":6,"fs":12,"alias":6,"signed":{"amb":true,"f":6}}
W4 {"f0":40,"fs":64,"alias":24,"signed":{"amb":false,"f":-24}}
W4 {"f0":30,"fs":64,"alias":30,"signed":{"amb":false,"f":30}}
W4 {"f0":7,"fs":10,"alias":3,"signed":{"amb":false,"f":-3}}
W4 samples cos 9Hz vs 3Hz fs=12 phase .4 max diff 0.7788366846173214
W4 23 vs -1 @24 6.850076061937216e-14
W4 border f0=6 fs=12 {"sinSamples":[0,1.2246467991473532e-16,-2.4492935982947064e-16,3.6739403974420594e-16],"cosSamples":[1,-1,1,-1]}
draw {"perPeriod":51.2,"maxDev":0.001882477646081802,"dth":0.1227184630308513}
draw empirical 0.001881745397213419
W5 sinc N=12 (mid-window err) 0.025303289527046746
W5 sinc N=48 (mid-window err) 0.008582145403546626
W5 sinc N=192 (mid-window err) 0.002339280433035884
W5 linear interp max err f0=5 fs=12 0.7346529074317978
W5 f0 wheel {"rate_shown":{"amb":false,"f":-1}}
samples per period {"fs12_f5":2.4,"fs12_f9":1.3333333333333333,"fs24_f23":1.0434782608695652}
```

Notes: W4 test 9 Hz vs +3 Hz same phase differs (0.78) as expected; the signed alias -3 Hz is the correct match (cos even/odd phase flip). PIK: kinematics §4.13 p.21 (anchor for derivative, tangent/normal, modelling; vector kinematics = enrichment); waves §4.10.9 p.19 (product factoring, transformations, applied); sampling = enrichment. Unverified: VR level markers; Slovenian terms beyond app usage; the physics terms are not source-checked.

## Repair round (2026-11-10)
Cycloid closed forms a_T=cos(t/2), a_N=-sin(t/2) at t=pi/2,pi,1:
1.5707963267948966 0.7071067811865476 -0.7071067811865475
3.141592653589793 6.123233995736766e-17 -1
1 0.8775825618903728 -0.479425538604203
Outputs of /tmp/r.js (peak-miss bound 1.18e-6 at 1 Hz, 1.88e-3 at 40 Hz; chord error at 100 Hz 0.011765; linear interp max 0.71829 phase 0 / 0.73465 phase 0.4; sinc max over [0.4,0.6] phase 0.4: 0.02530, 0.008583, 0.002339 for M=12,48,192 (phase 0: 1.8e-4, 5.6e-5, 5.3e-6); f=fs/2 samples cos(pi n+0.4)=+-0.92106).
