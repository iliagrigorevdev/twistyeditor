
const frameTime = 40;
const maxTime = 1000;

class Trainer {
  constructor(training, config, shapeData, checkpointData) {
    this.training = training;
    this.config = config;
    this.shapeData = shapeData;
    this.checkpointData = checkpointData;

    this.config.hiddenLayerSizes = this.toNativeArray(this.config.hiddenLayerSizes);
  }

  run() {
    if (this.checkpointData) {
      this.training.load(this.checkpointData);
      this.checkpointData = null;
      console.log("Load checkpoint");
    }

    this.training.create(this.config, this.shapeData);

    const startTime = Date.now();
    let endTime = startTime;
    let lastTime = startTime;
    let stepNumber = 0;
    while (true) {
      if (stepNumber < this.config.totalSteps) {
        this.training.step();
        endTime = Date.now();
        stepNumber++;

        if ((stepNumber % this.config.checkpointSteps) === 0) {
          this.checkpointData = this.training.save();
        }
      }

      const currentTime = Date.now();
      const elapsedTime = currentTime - lastTime;
      if (elapsedTime >= frameTime) {
        if (elapsedTime > maxTime) {
          lastTime = currentTime;
        } else {
          lastTime += frameTime;
        }
        const progress = Math.floor(stepNumber * 100 / this.config.totalSteps);
        const time = Math.floor((endTime - startTime) / 1000);
        const nativeState = this.training.evaluate();
        const state = this.fromNativeState(nativeState);
        postMessage([progress, time, state, this.checkpointData]);
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
