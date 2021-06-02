
#include "Network.h"

// #include <filesystem>

Network::Network(const Config &config, int observationLength, int actionLength)
    : Network(config, std::make_shared<Model>(config.hiddenLayerSizes, observationLength, actionLength)) {
}

Network::Network(const Config &config, ModelPtr model)
    : Network(config, model, std::dynamic_pointer_cast<Critic>(model->critic->clone())) {
}

Network::Network(const Config &config, ModelPtr model, CriticPtr targetCritic)
    : config(config)
    , model(model)
    , targetCritic(targetCritic)
    , actorOptimizer(new torch::optim::Adam(model->actor->parameters(),
                     torch::optim::AdamOptions(config.learningRate)))
    , criticOptimizer(new torch::optim::Adam(model->critic->parameters(),
                      torch::optim::AdamOptions(config.learningRate))) {
  for (auto &parameter : targetCritic->parameters()) {
    parameter.set_requires_grad(false);
  }
}

NetworkPtr Network::clone() const {
  return std::make_shared<Network>(config,
    std::dynamic_pointer_cast<Model>(model->clone()),
    std::dynamic_pointer_cast<Critic>(targetCritic->clone()));
}

// void Network::saveModel() {
//   if (!std::filesystem::exists(config.modelFolder)) {
//     std::filesystem::create_directory(config.modelFolder);
//   }
//   const auto modelFilepath = std::filesystem::path(config.modelFolder) /
//                              config.modelSaveFilename();
//   torch::save(model, modelFilepath.string());
// }

// bool Network::loadModel() {
//   const auto modelFilepath = std::filesystem::path(config.modelFolder) /
//                              config.modelLoadFilename();
//   if (!std::filesystem::exists(modelFilepath)) {
//     std::cout << "Model not found: " << modelFilepath << std::endl;
//     return false;
//   }
//   torch::load(model, modelFilepath.string());
//   targetCritic = std::dynamic_pointer_cast<Critic>(model->critic->clone());
//   for (auto &parameter : targetCritic->parameters()) {
//     parameter.set_requires_grad(false);
//   }
//   return true;
// }

Action Network::predict(const Observation &observation, bool deterministic) {
  torch::NoGradGuard noGradGuard;

  const auto inputObservation = torch::from_blob(
    reinterpret_cast<void*>(const_cast<float*>(&observation[0])),
    {1, static_cast<int>(observation.size())}, torch::kFloat32);

  const auto [sample, _] = model->actor->forward(inputObservation, deterministic, false);
  const auto sampleAccessor = sample.accessor<float, 2>();
  Action action(0.0, model->actionLength);
  for (int i = 0; i < model->actionLength; i++) {
    action[i] = sampleAccessor[0][i];
  }

  return action;
}

ActorCriticLosses Network::train(const SamplePtrs &samples) {
  if (samples.empty()) {
    return {0, 0};
  }

  const auto batchSize = static_cast<int>(samples.size());
  std::vector<torch::Tensor> observations;
  std::vector<torch::Tensor> nextObservations;
  std::vector<torch::Tensor> actions;
  const auto reward = torch::empty({batchSize, 1}, torch::kFloat32);
  const auto undone = torch::empty({batchSize, 1}, torch::kFloat32);
  for (int i = 0; i < batchSize; i++) {
    const auto &[observation, action, r, nextObservation, d] = *samples[i];
    observations.push_back(
      torch::from_blob(reinterpret_cast<void*>(const_cast<float*>(&observation[0])),
      {1, static_cast<int>(observation.size())}, torch::kFloat32));
    nextObservations.push_back(
      torch::from_blob(reinterpret_cast<void*>(const_cast<float*>(&nextObservation[0])),
      {1, static_cast<int>(nextObservation.size())}, torch::kFloat32));
    actions.push_back(
      torch::from_blob(reinterpret_cast<void*>(const_cast<float*>(&action[0])),
      {1, static_cast<int>(action.size())}, torch::kFloat32));
    reward[i][0] = r;
    undone[i][0] = (d ? 0 : 1);
  }
  const auto observation = torch::cat(observations);
  const auto nextObservation = torch::cat(nextObservations);
  const auto action = torch::cat(actions);

  criticOptimizer->zero_grad();
  const auto [q1, q2] = model->critic->forward(observation, action);
  torch::Tensor backup;
  {
    torch::NoGradGuard noGradGuard;
    const auto [nextAction, nextLogProb] = model->actor->forward(nextObservation, false, true);
    const auto [targetQ1, targetQ2] = targetCritic->forward(nextObservation, nextAction);
    const auto targetQ = torch::min(targetQ1, targetQ2);
    backup = reward + config.discount * undone * (targetQ - config.regularization * nextLogProb);
  }
  const auto lossQ1 = torch::mse_loss(q1, backup);
  const auto lossQ2 = torch::mse_loss(q2, backup);
  const auto criticLoss = lossQ1 + lossQ2;
  criticLoss.backward();
  criticOptimizer->step();

  for (auto &parameter : model->critic->parameters()) {
    parameter.set_requires_grad(false);
  }

  actorOptimizer->zero_grad();
  const auto [sample, logProb] = model->actor->forward(observation, false, true);
  const auto [sampleQ1, sampleQ2] = model->critic->forward(observation, sample);
  const auto sampleQ = torch::min(sampleQ1, sampleQ2);
  const auto actorLoss = (config.regularization * logProb - sampleQ).mean();
  actorLoss.backward();
  actorOptimizer->step();

  for (auto &parameter : model->critic->parameters()) {
    parameter.set_requires_grad(true);
  }

  {
    torch::NoGradGuard noGradGuard;
    const auto onlineCriticParameters = model->critic->parameters();
    const auto targetCriticParameters = targetCritic->parameters();
    for (size_t i = 0; i < onlineCriticParameters.size(); i++) {
      const auto &onlineCriticParameter = onlineCriticParameters[i];
      auto &targetCriticParameter = targetCriticParameters[i];
      targetCriticParameter.mul_(config.interpolation);
      targetCriticParameter.add_((1 - config.interpolation) * onlineCriticParameter);
    }
  }

  return {actorLoss.item<float>(), criticLoss.item<float>()};
}
