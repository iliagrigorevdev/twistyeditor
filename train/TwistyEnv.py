import time
import gym
from gym import spaces
from gym.utils import seeding
import numpy as np
import pybullet as p

TIME_STEP = 0.01
SKIP_FRAMES = 4
FIXED_TIME_STEP = TIME_STEP * SKIP_FRAMES
NUM_SOLVER_ITERATIONS = 5

GRAVITY = 9.81
FRICTION_GROUND = 3.0
FRICTION_PRISM = 0.2
RESTITUTION_GROUND = 0.1
RESTITUTION_PRISM = 0.3

MAX_EPISODE_STEPS = 300
GOAL_DISTANCE = 20.0
GOAL_ACHIEVED_DISTANCE = 1.0

JOINT_VELOCITY_SCALE = 0.1
LOCAL_VELOCITY_SCALE = 0.3

class TwistyEnv(gym.Env):
  def __init__(self, filePath, useRendering):
    self.steps = 0
    self.goalX = 0
    self.goalY = 0
    self.prevPotential = 0

    if useRendering:
      self.physicsClientId = p.connect(p.GUI)
    else:
      self.physicsClientId = p.connect(p.DIRECT)
    p.setPhysicsEngineParameter(fixedTimeStep=FIXED_TIME_STEP,
                                numSolverIterations=NUM_SOLVER_ITERATIONS,
                                numSubSteps=SKIP_FRAMES,
                                physicsClientId=self.physicsClientId)
    p.setGravity(0, 0, -GRAVITY, physicsClientId=self.physicsClientId)
    groundShapeId = p.createCollisionShape(p.GEOM_PLANE, physicsClientId=self.physicsClientId)
    groundId = p.createMultiBody(0, groundShapeId, physicsClientId=self.physicsClientId)
    p.changeDynamics(groundId, -1, lateralFriction=FRICTION_GROUND, restitution=RESTITUTION_GROUND)
    self.bodyId = p.loadURDF(filePath, physicsClientId=self.physicsClientId)
    self.initialPosition, self.initialOrientation = p.getBasePositionAndOrientation(self.bodyId, physicsClientId=self.physicsClientId)
    p.changeDynamics(self.bodyId, -1, lateralFriction=FRICTION_PRISM, restitution=RESTITUTION_PRISM)
    self.numJoints = p.getNumJoints(self.bodyId, physicsClientId=self.physicsClientId)
    self.middleLimits = []
    self.rangeLimits = []
    self.forceLimits = []
    self.velocityLimits = []
    for i in range(self.numJoints):
      p.changeDynamics(self.bodyId, i, lateralFriction=FRICTION_PRISM, restitution=RESTITUTION_PRISM)
      jointInfo = p.getJointInfo(self.bodyId, i, physicsClientId=self.physicsClientId)
      lowerLimit = jointInfo[8]
      upperLimit = jointInfo[9]
      middleLimit = 0.5 * (lowerLimit + upperLimit)
      rangeLimit = 0.5 * (upperLimit - lowerLimit)
      self.middleLimits.append(middleLimit)
      self.rangeLimits.append(rangeLimit)
      self.forceLimits.append(jointInfo[10])
      self.velocityLimits.append(jointInfo[11])

    self.action_space = spaces.Box(-1, 1, (self.numJoints,), np.float32)
    self.observation_space = spaces.Box(-np.inf, np.inf, self.getObservation().shape, np.float32)

    self.seed()

  def seed(self, seed=None):
    self.rng, seed = seeding.np_random(seed)
    return [seed]

  def getObservation(self):
    observation = []

    position, orientation = p.getBasePositionAndOrientation(self.bodyId, physicsClientId=self.physicsClientId)
    goalAngle = np.arctan2(self.goalY - position[1], self.goalX - position[0])
    roll, pitch, yaw = p.getEulerFromQuaternion(orientation, physicsClientId=self.physicsClientId)
    angleToGoal = goalAngle - yaw

    cosInvYaw = np.cos(-yaw)
    sinInvYaw = np.sin(-yaw)
    invYawRotation = np.array([[cosInvYaw, -sinInvYaw, 0],
                               [sinInvYaw, cosInvYaw, 0],
                               [0, 0, 1]])
    linearVelocity, _ = p.getBaseVelocity(self.bodyId, physicsClientId=self.physicsClientId)
    localVelocity = np.dot(invYawRotation, linearVelocity)

    observation.append(np.sin(angleToGoal))
    observation.append(np.cos(angleToGoal))
    observation.append(roll)
    observation.append(pitch)
    observation.extend(localVelocity * LOCAL_VELOCITY_SCALE)

    for i in range(self.numJoints):
      jointState = p.getJointState(self.bodyId, i, physicsClientId=self.physicsClientId)
      jointPosition = jointState[0]
      jointVelocity = jointState[1]
      normalizedPosition = (jointPosition - self.middleLimits[i]) / self.rangeLimits[i]
      scaledVelocity = jointVelocity * JOINT_VELOCITY_SCALE
      observation.append(normalizedPosition)
      observation.append(scaledVelocity)

    return np.array(observation)

  def getGoalDistance(self):
    position, _ = p.getBasePositionAndOrientation(self.bodyId, physicsClientId=self.physicsClientId)
    return np.linalg.norm([self.goalY - position[1], self.goalX - position[0]])

  def getPotential(self, goalDistance):
    return -goalDistance / FIXED_TIME_STEP

  def step(self, action):
    assert (len(action) == self.numJoints)
    assert np.isfinite(action).all()

    self.steps += 1
    for i in range(self.numJoints):
      targetPosition = self.middleLimits[i] + action[i] * self.rangeLimits[i]
      p.setJointMotorControl2(self.bodyId, i, p.POSITION_CONTROL, targetPosition=targetPosition,
                              force=self.forceLimits[i], maxVelocity=self.velocityLimits[i],
                              physicsClientId=self.physicsClientId)
    p.stepSimulation(physicsClientId=self.physicsClientId)

    goalDistance = self.getGoalDistance()
    potential = self.getPotential(goalDistance)
    progress = potential - self.prevPotential
    self.prevPotential = potential

    reward = progress
    done = (self.steps >= MAX_EPISODE_STEPS) or (goalDistance <= GOAL_ACHIEVED_DISTANCE)
    return self.getObservation(), reward, done, {}

  def reset(self):
    self.steps = 0
    goalAngle = self.rng.rand() * 2 * np.pi
    self.goalX = GOAL_DISTANCE * np.sin(goalAngle)
    self.goalZ = GOAL_DISTANCE * np.cos(goalAngle)
    self.prevPotential = self.getPotential(self.getGoalDistance())

    p.resetBasePositionAndOrientation(self.bodyId, self.initialPosition, self.initialOrientation,
                                      physicsClientId=self.physicsClientId)
    p.resetBaseVelocity(self.bodyId, [0, 0, 0], [0, 0, 0],
                        physicsClientId=self.physicsClientId)
    for i in range(self.numJoints):
      p.resetJointState(self.bodyId, i, 0, physicsClientId=self.physicsClientId)

    return self.getObservation()

  def render(self, mode="human"):
    time.sleep(FIXED_TIME_STEP)

  def close(self):
    p.disconnect(physicsClientId=self.physicsClientId)
    self.physicsClientId = -1
