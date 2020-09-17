import UrdfExporter, { PRISM_MESH_NAME, PRISM_MESH_FILENAME } from './UrdfExporter';
import { PRISM_TRIANGLE_INDICES } from './Prism';
import { PRISM_COLLISION_VERTICES } from './RigidInfo';
import { convertVectorToZUpFrame } from './VecMath';
import { createMeshLines } from './Mesh';

class NotebookExporter {
  constructor(shape) {
    this.urdfExporter = new UrdfExporter(shape);
    this.notebook = null;
  }

  validate() {
    if (!this.urdfExporter.rigidInfo.links.length) {
      return "Shape must have at least one prism";
    }
    if (!this.urdfExporter.rigidInfo.joints.length) {
      return "Shape must have at least one actuator";
    }
  }

  export(name) {
    this.notebook = {
      nbformat: 4,
      nbformat_minor: 0,
      metadata: {
        kernelspec: {
          name: "python3",
          display_name: "Python 3"
        }
      },
      cells: []
    };
    this.addCodeCell(this.getInstallCode());
    this.addCodeCell(this.getImportCode());
    this.addCodeCell(this.getMeshFileCode());
    this.addCodeCell(this.getUrdfFileCode(name));
    this.addCodeCell(this.getEnvCode());
    this.addCodeCell(this.getTrainCode(name));
    this.addCodeCell(this.getTensorboardCode());
    this.addCodeCell(this.getEnjoyCode(name));
    return JSON.stringify(this.notebook);
  }

  addCodeCell(codeLines) {
    this.notebook.cells.push({
      cell_type: "code",
      execution_count: null,
      metadata: {},
      source: codeLines.join("\n")
    });
  }

  getInstallCode() {
    return [
      "!pip install pybullet",
      "!pip install stable-baselines3"
    ];
  }

  getImportCode() {
    return [
      "import time",
      "import gym",
      "import numpy as np",
      "import pybullet as p",
      "from gym import spaces",
      "from gym.utils import seeding",
      "from stable_baselines3 import SAC",
      "from stable_baselines3.sac import MlpPolicy",
      "from stable_baselines3.common.callbacks import EvalCallback"
    ];
  }

  getMeshFileCode() {
    const vertices = PRISM_COLLISION_VERTICES.map(vertex => convertVectorToZUpFrame(vertex));
    const meshLines = createMeshLines(PRISM_MESH_NAME, vertices, PRISM_TRIANGLE_INDICES);
    const code = ["with open('" + PRISM_MESH_FILENAME + "', 'w') as file:"];
    for (const line of meshLines) {
      code.push("  file.write(\"" + line + "\\n\")");
    }
    return code;
  }

  getUrdfFileCode(name) {
    const content = this.urdfExporter.export(name);
    const safeContent = content
        .replace(/(\r\n|\n|\r)/g, "")
        .replace(/"/g, "'");
    return [
      "with open('" + name + ".urdf', 'w') as file:",
      "  file.write(\"" + safeContent + "\")",
    ];
  }

  getEnvCode() {
    return [
      "TIME_STEP = 1 / 240",
      "SKIP_FRAMES = 4",
      "FIXED_TIME_STEP = TIME_STEP * SKIP_FRAMES",
      "NUM_SOLVER_ITERATIONS = 5",
      "",
      "GRAVITY = 9.81",
      "FRICTION_GROUND = 0.5",
      "FRICTION_PRISM = 0.5",
      "RESTITUTION_GROUND = 0.5",
      "RESTITUTION_PRISM = 0.5",
      "",
      "MAX_EPISODE_STEPS = 1000",
      "GOAL_DISTANCE = 20.0",
      "GOAL_ACHIEVED_DISTANCE = 1.0",
      "ALIVE_RELATIVE_HEIGHT_MIN = -0.5",
      "ALIVE_LEAN_ANGLE_MAX = np.radians(15)",
      "",
      "JOINT_VELOCITY_SCALE = 0.1",
      "LOCAL_VELOCITY_SCALE = 0.3",
      "",
      "PROGRESS_REWARD_WEIGHT = 1",
      "ELECTRICITY_REWARD_WEIGHT = -1",
      "",
      "class TwistyEnv(gym.Env):",
      "  def __init__(self, filePath, useRendering):",
      "    self.steps = 0",
      "    self.goalX = GOAL_DISTANCE",
      "    self.goalY = 0",
      "    self.prevPotential = self.getPotential(GOAL_DISTANCE)",
      "",
      "    if useRendering:",
      "      self.physicsClientId = p.connect(p.GUI)",
      "    else:",
      "      self.physicsClientId = p.connect(p.DIRECT)",
      "    p.setPhysicsEngineParameter(fixedTimeStep=FIXED_TIME_STEP,",
      "                                numSolverIterations=NUM_SOLVER_ITERATIONS,",
      "                                numSubSteps=SKIP_FRAMES,",
      "                                physicsClientId=self.physicsClientId)",
      "    p.setGravity(0, 0, -GRAVITY, physicsClientId=self.physicsClientId)",
      "    groundShapeId = p.createCollisionShape(p.GEOM_PLANE, physicsClientId=self.physicsClientId)",
      "    groundId = p.createMultiBody(0, groundShapeId, physicsClientId=self.physicsClientId)",
      "    p.changeDynamics(groundId, -1, lateralFriction=FRICTION_GROUND, restitution=RESTITUTION_GROUND,",
      "                     physicsClientId=self.physicsClientId)",
      "    self.bodyId = p.loadURDF(filePath, physicsClientId=self.physicsClientId)",
      "    self.initialPosition, self.initialOrientation = p.getBasePositionAndOrientation(",
      "        self.bodyId, physicsClientId=self.physicsClientId)",
      "    p.changeDynamics(self.bodyId, -1, lateralFriction=FRICTION_PRISM, restitution=RESTITUTION_PRISM,",
      "                     physicsClientId=self.physicsClientId)",
      "    self.numJoints = p.getNumJoints(self.bodyId, physicsClientId=self.physicsClientId)",
      "    self.middleLimits = []",
      "    self.rangeLimits = []",
      "    self.forceLimits = []",
      "    for i in range(self.numJoints):",
      "      p.changeDynamics(self.bodyId, i, lateralFriction=FRICTION_PRISM, restitution=RESTITUTION_PRISM,",
      "                       physicsClientId=self.physicsClientId)",
      "      jointInfo = p.getJointInfo(self.bodyId, i, physicsClientId=self.physicsClientId)",
      "      lowerLimit = jointInfo[8]",
      "      upperLimit = jointInfo[9]",
      "      middleLimit = 0.5 * (lowerLimit + upperLimit)",
      "      rangeLimit = 0.5 * (upperLimit - lowerLimit)",
      "      self.middleLimits.append(middleLimit)",
      "      self.rangeLimits.append(rangeLimit)",
      "      self.forceLimits.append(jointInfo[10])",
      "",
      "    self.posX = 0",
      "    self.posY = 0",
      "    self.posZ = 0",
      "    self.roll = 0",
      "    self.pitch = 0",
      "    self.yaw = 0",
      "    self.jointPositions = [0] * self.numJoints",
      "    self.jointVelocities = [0] * self.numJoints",
      "    self.getState()",
      "",
      "    self.action_space = spaces.Box(-1, 1, (self.numJoints,), np.float32)",
      "    self.observation_space = spaces.Box(-1, 1, self.getObservation().shape, np.float32)",
      "",
      "    self.seed()",
      "",
      "  def seed(self, seed=None):",
      "    self.rng, seed = seeding.np_random(seed)",
      "    return [seed]",
      "",
      "  def getState(self):",
      "    (self.posX, self.posY, self.posZ), orientation = p.getBasePositionAndOrientation(",
      "        self.bodyId, physicsClientId=self.physicsClientId)",
      "    self.roll, self.pitch, self.yaw = p.getEulerFromQuaternion(",
      "        orientation, physicsClientId=self.physicsClientId)",
      "    for i in range(self.numJoints):",
      "      jointState = p.getJointState(self.bodyId, i, physicsClientId=self.physicsClientId)",
      "      self.jointPositions[i] = (jointState[0] - self.middleLimits[i]) / self.rangeLimits[i]",
      "      self.jointVelocities[i] = jointState[1] * JOINT_VELOCITY_SCALE",
      "",
      "  def getObservation(self):",
      "    observation = []",
      "",
      "    timeFeature = 1 - self.steps / MAX_EPISODE_STEPS",
      "",
      "    goalAngle = np.arctan2(self.goalY - self.posY, self.goalX - self.posX)",
      "    angleToGoal = goalAngle - self.yaw",
      "",
      "    cosInvYaw = np.cos(-self.yaw)",
      "    sinInvYaw = np.sin(-self.yaw)",
      "    invYawRotation = np.array([[cosInvYaw, -sinInvYaw, 0],",
      "                               [sinInvYaw, cosInvYaw, 0],",
      "                               [0, 0, 1]])",
      "    linearVelocity, _ = p.getBaseVelocity(self.bodyId, physicsClientId=self.physicsClientId)",
      "    localVelocity = np.dot(invYawRotation, linearVelocity)",
      "",
      "    observation.append(timeFeature)",
      "    observation.append(self.getRelativeHeight())",
      "    observation.append(np.sin(angleToGoal))",
      "    observation.append(np.cos(angleToGoal))",
      "    observation.append(self.roll)",
      "    observation.append(self.pitch)",
      "    observation.extend(localVelocity * LOCAL_VELOCITY_SCALE)",
      "",
      "    for i in range(self.numJoints):",
      "      observation.append(self.jointPositions[i])",
      "      observation.append(self.jointVelocities[i])",
      "",
      "    return np.clip(observation, -1, 1)",
      "",
      "  def getGoalDistance(self):",
      "    dx = self.goalX - self.posX",
      "    dy = self.goalY - self.posY",
      "    return np.sqrt(dx * dx + dy * dy)",
      "",
      "  def getRelativeHeight(self):",
      "    return self.posZ / self.initialPosition[2] - 1",
      "",
      "  def isAlive(self):",
      "    return ((self.getRelativeHeight() >= ALIVE_RELATIVE_HEIGHT_MIN)",
      "            and (np.abs(self.roll) <= ALIVE_LEAN_ANGLE_MAX)",
      "            and (np.abs(self.pitch) <= ALIVE_LEAN_ANGLE_MAX))",
      "",
      "  def getPotential(self, goalDistance):",
      "    return -goalDistance / FIXED_TIME_STEP",
      "",
      "  def getElectricityCost(self, action):",
      "    electricityCost = 0",
      "    for i in range(self.numJoints):",
      "      electricityCost += np.abs(action[i] * self.jointVelocities[i])",
      "    electricityCost /= self.numJoints",
      "    return electricityCost",
      "",
      "  def step(self, action):",
      "    assert (len(action) == self.numJoints)",
      "    assert np.isfinite(action).all()",
      "",
      "    self.steps += 1",
      "    for i in range(self.numJoints):",
      "      force = action[i] * self.forceLimits[i]",
      "      p.setJointMotorControl2(self.bodyId, i, p.TORQUE_CONTROL, force=force,",
      "                              physicsClientId=self.physicsClientId)",
      "    p.stepSimulation(physicsClientId=self.physicsClientId)",
      "    self.getState()",
      "",
      "    goalDistance = self.getGoalDistance()",
      "    potential = self.getPotential(goalDistance)",
      "    progress = potential - self.prevPotential",
      "    self.prevPotential = potential",
      "",
      "    reward = (progress * PROGRESS_REWARD_WEIGHT",
      "              + self.getElectricityCost(action) * ELECTRICITY_REWARD_WEIGHT)",
      "    done = ((self.steps >= MAX_EPISODE_STEPS) or (goalDistance <= GOAL_ACHIEVED_DISTANCE)",
      "            or not self.isAlive())",
      "    return self.getObservation(), reward, done, {}",
      "",
      "  def resetGoal(self):",
      "    goalAngle = self.rng.rand() * 2 * np.pi",
      "    self.goalX = GOAL_DISTANCE * np.cos(goalAngle)",
      "    self.goalY = GOAL_DISTANCE * np.sin(goalAngle)",
      "    self.prevPotential = self.getPotential(self.getGoalDistance())",
      "",
      "  def reset(self):",
      "    p.resetBasePositionAndOrientation(self.bodyId, self.initialPosition, self.initialOrientation,",
      "                                      physicsClientId=self.physicsClientId)",
      "    p.resetBaseVelocity(self.bodyId, [0, 0, 0], [0, 0, 0], physicsClientId=self.physicsClientId)",
      "    for i in range(self.numJoints):",
      "      p.resetJointState(self.bodyId, i, 0, physicsClientId=self.physicsClientId)",
      "    self.getState()",
      "",
      "    self.steps = 0",
      "    self.resetGoal()",
      "",
      "    return self.getObservation()",
      "",
      "  def render(self, mode='human'):",
      "    time.sleep(FIXED_TIME_STEP)",
      "",
      "  def close(self):",
      "    p.disconnect(physicsClientId=self.physicsClientId)",
      "    self.physicsClientId = -1"
    ];
  }

  getTrainCode(name) {
    return [
      "env = TwistyEnv('" + name + ".urdf', False)",
      "evalEnv = TwistyEnv('" + name + ".urdf', False)",
      "evalCallback = EvalCallback(evalEnv,",
      "                            best_model_save_path='./logs/',",
      "                            n_eval_episodes=5, eval_freq=10000,",
      "                            deterministic=True, render=False)",
      "model = SAC(MlpPolicy, env, verbose=1,",
      "            learning_rate=1e-3,",
      "            buffer_size=200000,",
      "            batch_size=256,",
      "            gamma=0.98,",
      "            tau=0.02,",
      "            learning_starts=10000,",
      "            policy_kwargs=dict(net_arch=[256, 256]),",
      "            tensorboard_log='tensorboard')",
      "model.learn(total_timesteps=1000000, log_interval=1,",
      "            callback=evalCallback)",
      "model.save('" + name + "')",
      "del model",
      "env.close()",
      "evalEnv.close()",
    ];
  }

  getTensorboardCode() {
    return [
      "%load_ext tensorboard",
      "%tensorboard --logdir tensorboard"
    ];
  }

  getEnjoyCode(name) {
    return [
      "model = SAC.load('" + name + "')",
      "env = TwistyEnv('" + name + ".urdf', True)",
      "obs = env.reset()",
      "totalReward = 0",
      "while True:",
      "    action, _ = model.predict(obs, deterministic=True)",
      "    obs, reward, done, _ = env.step(action)",
      "    totalReward += reward",
      "    env.render()",
      "    if done:",
      "      print('Episode reward: ', totalReward)",
      "      obs = env.reset()",
      "      totalReward = 0"
    ];
  }
}

export default NotebookExporter;
