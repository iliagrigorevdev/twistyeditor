
import Exporter from './Exporter';
import ReplayBuffer from './ReplayBuffer';

//window.tf.enableProdMode();
//window.tf.enableDebugMode();
//window.tf.setBackend("cpu");

const logStdMin = -20;
const logStdMax = 2;
const eps = 1e-9;

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

    this.replayBuffer = new ReplayBuffer(config.replaySampleCountMax);

    this.actor = new ActorNetwork(config, this.info);
    this.critic = new CriticNetwork(config, this.info);
    this.targetCritic = new CriticNetwork(config, this.info);
    this.targetCritic.q1.setWeights(this.critic.q1.getWeights());
    this.targetCritic.q2.setWeights(this.critic.q2.getWeights());
    this.targetCritic.q1.trainable = false;
    this.targetCritic.q2.trainable = false;

    this.actorOptimizer = window.tf.train.adam(config.learningRate);
    this.criticOptimizer = window.tf.train.adam(config.learningRate);
  }

  toNativeArray(array) {
    const nativeArray = new this.simulation.FloatArray();
    nativeArray.resize(array.length, 0);
    for (let i = 0; i < array.length; i++) {
      nativeArray.set(i, array[i]);
    }
    return nativeArray;
  }

  fromNativeArray(nativeArray) {
    const array = new Array(nativeArray.size());
    for (let i = 0; i < array.length; i++) {
      array[i] = nativeArray.get(i);
    }
    return array;
  }

  run() {
    if (this.info.actionLength === 0) {
      return;
    }

    const startTime = Date.now();
    let observation = null;
    for (let i = 0; i < 4000; i++) {
      if (!observation) {
        const nativeObservation = this.simulation.reset();
        observation = this.fromNativeArray(nativeObservation);
      }

      const action = this.predict(observation, true);
      // console.log("observation", observation);
      // console.log("action", action);
      const nativeAction = this.toNativeArray(action);
      const result = this.simulation.step(nativeAction);
      const nextNativeObservation = result.observation;
      const nextObservation = this.fromNativeArray(nextNativeObservation);

      this.replayBuffer.append({
        observation: observation,
        action: action,
        reward: result.reward,
        nextObservation: nextObservation,
        done: result.done
      });

      if (result.done) {
        observation = null;
      } else {
        observation = nextObservation;
      }

      if ((i >= this.config.trainingStartStepCount) && ((i % this.config.trainingInterval) === 0)) {
        for (let j = 0; j < this.config.trainingInterval; j++) {
          const samples = this.replayBuffer.sample(this.config.batchSize);
          this.train(samples);
        }
      }
    }
    const elapsedTime = Date.now() - startTime;
    console.log("Elapsed time: " + elapsedTime);
  }

  predict(observation, deterministic) {
    return window.tf.tidy(() => {
      const observationTensor = window.tf.tensor2d([observation]);
      const {sample, } = this.actor.forward(observationTensor, deterministic, false);
      return sample.arraySync()[0];
    });
  }

  train(samples) {
    window.tf.tidy(() => {
      const observation = window.tf.tensor2d(samples.map(s => s.observation));
      const action = window.tf.tensor2d(samples.map(s => s.action));
      const reward = window.tf.tensor1d(samples.map(s => s.reward));
      const nextObservation = window.tf.tensor2d(samples.map(s => s.nextObservation));
      const undone = window.tf.tensor1d(samples.map(s => s.done ? 0 : 1));

      const criticLoss = (() => {
        // TODO Disable gradients for backup calculation
        const {sample: nextAction, logProb: nextLogProb} = this.actor.forward(nextObservation, false, true);
        const {q1: targetQ1, q2: targetQ2} = this.targetCritic.forward(nextObservation, nextAction);
        const targetQ = targetQ1.minimum(targetQ2);
        const backup = reward.add(undone.mul(this.config.discount)
                                  .mul(targetQ.sub(nextLogProb.mul(this.config.regularization))));
  
        const {q1, q2} = this.critic.forward(observation, action);
        const lossQ1 = window.tf.losses.meanSquaredError(q1, backup);
        const lossQ2 = window.tf.losses.meanSquaredError(q2, backup);
        return lossQ1.add(lossQ2);
      });

      const criticGrads = window.tf.variableGrads(criticLoss);
      this.criticOptimizer.applyGradients(criticGrads.grads);
      window.tf.dispose(criticGrads.grads);

      const actorLoss = (() => {
        const {sample, logProb} = this.actor.forward(observation, false, true);
        const {q1: sampleQ1, q2: sampleQ2} = this.critic.forward(observation, sample);
        const sampleQ = sampleQ1.minimum(sampleQ2);
        return logProb.mul(this.config.regularization).sub(sampleQ).mean();
      });
    
      this.critic.q1.trainable = false;
      this.critic.q2.trainable = false;
      const actorGrads = window.tf.variableGrads(actorLoss);
      this.critic.q1.trainable = true;
      this.critic.q2.trainable = true;
      this.actorOptimizer.applyGradients(actorGrads.grads);
      window.tf.dispose(actorGrads.grads);

      // Workaround for weight order inconsistency
      this.targetCritic.q1.trainable = true;
      this.targetCritic.q2.trainable = true;
      const onlineCriticWeights1 = this.critic.q1.getWeights();
      const onlineCriticWeights2 = this.critic.q2.getWeights();
      const targetCriticWeights1 = this.targetCritic.q1.getWeights();
      const targetCriticWeights2 = this.targetCritic.q2.getWeights();
      const finalCriticWeights1 = new Array(onlineCriticWeights1.length);
      const finalCriticWeights2 = new Array(onlineCriticWeights2.length);
      for (let i = 0; i < onlineCriticWeights1.length; i++) {
        finalCriticWeights1[i] = targetCriticWeights1[i].mul(this.config.interpolation)
                                 .add(onlineCriticWeights1[i].mul(1 - this.config.interpolation));
        finalCriticWeights2[i] = targetCriticWeights2[i].mul(this.config.interpolation)
                                 .add(onlineCriticWeights2[i].mul(1 - this.config.interpolation));
      }
      this.targetCritic.q1.setWeights(finalCriticWeights1);
      this.targetCritic.q2.setWeights(finalCriticWeights2);
      // Workaround for weight order inconsistency
      this.targetCritic.q1.trainable = false;
      this.targetCritic.q2.trainable = false;
    });
  }
}

function createMlpNetwork(hiddenLayerSizes, inputLength, outputLength) {
  if (hiddenLayerSizes.length === 0) {
    throw new Error("Hidden layer sizes must be given");
  }

  const net = window.tf.sequential();
  net.add(window.tf.layers.dense({
    inputShape: [inputLength],
    units: hiddenLayerSizes[0],
    activation: "relu"
  }));
  for (let i = 1; i < hiddenLayerSizes.length; i++) {
    net.add(window.tf.layers.dense({
      units: hiddenLayerSizes[i],
      activation: "relu"
    }));
  }
  if (outputLength > 0) {
    net.add(window.tf.layers.dense({
      units: outputLength
    }));
  }
  return net;
}

class ActorNetwork {
  constructor(config, info) {
    this.net = createMlpNetwork(config.hiddenLayerSizes, info.observationLength, 0);
    this.muLayer = window.tf.layers.dense({units: info.actionLength});
    this.logStdLayer = window.tf.layers.dense({units: info.actionLength});
  }

  forward(observation, deterministic, withLogProb) {
    const netOut = this.net.apply(observation);
    const mu = this.muLayer.apply(netOut);
    let logStd;
    let std;
    if (!deterministic || withLogProb) {
      logStd = this.logStdLayer.apply(netOut);
      logStd = window.tf.clipByValue(logStd, logStdMin, logStdMax);
      std = window.tf.exp(logStd);
    }
    let sample = mu;
    if (!deterministic) {
      sample = sample.add(window.tf.randomNormal(mu.shape).mul(std));
    }
    let logProb;
    if (withLogProb) {
      logProb = sample.sub(mu).div(std.add(eps)).square()
                .add(logStd.mul(2)).add(Math.log(2 * Math.PI))
                .mul(-0.5);
      logProb = logProb.sum(1);
      logProb = logProb.sub(sample.neg().add(Math.log(2))
                            .sub(sample.neg().mul(2).softplus())
                            .mul(2));
      logProb = logProb.sum(1);
    }
    sample = window.tf.tanh(sample);
    return {sample: sample, logProb: logProb};
  }
}

class CriticNetwork {
  constructor(config, info) {
    this.q1 = createMlpNetwork(config.hiddenLayerSizes, info.observationLength + info.actionLength, 1);
    this.q2 = createMlpNetwork(config.hiddenLayerSizes, info.observationLength + info.actionLength, 1);
  }

  forward(observation, action) {
    const observationAction = observation.concat(action, 1);
    return {
      q1: this.q1.apply(observationAction).squeeze(1),
      q2: this.q2.apply(observationAction).squeeze(1)
    };
  }
}

export default Learning;
