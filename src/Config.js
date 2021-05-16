
class Config {
  constructor() {
    this.discount = 0.99;
    this.epochCount = 100;
    this.epochStepCount = 4000;
    this.batchSize = 100;
    this.randomStepCount = 10000;
    this.replaySampleCountMax = 1000000;
    this.trainingStartStepCount = 1000;
    this.trainingInterval = 50;
    this.learningRate = 3e-4;
    this.regularization = 0.2;
    this.interpolation = 0.995;
    this.hiddenLayerSizes = [64, 64];
  }

  totalStepCount() {
    return this.epochCount * this.epochStepCount;
  }
}

export default Config;
