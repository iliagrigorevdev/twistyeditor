import * as argparse from 'argparse';
import * as fs from 'fs';

import ReplayBuffer from './ReplayBuffer';
import OUActionNoise from './OUActionNoise';

import Agent from './Agent';
import Shape from './Shape';

let tf;

const GAMMA = 0.99;
const TAU = 0.995;
const ACTOR_LEARNING_RATE = 1e-4;
const CRITIC_LEARNING_RATE = 1e-3;
const LAST_ACTOR_LAYER_INIT_RANGE = 0.003;
const ACTION_NOISE_STDDEV = 0.2;
const LEARNING_STARTS = 100;
const BATCH_SIZE = 64;
const REPLAY_BUFFER_SIZE = 1e5;
const MAX_EPISODE_STEPS = 300;
const GOAL_DISTANCE_REWARD_WEIGHT = 1;

class DDPG extends Agent {
  constructor(shape) {
    super(shape);
    this.replayBuffer = new ReplayBuffer(REPLAY_BUFFER_SIZE);
    this.lastState = null;
    this.trainSteps = 0;
    this.episodeSteps = 0;
    this.episodeTime = 0;
    this.totalReward = 0;

    this.onlineActorNetwork = null;
    this.onlineCriticNetwork = null;
    this.targetActorNetwork = null;
    this.targetCriticNetwork = null;
    this.actorOptimizer = null;
    this.criticOptimizer = null;
    this.actionNoise = null;

    this.initialized = false;

    this.reset();
  }

  reset() {
    super.reset();
    this.lastState = null;
    this.episodeSteps = 0;
    this.totalReward = 0;
    if (this.actionNoise) {
      this.actionNoise.reset();
    }
  }

  init() {
    this.onlineActorNetwork = this.createActorNetwork();
    this.onlineCriticNetwork = this.createCriticNetwork();
    this.targetActorNetwork = this.createActorNetwork();
    this.targetActorNetwork.setWeights(this.onlineActorNetwork.getWeights());
    this.targetActorNetwork.trainable = false;
    this.targetCriticNetwork = this.createCriticNetwork();
    this.targetCriticNetwork.setWeights(this.onlineCriticNetwork.getWeights());
    this.targetCriticNetwork.trainable = false;
    this.actorOptimizer = tf.train.adam(ACTOR_LEARNING_RATE);
    this.criticOptimizer = tf.train.adam(CRITIC_LEARNING_RATE);
    this.actionNoise = new OUActionNoise(this.getActionSize(), 0, ACTION_NOISE_STDDEV);
    console.log("Learning initialized: stateSize=" + this.getStateSize()
        + ", actionSize=" + this.getActionSize());
  }

  createActorNetwork() {
    const input = tf.input({shape: [this.getStateSize()]});
    let output = tf.layers.dense({units: 512, activation: "relu"}).apply(input);
    output = tf.layers.batchNormalization().apply(output);
    output = tf.layers.dense({units: 512, activation: "relu"}).apply(output);
    output = tf.layers.batchNormalization().apply(output);
    const lastLayerInitializer = tf.initializers.randomUniform({
        minval: -LAST_ACTOR_LAYER_INIT_RANGE, maxval: LAST_ACTOR_LAYER_INIT_RANGE});
    output = tf.layers.dense({units: this.getActionSize(), activation: "tanh",
        kernelInitializer: lastLayerInitializer}).apply(output);

    return tf.model({inputs: input, outputs: output});
  }

  createCriticNetwork() {
    const stateInput = tf.input({shape: [this.getStateSize()]});
    let stateOutput = tf.layers.dense({units: 16, activation: "relu"}).apply(stateInput);
    stateOutput = tf.layers.batchNormalization().apply(stateOutput);
    stateOutput = tf.layers.dense({units: 32, activation: "relu"}).apply(stateOutput);
    stateOutput = tf.layers.batchNormalization().apply(stateOutput);

    const actionInput = tf.input({shape: [this.getActionSize()]});
    let actionOutput = tf.layers.dense({units: 32, activation: "relu"}).apply(actionInput);
    actionOutput = tf.layers.batchNormalization().apply(actionOutput);

    let output = tf.layers.concatenate().apply([stateOutput, actionOutput]);
    output = tf.layers.dense({units: 512, activation: "relu"}).apply(output);
    output = tf.layers.batchNormalization().apply(output);
    output = tf.layers.dense({units: 512, activation: "relu"}).apply(output);
    output = tf.layers.batchNormalization().apply(output);
    output = tf.layers.dense({units: 1}).apply(output);

    return tf.model({inputs: [stateInput, actionInput], outputs: output});
  }

  addNoise(action) {
    const noise = this.actionNoise.next();
    for (let i = 0; i < action.length; i++) {
      action[i] = Math.max(-1, Math.min(1, action[i] + noise[i]));
    }
  }

  getEpisodeElapsedTimeInSecs() {
    return Math.floor(1e-3 * (Date.now() - this.episodeTime));
  }

  updateWeights(targetNetwork, onlineNetwork) {
    // Workaround for weight order inconsistency
    targetNetwork.trainable = true;
    onlineNetwork.trainable = true;

    tf.tidy(() => {
      const targetWeights = targetNetwork.getWeights();
      const onlineWeights = onlineNetwork.getWeights();
      const finalWeights = [];
      for (let i = 0; i < targetWeights.length; i++) {
        finalWeights.push(targetWeights[i].mul(TAU).add(onlineWeights[i].mul(1 - TAU)));
      }
      targetNetwork.setWeights(finalWeights);
    });

    // Workaround for weight order inconsistency
    targetNetwork.trainable = false;
    onlineNetwork.trainable = true;
  }

  train(numSteps) {
    if (!this.simulation.initialized || (this.getActionSize() === 0)) {
      return;
    }

    if (!this.lastState) {
      this.lastState = this.getState();
    }

    if (!this.initialized) {
      this.init();
      this.initialized = true;
    }

    for (let i = 0; i < numSteps; i++) {
      const state = this.lastState;
      const goalDistance = this.getGoalDistance();

      const action = this.predictAction(this.onlineActorNetwork, state, true);
      this.addNoise(action);
      this.applyAction(action);
      for (let i = 0; i < this.skipFrames; i++) {
        this.step();
      }
      this.trainSteps++;

      const nextGoalDistance = this.getGoalDistance();
      const reward = (goalDistance - nextGoalDistance) * GOAL_DISTANCE_REWARD_WEIGHT;
      const nextState = this.getState();
      this.replayBuffer.append([state, action, reward, nextState]);
      this.lastState = nextState;
      this.totalReward += reward;

      if (this.trainSteps >= LEARNING_STARTS) {
        if (this.trainSteps === LEARNING_STARTS) {
          console.log("Learning starts");
        }
        if (this.episodeSteps === 0) {
          this.episodeTime = Date.now();
        }

        const batch = this.replayBuffer.sample(BATCH_SIZE);

        const criticLosses = (() => tf.tidy(() => {
          const stateTensor = tf.tensor2d(batch.map(sample => sample[0]));
          const actionTensor = tf.tensor2d(batch.map(sample => sample[1]));
          const qs = this.onlineCriticNetwork.predict([stateTensor, actionTensor]).max(-1);

          const rewardTensor = tf.tensor1d(batch.map(sample => sample[2]));
          const nextStateTensor = tf.tensor2d(batch.map(sample => sample[3]));
          const nextActionTensor = this.targetActorNetwork.predict(nextStateTensor);
          const nextMaxQTensor = this.targetCriticNetwork.predict(
              [nextStateTensor, nextActionTensor]).max(-1);
          const targetQs = rewardTensor.add(nextMaxQTensor.mul(GAMMA));

          return tf.losses.meanSquaredError(targetQs, qs);
        }));

        const actorLosses = (() => tf.tidy(() => {
          const stateTensor = tf.tensor2d(batch.map(sample => sample[0]));
          const actionTensor = this.onlineActorNetwork.predict(stateTensor);
          const qs = this.onlineCriticNetwork.predict([stateTensor, actionTensor]).max(-1);

          return qs.mean().neg();
        }));

        const criticGrads = tf.variableGrads(criticLosses);
        this.criticOptimizer.applyGradients(criticGrads.grads);
        tf.dispose(criticGrads.grads);

        this.onlineCriticNetwork.trainable = false;
        const actorGrads = tf.variableGrads(actorLosses);
        this.onlineCriticNetwork.trainable = true;
        this.actorOptimizer.applyGradients(actorGrads.grads);
        tf.dispose(actorGrads.grads);

        this.updateWeights(this.targetCriticNetwork, this.onlineCriticNetwork);
        this.updateWeights(this.targetActorNetwork, this.onlineActorNetwork);

        this.episodeSteps++;
      }

      if (this.episodeSteps >= MAX_EPISODE_STEPS) {
        console.log("Episode finished: reward=" + Math.floor(this.totalReward)
            + ", time=" + this.getEpisodeElapsedTimeInSecs());
        this.reset();
        this.lastState = this.getState();
      } else if (this.isGoalAchieved(nextGoalDistance)) {
        console.log("Goal achieved: time=" + this.getEpisodeElapsedTimeInSecs());
        this.resetGoal();
        this.lastState = this.getState();
      }
    }

    this.update();
  }
}

export function parseArguments() {
  const parser = new argparse.ArgumentParser({
    description: "Training script for a DDPG that plays the snake game"
  });
  parser.add_argument("--gpu", {
    action: "store_true",
    help: "Whether to use GPU for training (requires CUDA, drivers, and libraries)."
  });
  parser.add_argument("--shapePath", {
    type: "str",
    default: "./shapes/cat.twy",
    help: "Path to the file from which the shape will be loaded."
  });
  parser.add_argument("--saveDir", {
    type: "str",
    default: "./models",
    help: "Path to the directory for writing the online DDPG after training."
  });
  return parser.parse_args();
}

async function main() {
  const args = parseArguments();
  if (args.gpu) {
    tf = require("@tensorflow/tfjs-node-gpu");
  } else {
    tf = require("@tensorflow/tfjs-node");
  }

  tf.enableProdMode();

  const shapeArchive = fs.readFileSync(args.shapePath);
  const shape = Shape.load(shapeArchive);
  const ddpg = new DDPG(shape);
  ddpg.simulation.initializing.then(() => {
    ddpg.train(10000);
    // TODO save model to saveDir
  });
}

if (require.main === module) {
  main();
}
