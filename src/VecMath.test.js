import { vec3, quat } from 'gl-matrix';
import { quaternionToRollPitchYaw } from './VecMath';

it("Quaternion to roll-pitch-yaw", () => {
  let q = quat.setAxisAngle(quat.create(), vec3.fromValues(1, 0, 0), Math.PI / 6);
  let rpy = quaternionToRollPitchYaw(q);
  expect(rpy[0]).toBeCloseTo(Math.PI / 6);
  expect(rpy[1]).toBeCloseTo(0);
  expect(rpy[2]).toBeCloseTo(0);

  q = quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), -Math.PI / 8);
  rpy = quaternionToRollPitchYaw(q);
  expect(rpy[0]).toBeCloseTo(0);
  expect(rpy[1]).toBeCloseTo(-Math.PI / 8);
  expect(rpy[2]).toBeCloseTo(0);

  q = quat.setAxisAngle(quat.create(), vec3.fromValues(0, 0, 1), Math.PI / 3);
  rpy = quaternionToRollPitchYaw(q);
  expect(rpy[0]).toBeCloseTo(0);
  expect(rpy[1]).toBeCloseTo(0);
  expect(rpy[2]).toBeCloseTo(Math.PI / 3);

  q = quat.create();
  q = quat.mul(q, quat.setAxisAngle(quat.create(), vec3.fromValues(1, 0, 0), Math.PI / 4), q);
  q = quat.mul(q, quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), -Math.PI / 5), q);
  q = quat.mul(q, quat.setAxisAngle(quat.create(), vec3.fromValues(0, 0, 1), Math.PI / 7), q);
  rpy = quaternionToRollPitchYaw(q);
  expect(rpy[0]).toBeCloseTo(Math.PI / 4);
  expect(rpy[1]).toBeCloseTo(-Math.PI / 5);
  expect(rpy[2]).toBeCloseTo(Math.PI / 7);
});
