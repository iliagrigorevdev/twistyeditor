import os
import argparse
from stable_baselines import SAC
from stable_baselines.sac.policies import MlpPolicy
from TwistyEnv import TwistyEnv

if __name__ == "__main__":
  parser = argparse.ArgumentParser(description="Run training")
  parser.add_argument("-f", "--fileName", default="Cat.urdf")
  args = parser.parse_args()

  currDir = os.path.join(os.path.dirname(__file__))
  filePath = os.path.join(currDir, "data", args.fileName)
  env = TwistyEnv(filePath, False)

  model = SAC(MlpPolicy, env, verbose=1)
  model.learn(total_timesteps=1000000, log_interval=10)
  #model.save("model")
  env.close()

  env = TwistyEnv(filePath, True)
  obs = env.reset()
  while True:
      action, _ = model.predict(obs)
      obs, _, done, _ = env.step(action)
      env.render()
      if done:
        obs = env.reset()
