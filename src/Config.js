
class Config {
  constructor() {
    this.timeStep = 0.01;
    this.frameSteps = 4;
    this.environmentSteps = 1000;
    this.gravity = -9.81;
    this.targetDistance = 30;
    this.groundFriction = 0.8;
    this.prismFriction = 0.8;
    this.groundRestitution = 0;
    this.prismRestitution = 0

    this.advanceReward = 1;
    this.forwardReward = 0.1;
    this.fallCost = -100;
    this.jointAtLimitCost = -10;
    this.driveCost = -0.1;
    this.stallTorqueCost = -0.01;

    this.totalSteps = 1000000;
    this.trainingStartSteps = 1000;
    this.trainingInterval = 50;
    this.checkpointSteps = 10000;

    this.discount = 0.99;
    this.batchSize = 256;
    this.randomSteps = 10000;
    this.replayBufferSize = 1000000;
    this.actorLearningRate = 5e-4;
    this.criticLearningRate = 5e-4;
    this.regularization = 0.2;
    this.interpolation = 0.995;
    this.hiddenLayerSizes = [256, 256];
  }
}

export default Config;
