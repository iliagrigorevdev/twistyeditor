import { vec3, mat3 } from 'gl-matrix';

function diagonalizeMatrix(mat, threshold, maxSteps) {
  const rot = mat3.create();
  for (let step = maxSteps; step > 0; step--) {
    let p = 0;
    let q = 1;
    let r = 2;
    let max = Math.abs(mat[3]);
    let v = Math.abs(mat[6]);
    if (v > max) {
      q = 2;
      r = 1;
      max = v;
    }
    v = Math.abs(mat[7]);
    if (v > max) {
      p = 1;
      q = 2;
      r = 0;
      max = v;
    }

    let t = threshold * (Math.abs(mat[0]) + Math.abs(mat[4]) + Math.abs(mat[8]));
    if (max <= t) {
      return rot;
    }

    const mpq = mat[p + q * 3];
    const theta = (mat[q + q * 3] - mat[p + p * 3]) / (2 * mpq);
    const theta2 = theta * theta;
    let cos;
    let sin;
    t = (theta >= 0)
        ? 1 / (theta + Math.sqrt(1 + theta2))
        : 1 / (theta - Math.sqrt(1 + theta2));
    cos = 1 / Math.sqrt(1 + t * t);
    sin = cos * t;

    mat[p + q * 3] = 0;
    mat[q + p * 3] = 0;
    mat[p + p * 3] -= t * mpq;
    mat[q + q * 3] += t * mpq;
    let mrp = mat[r + p * 3];
    let mrq = mat[r + q * 3];
    mat[r + p * 3] = mat[p + r * 3] = cos * mrp - sin * mrq;
    mat[r + q * 3] = mat[q + r * 3] = cos * mrq + sin * mrp;

    for (let i = 0; i < 3; i++) {
      mrp = rot[i + p * 3];
      mrq = rot[i + q * 3];
      rot[i + p * 3] = cos * mrp - sin * mrq;
      rot[i + q * 3] = cos * mrq + sin * mrp;
    }
  }
  return rot;
}

function quaternionToRollPitchYaw(q) {
  const sarg = -2 * (q[0] * q[2] - q[3] * q[1]);
  if (sarg <= -0.99999) {
    return vec3.fromValues(0, -0.5 * Math.PI, 2 * Math.atan2(q[0], -q[1]));
  } else if (sarg >= 0.99999) {
    return vec3.fromValues(0, 0.5 * Math.PI, 2 * Math.atan2(-q[0], q[1]));
  } else {
    const sqx = q[0] * q[0];
    const sqy = q[1] * q[1];
    const sqz = q[2] * q[2];
    const squ = q[3] * q[3];
    return vec3.fromValues(
      Math.atan2(2 * (q[1] * q[2] + q[3] * q[0]), squ - sqx - sqy + sqz),
      Math.asin(sarg),
      Math.atan2(2 * (q[0] * q[1] + q[3] * q[2]), squ + sqx - sqy - sqz)
    );
  }
}

function convertVectorToZUpFrame(vector) {
  return vec3.fromValues(vector[0], -vector[2], vector[1]);
}

export { diagonalizeMatrix, quaternionToRollPitchYaw, convertVectorToZUpFrame };
