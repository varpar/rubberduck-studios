# Water rendering architecture

The site keeps one React Three Fiber canvas behind the landing page and camera
dive transitions. The water uses analytic waves and a custom shader; it does
not run a height-field simulation or ray tracer.

## Rendering model

`StylizedWater.tsx` combines three directional waves, duck hull displacement,
speed-dependent wakes, Fresnel reflectance, absorption, depth coloring, and an
underwater Snell-window approximation. Four shared interaction slots carry duck
positions and motion into shader uniforms without React updates. The full
water path also retains four recent wake impulses per duck.

Reflections in the water are a **procedural sky and sun**, not a planar mirror
of the surrounding models. The separate scene capture provides screen-space
**refraction**, so off-camera objects cannot appear through the water. The HDR
environment supplies lighting and reflections to the scene's compatible
materials; it is not sampled by the custom water shader. These are retained
limitations, not new optimizations.

Caustics and light shafts provide underwater lighting cues. Both are hidden
on the home view. Coarse-pointer or hardware-constrained devices use static
procedural caustics; other devices sample the shared water normal texture.

## Current water settings

| Setting | Full water path | Optical fallback |
| --- | --- | --- |
| Grid cells | 52 × 33 | 26 × 17 |
| Grid vertices | 1,802 | 486 |
| Original world-space spacing | 0.5 units | 80 / 72 units |
| Normal detail | Two tiled normal-map samples | Procedural detail waves; no normal-map download |
| Refraction capture | CSS dimensions × min(canvas DPR, 1.5), each dimension capped at 2,048 px; minimum 192 × 128 | None |
| Capture cadence | Initially every 2 frames; adaptive every 1–3 frames | None |
| Capture storage | RGBA8, sRGB texture, depth buffer, linear filtering; no MSAA, mipmaps, or stencil | None |
| Historical wake rings | Enabled | Omitted; hull and motion wakes remain |

`Water.tsx` selects the optical fallback for a coarse pointer, at most four
logical cores, at most 4 GB of reported device memory, or a detected software
renderer. Missing hardware values default to eight. Every 1.5 seconds of
sampled frame time, full-path capture cadence becomes every third frame below
48 FPS, every frame above 58 FPS, or every second frame otherwise.

Scene quality is selected separately in `DuckScene.tsx`:

- Canvas DPR is capped at 2, or 1.5 for the compact asset tier. That compact
  tier depends on core count or reported memory, not touch input alone.
- Modern touch devices retain the full imported scenery and HDR environment.
  The compact tier uses procedural trees and selected supporting models,
  without the HDR environment.
- Coarse-pointer or hardware-constrained devices disable canvas antialiasing,
  scene shadows, and light shafts. Otherwise the sun uses a 1,024 × 1,024 PCF
  shadow map. Software-renderer detection applies to water independently.
- Output is sRGB with ACES filmic tone mapping and exposure 1.08.

## Optimizations that retain visible detail

`pondWaterGeometry.ts` crops the original 80 × 80 plane to conservative pond
bounds plus a guard cell. It keeps the original grid spacing, alignment, and
triangle layout; the shader still clips the exact irregular shoreline. The
desktop vertex count falls from 25,921 to 1,802 (93.05%), and the fallback count
from 5,329 to 486 (90.88%). These percentages describe water vertex work, not
overall page performance. Desktop lattice positions were verified unchanged;
10,000 sampled shoreline positions remain inside both cropped grids.

`WaterSurface` owns the final render callback at priority 1, after animation
updates. It updates scene matrices once and requests one current-frame shadow
map. A refraction capture, when needed, and the main render share those matrices
and shadows. R3F's automatic main render is replaced, so there is no extra
third scene render. The target's normal automatic clear also replaces a
redundant explicit clear.

At an above-water camera height of at least 7.5, with the submerged blend below
0.02, the shader gives captured refraction zero weight. The renderer skips only
that unused capture; water waves and procedural reflections continue. Leaving
this endpoint forces a fresh capture. The same render-target object survives
resizes, preserving the water material and geometry; resizing or initial
allocation also marks its contents stale.

## Loading and resource lifetime

`PondBackdrop.tsx` lets the initial page paint before requesting the scene
bundle, using two animation frames and a bounded idle callback. It defers first
boot while the document is hidden and preserves the mounted canvas across
navigation.

Once the scene starts, the water texture, duck model, and enabled HDR environment
can fetch concurrently. Their visual reveal remains ordered: water, HDR
lighting, duck family, then scenery. Decorative assets load in stages: trees,
hero log, water lily, supporting logs, and the remaining bank props. The compact
tier loads its smaller supporting sequence. Asset entrances stop updating their
transforms after settling.

The GLTF loader caches source geometry, textures, and materials. Scene instances
reuse those resources; duck instances clone and later dispose only their own
animated materials. Duck animation iterates a cached material list instead of
traversing model graphs every frame. Locally owned water geometry, materials,
neutral textures, and render targets are disposed on teardown.

## Visibility and animation time

The main canvas uses `frameloop="never"` while the document is hidden and returns
to `"always"` when visible. It is not destroyed between these states. Installed
R3F resets `clock.elapsedTime` whenever frameloop mode changes, so `SceneClock`
runs before other frame subscribers and restores accumulated animation time.
This prevents unfinished entrances from restarting and wake timestamps from
rewinding after a tab switch.

Water time and duck wake emission use that same clock. Loading the normal texture
late therefore cannot create negative wake ages by starting a separate water
timer. Reduced-motion preferences disable the water's time animation and the
existing decorative motion paths. Visibility pausing is not a reduced-motion
quality tier and does not change assets or capture resolution.

## References

- [React Three Fiber: scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Three.js GPGPU water example](https://threejs.org/examples/webgl_gpgpu_water.html)
- [Evan Wallace WebGL Water](https://github.com/evanw/webgl-water)
