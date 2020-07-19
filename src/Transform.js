import { vec3, quat } from 'gl-matrix';

function createTransform(position, orientation) {
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

function multiplyTransforms(transform1, transform2) {
  const position = vec3.transformQuat(vec3.create(), transform2.position, transform1.orientation);
  vec3.add(position, position, transform1.position);
  const orientation = quat.mul(quat.create(), transform1.orientation, transform2.orientation);
  quat.normalize(orientation, orientation);
  return createTransform(position, orientation);
}

export { createTransform, rotatedTransform, multiplyTransforms };
