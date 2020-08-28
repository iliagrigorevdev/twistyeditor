class OUActionNoise {
  constructor(actionSize, mu, sigma, theta = 0.15, dt = 1e-2, x0 = null) {
    this.mu = mu;
    this.thetaDt = theta * dt;
    this.sigmaSqrtDt = sigma * Math.sqrt(dt);
    this.x0 = x0;
    this.x = new Array(actionSize);
    this.reset();
  }

  next() {
    for (let i = 0; i < this.x.length; i++) {
      this.x[i] = this.x[i] + (this.mu - this.x[i]) * this.thetaDt
          + this.sigmaSqrtDt * gaussianRand();
    }
    return this.x;
  }

  reset() {
    this.x.fill((this.x0 !== null) ? this.x0 : 0);
  }
}

function gaussianRand() {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = Math.random();
  }
  while (v === 0) {
    v = Math.random();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default OUActionNoise;
