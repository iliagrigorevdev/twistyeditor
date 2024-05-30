
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
    this.aliveReward = 0;
    this.forwardReward = 0;
    this.jointAtLimitCost = -10;
    this.driveCost = 0;
    this.stallTorqueCost = 0;

    this.totalSteps = 1000000;
    this.trainingStartSteps = 1000;
    this.trainingInterval = 50;
    this.checkpointSteps = 10000;

    this.discount = 0.99;
    this.batchSize = 100;
    this.randomSteps = 10000;
    this.replayBufferSize = 1000000;
    this.actorLearningRate = 3e-4;
    this.criticLearningRate = 1e-3;
    this.regularization = 0.2;
    this.interpolation = 0.995;
    this.hiddenLayerSizes = [64, 64];
  }
}

export default Config;
