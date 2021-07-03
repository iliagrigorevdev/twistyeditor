
const maxTime = 1000;

class Trainer {
  constructor(training, config, shapeData, checkpointData, playing) {
    this.training = training;
    this.config = config;
    this.shapeData = shapeData;
    this.checkpointData = checkpointData;
    this.playing = playing;

    this.frameTime = Math.floor(config.timeStep * config.frameSteps * 1000 + 0.5);

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
    let finalValue = 0;
    let currentLosses = new ActorCriticLosses();
    let finalLosses = new ActorCriticLosses();
    while (true) {
      if ((stepNumber < this.config.totalSteps) && !this.playing) {
        if ((stepNumber < this.config.trainingStartSteps) ||
            ((stepNumber % this.config.trainingInterval) !== 0) ||
            (trainingNumber === this.config.trainingInterval)) {
          const result = this.training.step();
          currentValue += result.reward;
          if (result.done) {
            finalValue = currentValue;
            currentValue = 0;
          }
          trainingNumber = 0;
          stepNumber++;

          if ((stepNumber % this.config.checkpointSteps) === 0) {
            this.checkpointData = this.training.save();
          }
        } else {
          const losses = this.training.train();
          currentLosses.lossP += losses.lossP;
          currentLosses.lossV += losses.lossV;
          trainingNumber++;
          if (trainingNumber === this.config.trainingInterval) {
            finalLosses = new ActorCriticLosses(
              currentLosses.lossP / this.config.trainingInterval,
              currentLosses.lossV / this.config.trainingInterval
            );
            currentLosses = new ActorCriticLosses();
          }
        }

        trainingTime = Math.floor((Date.now() - startTime) / 1000);
      }

      const currentTime = Date.now();
      const elapsedTime = currentTime - lastTime;
      if (elapsedTime >= this.frameTime) {
        if (elapsedTime > maxTime) {
          lastTime = currentTime;
        } else {
          lastTime += this.frameTime;
        }
        const nativeState = this.training.evaluate();
        const state = this.fromNativeState(nativeState);
        postMessage([stepNumber, finalValue, finalLosses, trainingTime, state, this.checkpointData]);
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

class ActorCriticLosses {
  constructor(lossP = 0, lossV = 0) {
    this.lossP = lossP;
    this.lossV = lossV;
  }
}

export default Trainer;
export { ActorCriticLosses };
