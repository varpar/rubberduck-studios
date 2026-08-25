# Water rendering architecture

The site uses a physically informed hybrid water renderer. It aims for the
visual cues people read as real water without requiring the multi-pass fluid
simulation and ray tracing used by a desktop-only demo.

## Where to use it

- Keep one water scene behind the landing page and camera-dive transitions.
- Reuse that canvas while page content changes; do not mount a separate water
  renderer for each route.
- Use the full underwater treatment only after the camera crosses the surface.
  Caustics and light shafts are hidden on the home view and therefore cost no
  draw calls there.
- For small decorative water elements elsewhere, use a static image or a
  normal-mapped plane instead of another refraction capture.

## Rendering model

The water surface combines:

- three analytic directional waves for the large silhouette;
- a tiled normal map for small ripples;
- one reduced-resolution scene capture for screen-space refraction;
- Schlick Fresnel reflectance with water's approximate F0 of 0.020;
- Beer-Lambert-style absorption and depth coloring;
- a procedural sky reflection;
- an underwater Snell window and total-internal-reflection approximation;
- fog, caustics, light shafts, and real shadow-casting scene lights underwater.

Each duck writes its position, radius, and velocity to a shared four-slot
interaction buffer. The vertex shader adds a hull depression, damped rings,
and a speed-dependent Kelvin-like V wake. This keeps interaction deterministic
and avoids float textures, readbacks, or a GPU simulation pass.

## Device tiers

| Setting | Higher-power devices | Phones / low-power devices |
| --- | --- | --- |
| Canvas DPR | Up to 1.5 | 1.0 |
| Water grid | 160 x 160 | 96 x 96 |
| Refraction scale | 0.50, capped at 768 px | 0.32, capped at 448 px |
| Refraction cadence | Adaptive, every 1-3 frames | Adaptive, every 3-4 frames |
| Normal-map samples | 2 | 1 |
| Render-target format | RGBA8 | RGBA8 |
| MSAA on capture | Off | Off |

The runtime chooses the lower tier for coarse pointers, four-or-fewer logical
cores, 4 GB-or-less reported device memory, and software renderers. Capture
cadence then adapts to measured frame rate.

## Why not the full WebGL water demo

Evan Wallace's original demo uses a floating-point height field, raytraced
reflection/refraction, and a caustic texture pass. The Three.js GPGPU example
also updates a floating-point height map. Those techniques are excellent for a
standalone water showcase, but they add several full-screen/scene passes and
have more mobile texture-format and filtering constraints.

This implementation spends one reduced-resolution scene render for refraction
and synthesizes the remaining cues in the surface shader. The main limitation
is inherent to screen-space refraction: objects outside the current scene
capture cannot appear through the water. That is acceptable for the bounded
duck scene and is the key compromise that keeps the effect viable on phones.

## References

- [Three.js GPGPU water example](https://threejs.org/examples/webgl_gpgpu_water.html)
- [Three.js Water helper](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js)
- [Evan Wallace WebGL Water](https://github.com/evanw/webgl-water)
- [Three.js port and mobile notes](https://github.com/jeantimex/threejs-water)
