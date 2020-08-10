import { vec3 } from 'gl-matrix';

const auxVec1 = vec3.create();
const auxVec2 = vec3.create();
const auxVec3 = vec3.create();
const auxVec4 = vec3.create();

function intersectTriangles(ray, vertices, indices) {
  let hitDistance;
  for (let i = 0; i < indices.length; i += 3) {
    const triangleHitDistance = intersectTriangle(ray,
        vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]);
    if (triangleHitDistance !== undefined) {
      if ((hitDistance === undefined) || (triangleHitDistance < hitDistance)) {
        hitDistance = triangleHitDistance;
      }
    }
  }
  return hitDistance;
}

function intersectTriangle(ray, p1, p2, p3) {
  const edge1 = vec3.sub(auxVec1, p2, p1);
  const edge2 = vec3.sub(auxVec2, p3, p1);
  const pvec = vec3.cross(auxVec3, ray.direction, edge2);
  const det = vec3.dot(edge1, pvec);
  if (det < 1e-6) {
    return;
  }
  const tvec = vec3.sub(auxVec4, ray.origin, p1);
  const u = vec3.dot(tvec, pvec);
  if ((u < 0) || (u > det)) {
    return;
  }
  const qvec = vec3.cross(auxVec4, tvec, edge1);
  const v = vec3.dot(ray.direction, qvec);
  if ((v < 0) || (u + v > det)) {
    return;
  }
  return vec3.dot(edge2, qvec) / det;
}

function intersectSphere(ray, center, radius) {
  const rayorig = vec3.sub(auxVec1, ray.origin, center);
  const squaredRadius = radius * radius;
  const squaredRayLength = vec3.squaredLength(rayorig);

  if (squaredRayLength <= squaredRadius) {
    return 0; // inside hit
  }

  const a = vec3.dot(ray.direction, ray.direction);
  const b = 2 * vec3.dot(rayorig, ray.direction);
  const c = squaredRayLength - squaredRadius;
  const d = b * b - (4 * a * c);
  if (d >= 0) {
    const sqrtD = Math.sqrt(d);
    let t = (-b - sqrtD) / (2 * a);
    if (t < 0) {
      t = (-b + sqrtD) / (2 * a);
    }
    return t; // nearest surface hit
  }
}

// Cylinder geometry
//  .-----.
// '._____.'
// |       |
// |   ^ N | H
// |.--|--.|
// '._____.' R
//     P
function createCylinder(position, normal, radius, height, centered = false) {
  const cylinderPosition = vec3.create();
  if (centered) {
    vec3.scale(cylinderPosition, normal, -0.5 * height);
    vec3.add(cylinderPosition, cylinderPosition, position);
  } else {
    vec3.copy(cylinderPosition, position);
  }
  return {
    position: cylinderPosition,
    normal: vec3.clone(normal),
    radius: radius,
    height: height
  };
}

function intersectCylinder(ray, cylinder) {
  const a = vec3.sub(auxVec1, ray.direction, vec3.scale(auxVec1, cylinder.normal,
      vec3.dot(ray.direction, cylinder.normal)));
  const A = vec3.dot(a, a);
  if (A < 1e-12) {
    return;
  }
  const dp = vec3.sub(auxVec2, ray.origin, cylinder.position);
  const b = vec3.sub(auxVec3, dp, vec3.scale(auxVec3, cylinder.normal, vec3.dot(dp, cylinder.normal)));
  const B = 2 * vec3.dot(a, b);
  const C = vec3.dot(b, b) - cylinder.radius * cylinder.radius;

  const d = B * B - 4 * A * C;
  if (d < 0) {
    return;
  }
  const D = Math.sqrt(d);
  const k = 1 / (2 * A);
  const t1 = k * (-B - D);
  const t2 = k * (-B + D);
  if ((t1 < 0) && (t2 < 0)) {
    return;
  }

  const cp1 = cylinder.position;
  const cp2 = vec3.add(auxVec1, vec3.scale(auxVec1, cylinder.normal, cylinder.height), cylinder.position);
  const cd1 = vec3.dot(cylinder.normal, cp1);
  const cd2 = vec3.dot(cylinder.normal, cp2);
  if (t1 >= 0) {
    const p1 = vec3.add(auxVec1, vec3.scale(auxVec1, ray.direction, t1), ray.origin);
    const d1 = vec3.dot(cylinder.normal, p1);
    if ((cd1 - d1) * (cd2 - d1) < 0) {
      return t1;
    }
  }
  if (t2 >= 0) {
    const p2 = vec3.add(auxVec1, vec3.scale(auxVec1, ray.direction, t2), ray.origin);
    const d2 = vec3.dot(cylinder.normal, p2);
    if ((cd1 - d2) * (cd2 - d2) < 0) {
      return t2;
    }
  }
}

function projectVerticesOntoAxis(axis, vertices) {
  let dmin = 0;
  let dmax = 0;
  for (let i = 0; i < vertices.length; i++) {
    const d = vec3.dot(axis, vertices[i]);
    if (i === 0) {
      dmin = d;
      dmax = d;
    } else {
      if (d < dmin) {
        dmin = d;
      }
      if (d > dmax) {
        dmax = d;
      }
    }
  }
  return {
    dmin: dmin,
    dmax: dmax
  };
}

function overlapProjectionsOntoAxis(axis, vertices1, vertices2, eps = 1e-3) {
  if ((vertices1.length === 0) || (vertices2.length === 0)) {
    return false;
  }
  let p1 = projectVerticesOntoAxis(axis, vertices1);
  let p2 = projectVerticesOntoAxis(axis, vertices2);
  return (p1.dmin + eps < p2.dmax) && (p2.dmin + eps < p1.dmax);
}

function collideConvexHulls(vertices1, polygonNormals1, vertices2, polygonNormals2) {
  return polygonNormals1.every(polygonNormal1 =>
          overlapProjectionsOntoAxis(polygonNormal1, vertices1, vertices2))
      && polygonNormals2.every(polygonNormal2 =>
          overlapProjectionsOntoAxis(polygonNormal2, vertices1, vertices2));
}

function rayToPointDistance(ray, point) {
  const vector = vec3.sub(auxVec1, point, ray.origin);
  const projection = vec3.scale(auxVec2, ray.direction, vec3.dot(vector, ray.direction));
  return vec3.distance(vector, projection);
}

export { intersectTriangles, intersectSphere, createCylinder, intersectCylinder,
    collideConvexHulls, rayToPointDistance };
