"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import {
  WAKE_IMPULSES_PER_DUCK,
  waterInteractors,
} from "../_state/waterInteraction";
import { POND_BOUNDARY_HARMONICS, POND_DIMENSIONS } from "../_state/pool";

const SUN_DIRECTION = new THREE.Vector3(0.55, 0.82, 0.36).normalize();
const INTERACTOR_COUNT = 4;
const WAKE_IMPULSE_COUNT = waterInteractors.length * WAKE_IMPULSES_PER_DUCK;
const POND_BOUNDARY_GLSL = POND_BOUNDARY_HARMONICS.map((harmonic) => {
  const operator = harmonic.phase < 0 ? "-" : "+";
  return `    scale += sin(angle * ${harmonic.frequency.toFixed(1)} ${operator} ${Math.abs(harmonic.phase).toFixed(1)}) * ${harmonic.amplitude.toFixed(3)};`;
}).join("\n");

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform mat4 uTextureMatrix;
  uniform vec4 uInteractorPosition[${INTERACTOR_COUNT}];
  uniform vec4 uInteractorMotion[${INTERACTOR_COUNT}];
  uniform vec4 uWakeImpulse[${WAKE_IMPULSE_COUNT}];

  #include <fog_pars_vertex>

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec4 vScreenCoord;
  varying float vHeight;
  varying float vWake;

  float baseWaves(vec2 p, inout vec2 gradient) {
    float h = 0.0;
    vec2 d0 = normalize(vec2(1.0, 0.22));
    vec2 d1 = normalize(vec2(-0.35, 1.0));
    vec2 d2 = normalize(vec2(0.72, -0.61));
    float p0 = dot(p, d0) * 0.42 + uTime * 0.11;
    float p1 = dot(p, d1) * 0.73 + uTime * 0.08;
    float p2 = dot(p, d2) * 1.18 + uTime * 0.16;
    h += sin(p0) * 0.012;
    h += sin(p1) * 0.007;
    h += sin(p2) * 0.0035;
    gradient += cos(p0) * d0 * 0.42 * 0.012;
    gradient += cos(p1) * d1 * 0.73 * 0.007;
    gradient += cos(p2) * d2 * 1.18 * 0.0035;
    return h;
  }

  float interactionWaves(vec2 p) {
    float h = 0.0;

    for (int i = 0; i < ${INTERACTOR_COUNT}; i++) {
      vec4 source = uInteractorPosition[i];
      vec4 motion = uInteractorMotion[i];
      // Plane local +Y becomes world -Z after the mesh rotation.
      vec2 sourcePosition = vec2(source.x, -source.y);
      vec2 velocity = vec2(motion.x, -motion.y);
      vec2 delta = p - sourcePosition;
      float distanceToDuck = length(delta);
      float radius = max(source.z, 0.08);
      float activity = source.w;
      float speed = motion.z;

      // A small displaced hull remains at rest; everything beyond it is driven
      // by speed so a stationary duck does not keep agitating the whole pond.
      float body = -exp(-dot(delta, delta) / (radius * radius)) * radius * 0.024;
      float speedFactor = smoothstep(0.10, 0.85, speed);
      float velocityLength = length(velocity);
      vec2 direction = velocityLength > 0.03
        ? velocity / velocityLength
        : vec2(1.0, 0.0);
      float along = dot(delta, direction);
      float behind = max(-along, 0.0);
      float lateral = dot(delta, vec2(-direction.y, direction.x));
      float bowChannel = abs(lateral) - radius * 0.72;
      float bow = exp(-bowChannel * bowChannel / max(radius * radius * 0.45, 0.01))
        * exp(-pow(max(along, 0.0) - radius * 0.45, 2.0) / max(radius * radius * 2.6, 0.02))
        * speedFactor
        * radius
        * 0.011;

      // Short transverse crests sit behind the stern, while a 19-22 degree
      // divergent pair opens outward. Their low spatial frequency is resolved
      // by the water grid instead of aliasing into a pixelated zig-zag.
      float transverse = sin(behind * 4.6 + motion.w - uTime * 0.18)
        * exp(-lateral * lateral * 2.8)
        * exp(-behind * 0.72)
        * speedFactor
        * radius
        * 0.015;
      float wakeArm = abs(lateral) - behind * 0.37;
      float divergent = sin((behind + abs(lateral) * 0.42) * 5.2 + motion.w - uTime * 0.14)
        * exp(-wakeArm * wakeArm * 20.0)
        * exp(-behind * 0.36)
        * speedFactor
        * radius
        * 0.013;

      h += (body + bow + transverse + divergent) * activity;
    }

    // Four impulses per duck retain a short, expanding memory of its route.
    // This is an inexpensive approximation of wake propagation in world space.
    for (int i = 0; i < ${WAKE_IMPULSE_COUNT}; i++) {
      vec4 impulse = uWakeImpulse[i];
      float age = uTime - impulse.z;
      if (age > 0.0 && age < 2.8 && impulse.w > 0.0) {
        vec2 impact = vec2(impulse.x, -impulse.y);
        float d = length(p - impact);
        float ringRadius = 0.12 + age * 0.62;
        float ringWidth = 0.10 + age * 0.035;
        float envelope = exp(-pow((d - ringRadius) / ringWidth, 2.0))
          * exp(-age * 0.7);
        h += sin((d - ringRadius) * 7.0) * envelope * impulse.w * 0.012;
      }
    }

    return h;
  }

  void main() {
    vec2 p = position.xy;
    vec2 gradient = vec2(0.0);
    float baseHeight = baseWaves(p, gradient);
    float interactionHeight = interactionWaves(p);
    float h = baseHeight + interactionHeight;
    // Interaction slopes are included in the normal so wakes catch light and
    // refract their surroundings instead of only moving the silhouette.
    float interactionX = interactionWaves(p + vec2(0.06, 0.0));
    float interactionY = interactionWaves(p + vec2(0.0, 0.06));
    gradient += vec2(
      (interactionX - interactionHeight) / 0.06,
      (interactionY - interactionHeight) / 0.06
    );
    vec3 localNormal = normalize(vec3(-gradient.x, -gradient.y, 1.0));

    vec3 transformed = position;
    transformed.z += h;
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);

    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
    vScreenCoord = uTextureMatrix * vec4(transformed, 1.0);
    vHeight = h;
    vWake = abs(interactionHeight);

    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  #include <fog_pars_fragment>

  uniform float uTime;
  uniform float uSubmerged;
  uniform float uLowPower;
  uniform sampler2D uSceneMap;
  uniform sampler2D uNormalMap;
  uniform vec3 uSunDirection;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec2 uPondCentre;
  uniform vec2 uPondRadii;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec4 vScreenCoord;
  varying float vHeight;
  varying float vWake;

  // This is a clear, shallow summer pond. Keep enough red absorption for a
  // blue cast, but let the sunlit top of a floating duck read through the
  // surface instead of collapsing into an opaque silhouette.
  const vec3 ABSORPTION = vec3(0.16, 0.045, 0.020);
  const float F0 = 0.02037;

  vec3 skyReflection(vec3 ray) {
    float elevation = clamp(ray.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 horizon = vec3(0.39, 0.79, 0.88);
    vec3 zenith = vec3(0.09, 0.49, 0.72);
    vec3 sky = mix(horizon, zenith, pow(elevation, 0.65));
    float sun = pow(max(dot(ray, uSunDirection), 0.0), 320.0);
    return sky + sun * vec3(1.0, 0.88, 0.62) * 2.2;
  }

  vec3 surfaceNormal() {
    vec2 uv0 = vWorldPosition.xz * 0.105 + vec2(uTime * 0.003, uTime * 0.002);
    vec2 uv1 = vec2(-vWorldPosition.z, vWorldPosition.x) * 0.071
      + vec2(-uTime * 0.002, uTime * 0.003);
    vec3 sample0 = texture2D(uNormalMap, uv0).rgb * 2.0 - 1.0;
    vec2 detail = sample0.xy * 0.11;
    if (uLowPower < 0.5) {
      vec3 sample1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
      detail = (sample0.xy + sample1.yx) * 0.095;
    }
    return normalize(vWorldNormal + vec3(detail.x, 0.10, detail.y));
  }

  vec2 refractedUv(vec3 normal, float amount) {
    vec3 projected = vScreenCoord.xyz / max(vScreenCoord.w, 0.0001);
    return clamp(projected.xy + normal.xz * amount, vec2(0.003), vec2(0.997));
  }

  float pondOutline(vec2 point) {
    float angle = atan(point.y, point.x);
    float scale = 1.0;
${POND_BOUNDARY_GLSL}
    return scale;
  }

  float normalizedPondDistance(vec2 point) {
    return length(point) / max(pondOutline(point), 0.001);
  }

  vec3 aboveWater(vec3 normal, vec3 viewDirection) {
    float facing = clamp(dot(viewDirection, normal), 0.0, 1.0);
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - facing, 5.0);
    // Match the water colour to the physical basin below it. The shallow
    // shelf rises close to the pond edge, so it picks up a sunlit, sandy tint
    // rather than reading like a uniformly deep swimming pool.
    vec2 pondPoint = (vWorldPosition.xz - uPondCentre) / uPondRadii;
    float pondDistance = normalizedPondDistance(pondPoint);
    float shore = smoothstep(0.74, 0.995, pondDistance);
    vec3 transmission = exp(-ABSORPTION * (0.65 / max(facing, 0.22)));
    vec3 scattering = mix(
      uDeepColor,
      uShallowColor,
      clamp(facing * 0.64 + 0.18 + shore * 0.34, 0.0, 1.0)
    );
    // A pond is not a clear aquarium. Preserve enough of the captured scene
    // for refraction and silhouettes, but veil the bed so a low-poly terrain
    // contour cannot appear as a harsh ring from the sandbox's overhead view.
    // At the eye-level hero we retain refracted silhouettes. As the camera
    // pulls high into the sandbox, increase the water's natural turbidity so
    // the basin reads as water rather than exposing its construction rings.
    float overhead = smoothstep(2.0, 7.5, cameraPosition.y);
    float bedVeil = mix(0.5, 1.0, overhead);
    vec3 sceneColor = mix(
      texture2D(uSceneMap, refractedUv(normal, 0.018)).rgb,
      scattering,
      bedVeil
    );
    vec3 refracted = sceneColor * transmission + scattering * (1.0 - transmission);
    vec3 reflected = skyReflection(reflect(-viewDirection, normal));
    vec3 color = mix(refracted, reflected, fresnel);

    // Screen-space depth cue: nearby water has a longer effective path and
    // therefore reads deeper than the sky-reflecting horizon.
    float screenY = clamp(vScreenCoord.y / max(vScreenCoord.w, 0.0001), 0.0, 1.0);
    float foreground = 1.0 - smoothstep(0.08, 0.56, screenY);
    vec3 foregroundDepth = mix(uDeepColor * 0.82, uShallowColor * 0.9, shore);
    color = mix(color, foregroundDepth, foreground * mix(0.46, 0.26, shore));
    color = mix(color, uShallowColor, shore * 0.055);

    // Restrained foam: only strong wakes or the highest crests break white.
    float foam = smoothstep(0.020, 0.050, vWake)
      + smoothstep(0.050, 0.075, vHeight) * 0.22;
    return mix(color, vec3(0.88, 0.95, 0.96), clamp(foam, 0.0, 0.65));
  }

  vec3 belowWater(vec3 normal, vec3 viewDirection) {
    float cosIncident = abs(dot(viewDirection, normal));
    float waterDepth = abs(cameraPosition.y - vWorldPosition.y);
    float pathLength = waterDepth / max(cosIncident, 0.18);
    vec3 transmission = exp(-ABSORPTION * pathLength);

    // Keep an art-directed, generously soft Snell window. A strictly narrow
    // physical cone made most of the overhead surface reflective, hiding the
    // floating ducks when a reader was under water.
    float snellWindow = smoothstep(0.26, 0.52, cosIncident);
    vec3 sceneColor = texture2D(uSceneMap, refractedUv(-normal, 0.027)).rgb;
    vec3 refracted = mix(
      uDeepColor * 0.78,
      sceneColor,
      0.58 + transmission * 0.42
    );
    vec3 tir = mix(
      uDeepColor * 0.65,
      skyReflection(reflect(-viewDirection, -normal)) * transmission,
      0.28
    );
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosIncident, 5.0);
    vec3 color = mix(tir, mix(refracted, tir, fresnel), snellWindow);

    vec2 pondPoint = (vWorldPosition.xz - uPondCentre) / uPondRadii;
    float pondDistance = normalizedPondDistance(pondPoint);
    float shore = smoothstep(0.76, 0.995, pondDistance);
    color = mix(color, uShallowColor * 0.9, shore * 0.08);

    float caustic = pow(max(0.0, 1.0 - length(normal.xz) * 2.2), 5.0);
    color += caustic * snellWindow * transmission * vec3(0.12, 0.23, 0.23);
    return color;
  }

  void main() {
    // The simulation still uses a dense rectangular grid for smooth waves,
    // but only the hand-shaped footprint is drawn. That gives the shoreline a clean
    // natural boundary without turning the water surface into a low-detail
    // triangle fan.
    vec2 pondPoint = (vWorldPosition.xz - uPondCentre) / uPondRadii;
    if (normalizedPondDistance(pondPoint) > 1.0) discard;

    vec3 normal = surfaceNormal();
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 color;
    if (uSubmerged < 0.02) {
      color = aboveWater(normal, viewDirection);
    } else if (uSubmerged > 0.98) {
      color = belowWater(normal, viewDirection);
    } else {
      vec3 top = aboveWater(normal, viewDirection);
      vec3 bottom = belowWater(normal, viewDirection);
      color = mix(top, bottom, smoothstep(0.02, 0.98, uSubmerged));
    }

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export type WaterHandle = {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
};

type StylizedWaterProps = {
  sceneTexture: THREE.Texture;
  lowPower: boolean;
};

export const StylizedWater = forwardRef<WaterHandle, StylizedWaterProps>(
  function StylizedWater({ sceneTexture, lowPower }, ref) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);
    const normalMap = useTexture("/textures/waternormals.jpg");

    useEffect(() => {
      normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
      normalMap.colorSpace = THREE.NoColorSpace;
      normalMap.anisotropy = lowPower ? 1 : 4;
      normalMap.needsUpdate = true;
    }, [normalMap, lowPower]);

    useImperativeHandle(ref, () => ({
      get mesh() {
        return meshRef.current as THREE.Mesh;
      },
      get material() {
        return materialRef.current as THREE.ShaderMaterial;
      },
    }));

    const { geometry, material } = useMemo(() => {
      const segments = lowPower ? 96 : 160;
      const geometry = new THREE.PlaneGeometry(80, 80, segments, segments);
      const uniforms = {
          fogDensity: { value: 0 },
          fogNear: { value: 1 },
          fogFar: { value: 2000 },
          fogColor: { value: new THREE.Color() },
          uTime: { value: 0 },
          uSubmerged: { value: 0 },
          uLowPower: { value: lowPower ? 1 : 0 },
          uTextureMatrix: { value: new THREE.Matrix4() },
          uSceneMap: { value: sceneTexture },
          uNormalMap: { value: normalMap },
          uSunDirection: { value: SUN_DIRECTION.clone() },
          uDeepColor: { value: new THREE.Color("#23889a") },
          uShallowColor: { value: new THREE.Color("#69baa9") },
          uPondCentre: { value: new THREE.Vector2(0, POND_DIMENSIONS.centreZ) },
          uPondRadii: {
            value: new THREE.Vector2(
              POND_DIMENSIONS.radiusX,
              POND_DIMENSIONS.radiusZ,
            ),
          },
          uInteractorPosition: {
            value: Array.from(
              { length: INTERACTOR_COUNT },
              () => new THREE.Vector4(1000, 1000, 0.2, 0),
            ),
          },
          uInteractorMotion: {
            value: Array.from(
              { length: INTERACTOR_COUNT },
              (_, index) => new THREE.Vector4(0, 0, 0, index * 1.7),
            ),
          },
          uWakeImpulse: {
            value: Array.from(
              { length: WAKE_IMPULSE_COUNT },
              () => new THREE.Vector4(1000, 1000, -1000, 0),
            ),
          },
      };
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms,
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
        transparent: false,
        fog: true,
      });
      return { geometry, material };
    }, [lowPower, normalMap, sceneTexture]);

    useEffect(() => {
      material.uniforms.uSceneMap.value = sceneTexture;
      material.uniforms.uNormalMap.value = normalMap;
    }, [material, normalMap, sceneTexture]);

    useEffect(
      () => () => {
        geometry.dispose();
        material.dispose();
      },
      [geometry, material],
    );

    const reducedMotion = useMemo(
      () =>
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      [],
    );

    useFrame((_, delta) => {
      if (!reducedMotion) material.uniforms.uTime.value += delta;
    });

    return (
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        frustumCulled={false}
      >
        <primitive ref={materialRef} object={material} attach="material" />
      </mesh>
    );
  },
);
