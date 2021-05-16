
import * as tf from '@tensorflow/tfjs';
import Exporter from './Exporter';

//tf.enableProdMode();
//tf.enableDebugMode();
//tf.setBackend("wasm");
tf.setBackend("cpu");

class Learning {
  constructor(config, simulation, shape) {
    this.config = config;
    this.simulation = simulation;

    const exporter = new Exporter(shape);
    const data = exporter.export(shape.name);
    this.info = this.simulation.create(data);

    if (this.info.actionLength === 0) {
      return;
    }

    this.actor = new ActorNetwork(config, this.info);
  }

  train() {
    if (this.info.actionLength === 0) {
      return;
    }

    const startTime = Date.now();
    let observation = null;
    const observationArray = new Array(this.info.observationLength);
    const action = new this.simulation.FloatArray();
    action.resize(this.info.actionLength, 0);
    for (let i = 0; i < 4000; i++) {
      if (!observation) {
        observation = this.simulation.reset();
      }
      for (let j = 0; j < observationArray.length; j++) {
        observationArray[j] = observation.get(j);
      }
      // console.log(observationArray);
      const actionArray = this.predict(observationArray, true);
      // console.log(actionArray);
      for (let j = 0; j < actionArray.length; j++) {
        action.set(j, actionArray[j]);
      }
      const state = this.simulation.step(action);
      if (state.done) {
        observation = null;
      } else {
        observation = state.observation;
      }
    }
    const elapsedTime = Date.now() - startTime;
    console.log("Elapsed time: " + elapsedTime);
  }

  predict(observation, deterministic) {
    return tf.tidy(() => {
      return this.actor.mu.predict(tf.tensor2d([observation])).arraySync()[0];
    });
  }
}

function createMlpNetwork(input, hiddenLayerSizes, outputLength) {
  if (hiddenLayerSizes.length === 0) {
    throw new Error("Hidden layer sizes must be given");
  }

  let output = input;
  for (let i = 0; i < hiddenLayerSizes.length; i++) {
    output = tf.layers.dense({units: hiddenLayerSizes[i], activation: "relu"}).apply(output);
  }
  if (outputLength > 0) {
    output = tf.layers.dense({units: outputLength}).apply(output);
  }
  return output;
}

class ActorNetwork {
  constructor(config, info) {
    const input = tf.input({shape: [info.observationLength]});
    const network = createMlpNetwork(input, config.hiddenLayerSizes, 0);

    this.mu = tf.layers.dense({units: info.actionLength}).apply(network);
    this.mu = tf.layers.activation({activation: "tanh"}).apply(this.mu);
    this.mu = tf.model({inputs: input, outputs: this.mu});
  }
}

export default Learning;
