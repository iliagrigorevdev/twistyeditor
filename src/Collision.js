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

export { intersectTriangles };
