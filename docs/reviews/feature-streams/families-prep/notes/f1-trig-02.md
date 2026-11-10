# f1-trig-02 notes

Mutations (observed failures): SSA tolerance (+1e-3 on a vs h) fails oracle test (a=2.25,b=3.5,A=40 expected 0 to be 2); cosine rhs sign flip fails 2 TR4 tests; antipode 2O+B fails 3 TR3 tests; tie 2a=b+1 fails 3 solver tests (default SSA, enumeration, tie). SSS area /16 slip failed SSS 5,6,7. Whole src/trig, tsc, lint green after restore. SSA enumeration test total file time about 2s (test 240ms when failing early).
