import { vec3, quat } from 'gl-matrix';

function createTransform(position = vec3.create(), orientation = quat.create()) {
  return {
    position: position,
    orientation: orientation
  };
}

function rotatedTransform(transform, pivot, axis, angle) {
  const rotation = quat.setAxisAngle(quat.create(), axis, angle);
  const position = vec3.sub(vec3.create(), transform.position, pivot);
  vec3.transformQuat(position, position, rotation);
  vec3.add(position, position, pivot);
  const orientation = quat.mul(rotation, rotation, transform.orientation);
  quat.normalize(orientation, orientation);
  return createTransform(position, orientation);
}

function multiplyTransforms(out, t1, t2) {
  vec3.transformQuat(out.position, t2.position, t1.orientation);
  vec3.add(out.position, out.position, t1.position);
  quat.mul(out.orientation, t1.orientation, t2.orientation);
  quat.normalize(out.orientation, out.orientation);
  return out;
}

function inverseTransform(out, t) {
  quat.invert(out.orientation, t.orientation);
  vec3.negate(out.position, t.position);
  vec3.transformQuat(out.position, out.position, out.orientation);
  return out;
}

export { createTransform, rotatedTransform, multiplyTransforms, inverseTransform };
