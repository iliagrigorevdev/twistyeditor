
class Config {
  constructor() {
    this.totalSteps = 1000000;
    this.checkpointSteps = 10000;

    this.discount = 0.99;
    this.batchSize = 100;
    this.randomSteps = 10000;
    this.replayBufferSize = 1000000;
    this.trainingStartSteps = 1000;
    this.learningRate = 3e-4;
    this.regularization = 0.2;
    this.interpolation = 0.995;
    this.hiddenLayerSizes = [64, 64];
  }
}

export default Config;