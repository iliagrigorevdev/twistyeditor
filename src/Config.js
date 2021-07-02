
class Config {
  constructor() {
    this.advanceReward = 1;
    this.aliveReward = 0;
    this.jointAtLimitCost = -10;
    this.driveCost = 0;//-0.1;
    this.stallTorqueCost = 0;//-0.01;

    this.totalSteps = 1000000;
    this.trainingStartSteps = 1000;
    this.trainingInterval = 50;
    this.checkpointSteps = 10000;

    this.discount = 0.99;
    this.batchSize = 100;
    this.randomSteps = 10000;
    this.replayBufferSize = 1000000;
    this.learningRate = 3e-4;
    this.interpolation = 0.995;
    this.hiddenLayerSizes = [64, 64];
  }
}

export default Config;
