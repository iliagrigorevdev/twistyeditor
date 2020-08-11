import { vec3, quat } from 'gl-matrix';
import { intersectTriangles, collideConvexHulls } from './Collision';
import { createTransform, rotatedTransform, multiplyTransforms } from './Transform';
import Placeable from './Placeable';

const JunctionFace = Object.freeze({
  LEFT: 0,
  RIGHT: 1,
  FRONT: 2,
  BACK: 3,
  BOTTOM: 4
});

const PRISM_HEIGHT = 1.0;
const PRISM_HALF_HEIGHT = 0.5 * PRISM_HEIGHT;
const PRISM_BASE = 2.0 * PRISM_HEIGHT;
const PRISM_HALF_BASE = 0.5 * PRISM_BASE;
const PRISM_SIDE = Math.sqrt(PRISM_BASE);
const PRISM_HALF_SIDE = 0.5 * PRISM_SIDE;
const PRISM_DISTANCE = 0.5 * PRISM_BASE;
const PRISM_HALF_DISTANCE = 0.5 * PRISM_DISTANCE;

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

const PRISM_LEFT_SLOPE_PIVOT_POINT = vec3.fromValues(-PRISM_HALF_DISTANCE, 0, 0);
const PRISM_RIGHT_SLOPE_PIVOT_POINT = vec3.fromValues(PRISM_HALF_DISTANCE, 0, 0);
const PRISM_SIDE_PIVOT_Y = -PRISM_HALF_HEIGHT / 6;
const PRISM_LEFT_SLOPE_NORMAL = vec3.rotateZ(vec3.create(), vec3.fromValues(0, 1, 0),
    vec3.fromValues(0, 0, 0), 0.25 * Math.PI);
const PRISM_RIGHT_SLOPE_NORMAL = vec3.rotateZ(vec3.create(), vec3.fromValues(0, 1, 0),
    vec3.fromValues(0, 0, 0), -0.25 * Math.PI);
const PRISM_LEFT_TRANSFORM = createTransform(vec3.fromValues(-PRISM_DISTANCE, 0, 0),
    quat.fromEuler(quat.create(), -180, 0, 0));
const PRISM_RIGHT_TRANSFORM = createTransform(vec3.fromValues(PRISM_DISTANCE, 0, 0),
    quat.fromEuler(quat.create(), 180, 0, 0));
const PRISM_JUNCTIONS = [
  {
    face: JunctionFace.LEFT,
    swapColors: true,
    pivot: PRISM_LEFT_SLOPE_PIVOT_POINT,
    normal: PRISM_LEFT_SLOPE_NORMAL,
    tangent: PRISM_RIGHT_SLOPE_NORMAL,
    transforms: [
      PRISM_LEFT_TRANSFORM,
      rotatedTransform(PRISM_LEFT_TRANSFORM, PRISM_LEFT_SLOPE_PIVOT_POINT,
          PRISM_LEFT_SLOPE_NORMAL, 0.5 * Math.PI),
      rotatedTransform(PRISM_LEFT_TRANSFORM, PRISM_LEFT_SLOPE_PIVOT_POINT,
          PRISM_LEFT_SLOPE_NORMAL, Math.PI),
      rotatedTransform(PRISM_LEFT_TRANSFORM, PRISM_LEFT_SLOPE_PIVOT_POINT,
          PRISM_LEFT_SLOPE_NORMAL, -0.5 * Math.PI)
    ]
  },
  {
    face: JunctionFace.RIGHT,
    swapColors: true,
    pivot: PRISM_RIGHT_SLOPE_PIVOT_POINT,
    normal: PRISM_RIGHT_SLOPE_NORMAL,
    tangent: PRISM_LEFT_SLOPE_NORMAL,
    transforms: [
      PRISM_RIGHT_TRANSFORM,
      rotatedTransform(PRISM_RIGHT_TRANSFORM, PRISM_RIGHT_SLOPE_PIVOT_POINT,
          PRISM_RIGHT_SLOPE_NORMAL, -0.5 * Math.PI),
      rotatedTransform(PRISM_RIGHT_TRANSFORM, PRISM_RIGHT_SLOPE_PIVOT_POINT,
          PRISM_RIGHT_SLOPE_NORMAL, Math.PI),
      rotatedTransform(PRISM_RIGHT_TRANSFORM, PRISM_RIGHT_SLOPE_PIVOT_POINT,
          PRISM_RIGHT_SLOPE_NORMAL, 0.5 * Math.PI)
    ]
  },
  {
    face: JunctionFace.FRONT,
    swapColors: false,
    pivot: vec3.fromValues(0, PRISM_SIDE_PIVOT_Y, PRISM_HALF_SIDE),
    normal: vec3.fromValues(0, 0, 1),
    tangent: vec3.fromValues(0, 1, 0),
    transforms: [
      createTransform(vec3.fromValues(0, 0, PRISM_SIDE))
    ]
  },
  {
    face: JunctionFace.BACK,
    swapColors: false,
    pivot: vec3.fromValues(0, PRISM_SIDE_PIVOT_Y, -PRISM_HALF_SIDE),
    normal: vec3.fromValues(0, 0, -1),
    tangent: vec3.fromValues(0, 1, 0),
    transforms: [
      createTransform(vec3.fromValues(0, 0, -PRISM_SIDE))
    ]
  },
  {
    face: JunctionFace.BOTTOM,
    swapColors: false,
    pivot: vec3.fromValues(0, -PRISM_HALF_HEIGHT, 0),
    normal: vec3.fromValues(0, -1, 0),
    tangent: vec3.fromValues(0, 0, -1),
    transforms: [
      createTransform(vec3.fromValues(0, -PRISM_HEIGHT, 0),
          quat.fromEuler(quat.create(), 180, 0, 0))
    ]
  }
];

const COINCIDING_VERTICES_SQUARED_DISTANCE_MAX = 1e-3;
function coincideVertices(v1, v2) {
  return vec3.squaredDistance(v1, v2) < COINCIDING_VERTICES_SQUARED_DISTANCE_MAX;
}
function coincideTriangleVertices(vertices1, vertices2, i11, i12, i13, i21, i22, i23) {
  return coincideVertices(vertices1[i11], vertices2[i21])
      && coincideVertices(vertices1[i12], vertices2[i22])
      && coincideVertices(vertices1[i13], vertices2[i23]);
}
function coincideRectangleVertices(vertices1, vertices2, i11, i12, i13, i14, i21, i22, i23, i24) {
  return coincideVertices(vertices1[i11], vertices2[i21])
      && coincideVertices(vertices1[i12], vertices2[i22])
      && coincideVertices(vertices1[i13], vertices2[i23])
      && coincideVertices(vertices1[i14], vertices2[i24]);
}
function coincideSquareVertices(vertices1, vertices2, i11, i12, i13, i14, i21, i22, i23, i24) {
  return coincideRectangleVertices(vertices1, vertices2, i11, i12, i13, i14, i21, i22, i23, i24)
      || coincideRectangleVertices(vertices1, vertices2, i11, i12, i13, i14, i22, i23, i24, i21)
      || coincideRectangleVertices(vertices1, vertices2, i11, i12, i13, i14, i23, i24, i21, i22)
      || coincideRectangleVertices(vertices1, vertices2, i11, i12, i13, i14, i24, i21, i22, i23);
}

class Prism extends Placeable {
  constructor() {
    super();
    this.colorMask = 0;
    this.backgroundColor = "#000";
    this.foregroundColor = "#fff";
    this.vertices = PRISM_VERTICES.map(vertex => vec3.clone(vertex));
    this.polygonNormals = PRISM_POLYGON_NORMALS.map(normal => vec3.clone(normal));
  }

  applyTransform(parentOrientation) {
    super.applyTransform(parentOrientation);
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

  collides(prism) {
    return collideConvexHulls(this.vertices, this.polygonNormals,
        prism.vertices, prism.polygonNormals);
  }

  getJunctions() {
    const junctions = [];
    const transform = createTransform(this.position, this.orientation);
    for (let i = 0; i < PRISM_JUNCTIONS.length; i++) {
      const junction = PRISM_JUNCTIONS[i];
      const junctionPrisms = [];
      for (let j = 0; j < junction.transforms.length; j++) {
        const junctionTransform = multiplyTransforms(createTransform(),
            transform, junction.transforms[j]);
        const prism = new Prism();
        prism.colorMask = this.colorMask;
        prism.backgroundColor = (junction.swapColors) ? this.foregroundColor : this.backgroundColor;
        prism.foregroundColor = (junction.swapColors) ? this.backgroundColor : this.foregroundColor;
        vec3.copy(prism.position, junctionTransform.position);
        quat.copy(prism.orientation, junctionTransform.orientation);
        junctionPrisms.push(prism);
      }
      const pivot = vec3.transformQuat(vec3.create(), junction.pivot, this.orientation);
      vec3.add(pivot, pivot, this.position);
      const normal = vec3.transformQuat(vec3.create(), junction.normal, this.orientation);
      const tangent = vec3.transformQuat(vec3.create(), junction.tangent, this.orientation);
      junctions.push({
        face: junction.face,
        pivot: pivot,
        normal: normal,
        tangent: tangent,
        prisms: junctionPrisms
      });
    }
    return junctions;
  }

  coincideFace(prism, face) {
    switch (face) {
      case JunctionFace.LEFT:
        if (coincideSquareVertices(this.vertices, prism.vertices, 0, 1, 3, 2, 4, 5, 3, 2)) {
          return JunctionFace.RIGHT;
        }
        if (coincideSquareVertices(this.vertices, prism.vertices, 0, 1, 3, 2, 1, 0, 2, 3)) {
          return JunctionFace.LEFT;
        }
        break;
      case JunctionFace.RIGHT:
        if (coincideSquareVertices(this.vertices, prism.vertices, 2, 3, 5, 4, 2, 3, 1, 0)) {
          return JunctionFace.LEFT;
        }
        if (coincideSquareVertices(this.vertices, prism.vertices, 2, 3, 5, 4, 3, 2, 4, 5)) {
          return JunctionFace.RIGHT;
        }
        break;
      case JunctionFace.FRONT:
        if (coincideTriangleVertices(this.vertices, prism.vertices, 1, 3, 5, 0, 2, 4)) {
          return JunctionFace.BACK;
        }
        if (coincideTriangleVertices(this.vertices, prism.vertices, 1, 3, 5, 5, 3, 1)) {
          return JunctionFace.FRONT;
        }
        break;
      case JunctionFace.BACK:
        if (coincideTriangleVertices(this.vertices, prism.vertices, 0, 2, 4, 1, 3, 5)) {
          return JunctionFace.FRONT;
        }
        if (coincideTriangleVertices(this.vertices, prism.vertices, 0, 2, 4, 4, 2, 0)) {
          return JunctionFace.BACK;
        }
        break;
      case JunctionFace.BOTTOM:
        if (coincideRectangleVertices(this.vertices, prism.vertices, 0, 1, 5, 4, 4, 5, 1, 0)
            || coincideRectangleVertices(this.vertices, prism.vertices, 0, 1, 5, 4, 1, 0, 4, 5)) {
          return JunctionFace.BOTTOM;
        }
        break;
      default:
        break;
    }
  }

  coincide(prism) {
    for (const faceName in JunctionFace) {
      const face = JunctionFace[faceName];
      const coincidingFace = this.coincideFace(prism, face);
      if (coincidingFace !== undefined) {
        return {
          baseFace: face,
          targetFace: coincidingFace
        }
      }
    }
  }

  toArchive() {
    return {
      id: this.id,
      colorMask: this.colorMask,
      backgroundColor: this.backgroundColor,
      foregroundColor: this.foregroundColor,
      position: this.position,
      orientation: this.orientation
    };
  }

  fromArchive(archive) {
    this.id = archive.id;
    this.colorMask = archive.colorMask;
    this.backgroundColor = archive.backgroundColor;
    this.foregroundColor = archive.foregroundColor;
    vec3.copy(this.position, archive.position);
    quat.copy(this.orientation, archive.orientation);
  }

  clone() {
    const prism = new Prism();
    prism.copy(this);
    prism.colorMask = this.colorMask;
    prism.backgroundColor = this.backgroundColor;
    prism.foregroundColor = this.foregroundColor;
    return prism;
  }
}

export default Prism;
export { PRISM_HEIGHT, PRISM_BASE, PRISM_SIDE };
export { JunctionFace };
