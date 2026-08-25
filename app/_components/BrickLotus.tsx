"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const WATER_SURFACE_Y = -0.1;
const BRICK_HEIGHT = 0.14;
const STUD_HEIGHT = 0.06;

type Vector3Tuple = [number, number, number];

export type BrickLotusProps = {
  /** The flower's base. Defaults to the pond's waterline. */
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: number | Vector3Tuple;
  /** Disabled by default: this is a decorative water prop rendered twice by water. */
  castShadow?: boolean;
};

type BrickTransform = {
  matrix: THREE.Matrix4;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
};

type LotusLayout = {
  padBricks: THREE.Matrix4[];
  padStuds: THREE.Matrix4[];
  outerBricks: THREE.Matrix4[];
  outerStuds: THREE.Matrix4[];
  innerBricks: THREE.Matrix4[];
  innerStuds: THREE.Matrix4[];
  centrePlate: THREE.Matrix4[];
  centreStuds: THREE.Matrix4[];
};

const defaultPosition: Vector3Tuple = [0, WATER_SURFACE_Y, 0];
const defaultRotation: Vector3Tuple = [0, 0, 0];

function makeTransform(
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale = new THREE.Vector3(1, 1, 1),
): BrickTransform {
  return {
    matrix: new THREE.Matrix4().compose(position, quaternion, scale),
    position,
    quaternion,
    scale,
  };
}

function horizontalOffset(
  yaw: THREE.Quaternion,
  x: number,
  z: number,
) {
  return new THREE.Vector3(x, 0, z).applyQuaternion(yaw);
}

function addStudMatrices(
  destination: THREE.Matrix4[],
  brick: BrickTransform,
  count: 1 | 2,
) {
  const offsets = count === 2 ? [-0.14, 0.14] : [0];

  offsets.forEach((offset) => {
    const localOffset = new THREE.Vector3(
      0,
      BRICK_HEIGHT * brick.scale.y * 0.5 + STUD_HEIGHT * 0.5,
      offset * brick.scale.z,
    );
    const position = brick.position
      .clone()
      .add(localOffset.applyQuaternion(brick.quaternion));
    const scale = new THREE.Vector3(
      Math.min(1.04, brick.scale.x),
      1,
      Math.min(1.04, brick.scale.z),
    );
    destination.push(new THREE.Matrix4().compose(position, brick.quaternion, scale));
  });
}

function addPetalBrick(
  bricks: THREE.Matrix4[],
  studs: THREE.Matrix4[],
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3,
  studCount: 1 | 2,
) {
  const brick = makeTransform(position, quaternion, scale);
  bricks.push(brick.matrix);
  addStudMatrices(studs, brick, studCount);
}

/**
 * A still-life lotus made from only eight instanced draw calls. The deliberate
 * seams and raised studs keep it legibly toy-brick built from any camera angle,
 * while the broad petal silhouette stays readable through the water surface.
 */
function makeLotusLayout(): LotusLayout {
  const layout: LotusLayout = {
    padBricks: [],
    padStuds: [],
    outerBricks: [],
    outerStuds: [],
    innerBricks: [],
    innerStuds: [],
    centrePlate: [],
    centreStuds: [],
  };

  // A notched lily pad made of short green plates. The missing run faces the
  // camera by default, making it read as a lily pad instead of a green disc.
  const padRings = [
    { count: 8, radius: 0.34 },
    { count: 13, radius: 0.76 },
    { count: 17, radius: 1.12 },
  ];
  const notchAngle = -Math.PI * 0.5;

  padRings.forEach((ring, ringIndex) => {
    for (let index = 0; index < ring.count; index++) {
      const angle = (index / ring.count) * Math.PI * 2 + ringIndex * 0.16;
      const angleFromNotch = Math.abs(
        Math.atan2(Math.sin(angle - notchAngle), Math.cos(angle - notchAngle)),
      );
      if (ringIndex > 0 && angleFromNotch < 0.22 + ringIndex * 0.04) continue;

      const yaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        angle + Math.PI * 0.5,
      );
      const position = horizontalOffset(yaw, 0, ring.radius);
      position.y = 0.025 + ringIndex * 0.004;
      const brick = makeTransform(
        position,
        yaw,
        new THREE.Vector3(0.9 + ringIndex * 0.07, 1, 0.94),
      );
      layout.padBricks.push(brick.matrix);
      addStudMatrices(layout.padStuds, brick, 2);
    }
  });

  // Nine broad outer petals are built from a pair of bricks at their base,
  // narrowing to one lifted brick at the tip. Alternating their yaw by a tiny
  // amount prevents the bloom from feeling mechanically radial.
  const outerPetalCount = 9;
  for (let petalIndex = 0; petalIndex < outerPetalCount; petalIndex++) {
    const angle = (petalIndex / outerPetalCount) * Math.PI * 2 + 0.11;
    const yaw = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle,
    );

    for (let segment = 0; segment < 3; segment++) {
      const pitch = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -(0.09 + segment * 0.11),
      );
      const quaternion = yaw.clone().multiply(pitch);
      const radial = 0.3 + segment * 0.41;
      const y = 0.14 + segment * 0.095;
      const sideOffsets = segment === 2 ? [0] : [-0.225, 0.225];

      sideOffsets.forEach((side) => {
        const position = horizontalOffset(yaw, side, radial);
        position.y = y;
        addPetalBrick(
          layout.outerBricks,
          layout.outerStuds,
          position,
          quaternion,
          new THREE.Vector3(1 - segment * 0.09, 1, 1 - segment * 0.05),
          2,
        );
      });
    }
  }

  // The inner ring closes the gaps left by the large petals, using a lighter
  // candy-pink brick so the warm yellow centre stays visible rather than flat.
  const innerPetalCount = 7;
  for (let petalIndex = 0; petalIndex < innerPetalCount; petalIndex++) {
    const angle = (petalIndex / innerPetalCount) * Math.PI * 2 + 0.39;
    const yaw = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle,
    );

    for (let segment = 0; segment < 2; segment++) {
      const pitch = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -(0.3 + segment * 0.14),
      );
      const quaternion = yaw.clone().multiply(pitch);
      const position = horizontalOffset(yaw, 0, 0.22 + segment * 0.37);
      position.y = 0.31 + segment * 0.105;
      addPetalBrick(
        layout.innerBricks,
        layout.innerStuds,
        position,
        quaternion,
        new THREE.Vector3(0.82 - segment * 0.09, 1, 0.82),
        2,
      );
    }
  }

  layout.centrePlate.push(
    new THREE.Matrix4().compose(
      new THREE.Vector3(0, 0.47, 0),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 1, 1),
    ),
  );

  // Seven studs turn the centre into a sunny toy button rather than a smooth
  // yellow sphere: one central stud with a six-piece ring around it.
  for (let index = 0; index < 7; index++) {
    const angle = index === 0 ? 0 : ((index - 1) / 6) * Math.PI * 2;
    const radius = index === 0 ? 0 : 0.17;
    layout.centreStuds.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(
          Math.sin(angle) * radius,
          0.47 + 0.072,
          Math.cos(angle) * radius,
        ),
        new THREE.Quaternion(),
        new THREE.Vector3(1, 1, 1),
      ),
    );
  }

  return layout;
}

function fillInstances(
  mesh: THREE.InstancedMesh | null,
  matrices: readonly THREE.Matrix4[],
) {
  if (!mesh) return;

  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export function BrickLotus({
  position = defaultPosition,
  rotation = defaultRotation,
  scale = 1,
  castShadow = false,
}: BrickLotusProps) {
  const padBrickRef = useRef<THREE.InstancedMesh>(null);
  const padStudRef = useRef<THREE.InstancedMesh>(null);
  const outerBrickRef = useRef<THREE.InstancedMesh>(null);
  const outerStudRef = useRef<THREE.InstancedMesh>(null);
  const innerBrickRef = useRef<THREE.InstancedMesh>(null);
  const innerStudRef = useRef<THREE.InstancedMesh>(null);
  const centrePlateRef = useRef<THREE.InstancedMesh>(null);
  const centreStudRef = useRef<THREE.InstancedMesh>(null);

  const { assets, layout } = useMemo(() => {
    const padBrickGeometry = new THREE.BoxGeometry(0.46, 0.1, 0.54);
    const petalBrickGeometry = new THREE.BoxGeometry(0.46, BRICK_HEIGHT, 0.62);
    const studGeometry = new THREE.CylinderGeometry(0.105, 0.105, STUD_HEIGHT, 16);
    const centrePlateGeometry = new THREE.CylinderGeometry(0.31, 0.31, 0.13, 20);
    const centreStudGeometry = new THREE.CylinderGeometry(0.095, 0.095, 0.07, 16);

    return {
      assets: {
        padBrickGeometry,
        petalBrickGeometry,
        studGeometry,
        centrePlateGeometry,
        centreStudGeometry,
        padMaterial: new THREE.MeshStandardMaterial({
          color: "#6fa74f",
          roughness: 0.24,
          metalness: 0,
          envMapIntensity: 0.76,
        }),
        outerPetalMaterial: new THREE.MeshStandardMaterial({
          color: "#f1aabd",
          roughness: 0.2,
          metalness: 0,
          envMapIntensity: 0.82,
        }),
        innerPetalMaterial: new THREE.MeshStandardMaterial({
          color: "#ffe0e9",
          roughness: 0.18,
          metalness: 0,
          envMapIntensity: 0.86,
        }),
        centreMaterial: new THREE.MeshStandardMaterial({
          color: "#ffd251",
          roughness: 0.19,
          metalness: 0,
          envMapIntensity: 0.82,
        }),
      },
      layout: makeLotusLayout(),
    };
  }, []);

  useEffect(() => {
    fillInstances(padBrickRef.current, layout.padBricks);
    fillInstances(padStudRef.current, layout.padStuds);
    fillInstances(outerBrickRef.current, layout.outerBricks);
    fillInstances(outerStudRef.current, layout.outerStuds);
    fillInstances(innerBrickRef.current, layout.innerBricks);
    fillInstances(innerStudRef.current, layout.innerStuds);
    fillInstances(centrePlateRef.current, layout.centrePlate);
    fillInstances(centreStudRef.current, layout.centreStuds);
  }, [layout]);

  useEffect(
    () => () => {
      assets.padBrickGeometry.dispose();
      assets.petalBrickGeometry.dispose();
      assets.studGeometry.dispose();
      assets.centrePlateGeometry.dispose();
      assets.centreStudGeometry.dispose();
      assets.padMaterial.dispose();
      assets.outerPetalMaterial.dispose();
      assets.innerPetalMaterial.dispose();
      assets.centreMaterial.dispose();
    },
    [assets],
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <instancedMesh
        ref={padBrickRef}
        args={[assets.padBrickGeometry, assets.padMaterial, layout.padBricks.length]}
        castShadow={castShadow}
        receiveShadow
      />
      <instancedMesh
        ref={padStudRef}
        args={[assets.studGeometry, assets.padMaterial, layout.padStuds.length]}
        castShadow={castShadow}
        receiveShadow
      />
      <instancedMesh
        ref={outerBrickRef}
        args={[
          assets.petalBrickGeometry,
          assets.outerPetalMaterial,
          layout.outerBricks.length,
        ]}
        castShadow={castShadow}
        receiveShadow
      />
      <instancedMesh
        ref={outerStudRef}
        args={[assets.studGeometry, assets.outerPetalMaterial, layout.outerStuds.length]}
        castShadow={castShadow}
        receiveShadow
      />
      <instancedMesh
        ref={innerBrickRef}
        args={[
          assets.petalBrickGeometry,
          assets.innerPetalMaterial,
          layout.innerBricks.length,
        ]}
        castShadow={castShadow}
        receiveShadow
      />
      <instancedMesh
        ref={innerStudRef}
        args={[assets.studGeometry, assets.innerPetalMaterial, layout.innerStuds.length]}
        castShadow={castShadow}
        receiveShadow
      />
      <instancedMesh
        ref={centrePlateRef}
        args={[assets.centrePlateGeometry, assets.centreMaterial, layout.centrePlate.length]}
        castShadow={castShadow}
        receiveShadow
      />
      <instancedMesh
        ref={centreStudRef}
        args={[assets.centreStudGeometry, assets.centreMaterial, layout.centreStuds.length]}
        castShadow={castShadow}
        receiveShadow
      />
    </group>
  );
}
