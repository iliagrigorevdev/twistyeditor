import * as argparse from 'argparse';
import * as fs from 'fs';
import path from 'path';
import Shape from './Shape';
import UrdfExporter, { PRISM_MESH_NAME, PRISM_MESH_FILENAME } from './UrdfExporter';
import { PRISM_TRIANGLE_INDICES } from './Prism';
import { PRISM_COLLISION_VERTICES } from './RigidInfo';
import { convertVectorToZUpFrame } from './VecMath';
import { createMeshFile } from './Mesh';

function parseArguments() {
  const parser = new argparse.ArgumentParser({
    description: "Convert shape to URDF"
  });
  parser.add_argument("--shape", {
    type: "str",
    help: "Path to the file from which the shape will be loaded",
    required: true
  });
  return parser.parse_args();
}

function maybeWriteMeshFile(outDir) {
  const meshPath = path.join(outDir, PRISM_MESH_FILENAME);
  if (fs.existsSync(meshPath)) {
    return;
  }
  const vertices = PRISM_COLLISION_VERTICES.map(vertex => convertVectorToZUpFrame(vertex));
  const meshData = createMeshFile(PRISM_MESH_NAME, vertices, PRISM_TRIANGLE_INDICES);
  fs.writeFile(meshPath, meshData, (err) => {
    if (err) {
      throw err;
    }
    console.log("Collision mesh file has been saved");
  });
}

async function main() {
  const args = parseArguments();
  const shapePath = args.shape;
  const archive = fs.readFileSync(shapePath);
  const shape = Shape.load(archive);
  if (!shape) {
    return;
  }
  shape.applyTransform(0); // align to ground

  const name = path.basename(shapePath, path.extname(shapePath));
  const outData = new UrdfExporter(shape).export(name);
  const outDir = path.dirname(shapePath);
  const outPath = path.join(outDir, name + ".urdf");
  fs.writeFile(outPath, outData, (err) => {
    if (err) {
      throw err;
    }
    console.log("Shape has been converted");
  });

  maybeWriteMeshFile(outDir);
}

if (require.main === module) {
  main();
}
