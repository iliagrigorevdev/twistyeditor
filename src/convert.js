import * as argparse from 'argparse';
import * as fs from 'fs';
import path from 'path';
import Shape from './Shape';
import UrdfExporter, { PRISM_MESH_NAME, PRISM_MESH_FILENAME } from './UrdfExporter';
import { PRISM_TRIANGLE_INDICES } from './Prism';
import { PRISM_COLLISION_VERTICES } from './RigidInfo';
import { convertVectorToZUpFrame } from './VecMath';
import { createMeshFile } from './Mesh';
import NotebookExporter from './NotebookExporter';

function parseArguments() {
  const parser = new argparse.ArgumentParser({
    description: "Convert shape"
  });
  parser.add_argument("-s", "--shape", {
    type: "str",
    help: "Path to the file from which the shape will be loaded",
    required: true
  });
  parser.add_argument("-u", "--writeUrdf", {
    help: "Write URDF file?",
    action: "store_true",
    default: false
  });
  parser.add_argument("-n", "--writeNotebook", {
    help: "Write Notebook file?",
    action: "store_true",
    default: false
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
  const outDir = path.dirname(shapePath);

  if (args.writeUrdf) {
    const urdfData = new UrdfExporter(shape).export(name);
    const urdfPath = path.join(outDir, name + ".urdf");
    fs.writeFile(urdfPath, urdfData, (err) => {
      if (err) {
        throw err;
      }
      console.log("URDF file has been saved");
    });

    maybeWriteMeshFile(outDir);
  }

  if (args.writeNotebook) {
    const notebookExporter = new NotebookExporter(shape);
    const error = notebookExporter.validate();
    if (!error) {
      const notebookData = notebookExporter.export(name);
      const notebookPath = path.join(outDir, name + ".ipynb");
      fs.writeFile(notebookPath, notebookData, (err) => {
        if (err) {
          throw err;
        }
        console.log("Notebook file has been saved");
      });
    } else {
      console.log("Notebook error: " + error);
    }
  }
}

if (require.main === module) {
  main();
}
