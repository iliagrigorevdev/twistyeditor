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

export { intersectTriangles, intersectSphere, collideConvexHulls, rayToPointDistance };
