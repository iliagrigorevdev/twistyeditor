import { vec3, quat } from 'gl-matrix';
import { intersectTriangles } from './Collision';

const PRISM_HEIGHT = 1.0;
const PRISM_HALF_HEIGHT = 0.5 * PRISM_HEIGHT;
const PRISM_BASE = 2.0 * PRISM_HEIGHT;
const PRISM_HALF_BASE = 0.5 * PRISM_BASE;
const PRISM_SIDE = Math.sqrt(PRISM_BASE);
const PRISM_HALF_SIDE = 0.5 * PRISM_SIDE;

// Prism geometry
//     2
//     /\
//    /| \
//   / |  \
// 0/  /\  \4
//  | /3 \ |
//  |/    \|
//  /______\
// 1        5
const PRISM_VERTICES = [
  vec3.fromValues(-PRISM_HALF_BASE, -PRISM_HALF_HEIGHT, -PRISM_HALF_SIDE),
  vec3.fromValues(-PRISM_HALF_BASE, -PRISM_HALF_HEIGHT, PRISM_HALF_SIDE),
  vec3.fromValues(0.0, PRISM_HALF_HEIGHT, -PRISM_HALF_SIDE),
  vec3.fromValues(0.0, PRISM_HALF_HEIGHT, PRISM_HALF_SIDE),
  vec3.fromValues(PRISM_HALF_BASE, -PRISM_HALF_HEIGHT, -PRISM_HALF_SIDE),
  vec3.fromValues(PRISM_HALF_BASE, -PRISM_HALF_HEIGHT, PRISM_HALF_SIDE)
];
const PRISM_POLYGON_INDICES = [
  [ 0, 1, 2, 3 ], // left slope
  [ 2, 3, 5, 4 ], // right slope
  [ 1, 0, 4, 5 ], // bottom
  [ 0, 2, 4 ], // back
  [ 5, 3, 1 ] // front
];
const PRISM_TRIANGLE_INDICES = [
  0, 1, 2,  2, 1, 3, // left slope
  2, 3, 4,  4, 3, 5, // right slope
  4, 5, 0,  0, 5, 1, // bottom
  0, 2, 4, // back
  5, 3, 1 // front
];
const PRISM_POLYGON_NORMALS = PRISM_POLYGON_INDICES.map(indices => {
  const p0 = PRISM_VERTICES[indices[0]];
  const p1 = PRISM_VERTICES[indices[1]];
  const p2 = PRISM_VERTICES[indices[2]];
  const normal = vec3.sub(vec3.create(), p1, p0);
  vec3.cross(normal, normal, vec3.sub(vec3.create(), p2, p0));
  return vec3.normalize(normal, normal);
});

class Prism {
  constructor() {
    this.id = 0;
    this.colorMask = 0;
    this.backgroundColor = 0x000000;
    this.foregroundColor = 0xffffff;
    this.position = vec3.create();
    this.orientation = quat.create();
    this.worldPosition = vec3.create();
    this.worldOrientation = quat.create();
    this.vertices = PRISM_VERTICES.map(vertex => vec3.clone(vertex));
    this.polygonNormals = PRISM_POLYGON_NORMALS.map(normal => vec3.clone(normal));
  }

  applyTransform(shapeOrientation) {
    vec3.transformQuat(this.worldPosition, this.position, shapeOrientation);
    quat.multiply(this.worldOrientation, shapeOrientation, this.orientation);
    for (let i = 0; i < this.vertices.length; i++) {
      const vertex = this.vertices[i];
      vec3.transformQuat(vertex, PRISM_VERTICES[i], this.worldOrientation);
      vec3.add(vertex, vertex, this.worldPosition);
    }
    for (let i = 0; i < this.polygonNormals.length; i++) {
      vec3.transformQuat(this.polygonNormals[i], PRISM_POLYGON_NORMALS[i], this.worldOrientation);
    }
  }

  intersect(ray) {
    return intersectTriangles(ray, this.vertices, PRISM_TRIANGLE_INDICES);
  }

  clone() {
    const prism = new Prism();
    prism.id = this.id;
    prism.colorMask = this.colorMask;
    prism.backgroundColor = this.backgroundColor;
    prism.foregroundColor = this.foregroundColor;
    vec3.copy(prism.position, this.position);
    quat.copy(prism.orientation, this.orientation);
    vec3.copy(prism.worldPosition, this.worldPosition);
    quat.copy(prism.worldOrientation, this.worldOrientation);
    return prism;
  }
}

export default Prism;
