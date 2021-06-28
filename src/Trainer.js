
const frameTime = 40;
const maxTime = 1000;

class Trainer {
  constructor(training, config, shapeData, checkpointData, playing) {
    this.training = training;
    this.config = config;
    this.shapeData = shapeData;
    this.checkpointData = checkpointData;
    this.playing = playing;

    this.config.hiddenLayerSizes = this.toNativeArray(this.config.hiddenLayerSizes);
  }

  run() {
    this.training.create(this.config, this.shapeData);

    if (this.checkpointData) {
      this.training.load(this.checkpointData);
      this.checkpointData = null;
      console.log("Load checkpoint");
    }

    const startTime = Date.now();
    let lastTime = startTime;
    let trainingTime = 0;
    let stepNumber = 0;
    let trainingNumber = 0;
    let currentValue = 0;
    let totalValue = 0;
    while (true) {
      if ((stepNumber < this.config.totalSteps) && !this.playing) {
        if ((stepNumber < this.config.trainingStartSteps) ||
            ((stepNumber % this.config.trainingInterval) !== 0) ||
            (trainingNumber === this.config.trainingInterval)) {
          const result = this.training.step();
          currentValue += result.reward;
          if (result.done) {
            totalValue = currentValue;
            currentValue = 0;
          }
          trainingNumber = 0;
          stepNumber++;

          if ((stepNumber % this.config.checkpointSteps) === 0) {
            this.checkpointData = this.training.save();
          }
        } else {
          this.training.train();
          trainingNumber++;
        }

        trainingTime = Math.floor((Date.now() - startTime) / 1000);
      }

      const currentTime = Date.now();
      const elapsedTime = currentTime - lastTime;
      if (elapsedTime >= frameTime) {
        if (elapsedTime > maxTime) {
          lastTime = currentTime;
        } else {
          lastTime += frameTime;
        }
        const nativeState = this.training.evaluate();
        const state = this.fromNativeState(nativeState);
        postMessage([stepNumber, totalValue, trainingTime, state, this.checkpointData]);
        this.checkpointData = null;
      }
    }
  }

  toNativeArray(array) {
    const nativeArray = new this.training.IntArray();
    nativeArray.resize(array.length, 0);
    for (let i = 0; i < array.length; i++) {
      nativeArray.set(i, array[i]);
    }
    return nativeArray;
  }

  fromNativeState(nativeState) {
    const state = {
      goalPosition: [
        nativeState.goalPosition.x,
        nativeState.goalPosition.y,
        nativeState.goalPosition.z
      ],
      transforms: []
    };
    for (let i = 0; i < nativeState.transforms.size(); i++) {
      const transform = nativeState.transforms.get(i);
      state.transforms.push({
        position: [
          transform.position.x,
          transform.position.y,
          transform.position.z
        ],
        orientation: [
          transform.orientation.x,
          transform.orientation.y,
          transform.orientation.z,
          transform.orientation.w
        ]
      });
    }
    return state;
  }
}

export default Trainer;
