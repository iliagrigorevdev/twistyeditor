import * as tf from '@tensorflow/tfjs';
import Simulation from './Simulation';

const MAX_SUB_STEPS = 10;
const FIXED_TIME_STEP = 0.01;

const SKIP_FRAMES = 10;
const GOAL_DISTANCE = 20;
const GOAL_ACHIEVED_DISTANCE = 1;

class Agent {
  constructor(shape) {
    this.simulation = new Simulation(shape);
    this.skipFrames = SKIP_FRAMES;
    this.playFrames = 0;
    this.goalX = 0;
    this.goalZ = 0;
    this.localTime = 0;

    this.actorNetwork = null;

    this.reset();
  }

  reset() {
    this.playFrames = 0;
    this.localTime = 0;
    this.simulation.reset();
    this.resetGoal();
  }

  resetGoal() {
    const angle = Math.random() * 2 * Math.PI;
    this.goalX = GOAL_DISTANCE * Math.sin(angle);
    this.goalZ = GOAL_DISTANCE * Math.cos(angle);
  }

  getState() {
    return [this.goalX, this.goalZ].concat(this.simulation.getState());
  }

  getStateSize() {
    return this.lastState.length;
  }

  getActionSize() {
    return this.simulation.angleScales.length;
  }

  loadActorNetwork(modelUrl) {
    tf.enableProdMode();
    tf.loadLayersModel(modelUrl).then(result => {
      // TODO validate state and action size
      this.actorNetwork = result;
    });
  }

  predictAction(actorNetwork, state) {
    let action;
    tf.tidy(() => {
      const stateTensor = tf.tensor2d([state]);
      action = actorNetwork.predict(stateTensor).arraySync()[0];
    });
    return action;
  }

  applyAction(action) {
    for (let i = 0; i < action.length; i++) {
      this.simulation.angleScales[i] = action[i];
    }
  }

  getGoalDistance() {
    const goalDistX = this.goalX - this.simulation.shapePosition[0];
    const goalDistZ = this.goalZ - this.simulation.shapePosition[2];
    return Math.sqrt(goalDistX * goalDistX + goalDistZ * goalDistZ);
  }

  isGoalAchieved(distance) {
    return (distance <= GOAL_ACHIEVED_DISTANCE);
  }

  step() {
    this.simulation.stepOnce(FIXED_TIME_STEP, false);
  }

  update() {
    this.simulation.updatePrismTransforms();
  }

  play(deltaTime) {
    if (!this.simulation.initialized) {
      return;
    }

    this.localTime += deltaTime;
    if (this.localTime < FIXED_TIME_STEP) {
      return;
    }

    const hasBrain = (this.actorNetwork && (this.getActionSize() > 0));

    const maxSubSteps = Math.min(Math.floor(this.localTime / FIXED_TIME_STEP), MAX_SUB_STEPS);
    this.localTime -= maxSubSteps * FIXED_TIME_STEP;
    for (let i = 0; i < maxSubSteps; i++) {
      if (hasBrain && ((this.playFrames % this.skipFrames) === 0)) {
        const state = this.getState();
        const action = this.predictAction(this.actorNetwork, state);
        this.applyAction(action);
      }
      this.step();
      this.playFrames++;
    }
    this.update();

    if (hasBrain && (this.isGoalAchieved(this.getGoalDistance()))) {
      this.resetGoal();
      this.playFrames = 0;
    }
  }
}

export default Agent;
