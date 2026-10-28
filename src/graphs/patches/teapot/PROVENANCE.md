# Utah teapot patch data

The `teapotPatches` and `teapotVertices` literals in `utahTeapot.ts` are copied from three.js `examples/jsm/geometries/TeapotGeometry.js` at commit `0af9729d0c143a86a1d725d6e2c3ad83301f3f34` (release r180): https://raw.githubusercontent.com/mrdoob/three.js/0af9729d0c143a86a1d725d6e2c3ad83301f3f34/examples/jsm/geometries/TeapotGeometry.js

The source attributes the dataset to Martin Newell's Utah teapot database and says its implementation is based on SPD software. The following notice is retained from the three.js source and applies to this copied material:

```text
The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

SHA-256 of the pinned source file: `31ce94a5efe7ff4dbda886b258bcab5a16e2d0e329c9f041eddf3007d2783401`. SHA-256 of its license file: `bfe119ea4fd413f5f7ca3fcd63adb0c4a073ed39daa2fe7d3e6b769e21272601`.

The production adapter preserves the raw source coordinates and `(u,v)` row/column order. It selects `blinn: true`, `fitLid: false`, and no display-space transform; the result remains z-up in the app's source coordinate space. No point is moved or merged.
