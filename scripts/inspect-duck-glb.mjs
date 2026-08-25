import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Parse the GLB header by hand (no three.js dependency at the script
// boundary) and pretty-print the embedded glTF JSON's node hierarchy,
// each node's local TRS, and which mesh it references.

const __dirname = dirname(fileURLToPath(import.meta.url));
const buf = readFileSync(
  resolve(__dirname, "../public/models/duck.glb"),
);

// GLB binary layout: 12-byte header, then chunks (each: 8-byte header + data).
const magic = buf.readUInt32LE(0);
if (magic !== 0x46546c67) throw new Error("Not a GLB");
const version = buf.readUInt32LE(4);
const total = buf.readUInt32LE(8);
console.log("GLB version", version, "total bytes", total);

// First chunk should be JSON.
const jsonLen = buf.readUInt32LE(12);
const jsonType = buf.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error("First chunk not JSON");
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));

console.log("\nScenes:", json.scenes?.length, "default:", json.scene ?? 0);
const rootScene = json.scenes[json.scene ?? 0];
console.log("Root scene nodes:", rootScene.nodes);

console.log("\nTotal nodes:", json.nodes.length);

function dumpNode(idx, depth = 0) {
  const n = json.nodes[idx];
  const pad = "  ".repeat(depth);
  const name = n.name ?? `<node ${idx}>`;
  const t = n.translation?.map((x) => x.toFixed(3)) ?? null;
  const r = n.rotation?.map((x) => x.toFixed(3)) ?? null;
  const s = n.scale?.map((x) => x.toFixed(3)) ?? null;
  const matrix = n.matrix;
  const mesh = n.mesh !== undefined ? ` mesh=${n.mesh}` : "";
  let trs = "";
  if (t || r || s) {
    trs =
      ` T=${t ? `[${t.join(",")}]` : "0"} R=${
        r ? `[${r.join(",")}]` : "id"
      } S=${s ? `[${s.join(",")}]` : "1"}`;
  } else if (matrix) {
    trs = ` MATRIX=[${matrix.map((x) => x.toFixed(2)).join(",")}]`;
  }
  console.log(`${pad}- [${idx}] "${name}"${mesh}${trs}`);
  for (const c of n.children ?? []) dumpNode(c, depth + 1);
}
for (const idx of rootScene.nodes) dumpNode(idx);

if (json.meshes) {
  console.log("\nMeshes:", json.meshes.length);
  json.meshes.forEach((m, i) => {
    console.log(
      `  [${i}] "${m.name ?? ""}" primitives=${m.primitives.length}`,
    );
  });
}

// asset.generator can hint at which tool exported the model.
console.log("\nasset:", json.asset);
