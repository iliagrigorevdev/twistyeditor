
#include "Network.h"
#include "Base64.h"

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
                     torch::optim::AdamOptions(config.actorLearningRate)))
    , criticOptimizer(new torch::optim::Adam(model->critic->parameters(),
                      torch::optim::AdamOptions(config.criticLearningRate)))
    , cudaAvailable(torch::cuda::is_available())
    , cudaActive(false) {
  for (auto &parameter : targetCritic->parameters()) {
    parameter.set_requires_grad(false);
  }
}

NetworkPtr Network::clone() const {
  return std::make_shared<Network>(config,
    std::dynamic_pointer_cast<Model>(model->clone(torch::kCPU)),
    std::dynamic_pointer_cast<Critic>(targetCritic->clone(torch::kCPU)));
}

String Network::save() {
  std::ostringstream stream;
  save(stream);
  return macaron::Base64::Encode(stream.str());
}

void Network::save(std::ostream &stream) {
  if (cudaActive) {
    model->to(torch::kCPU);
    cudaActive = false;
  }
  torch::save(model, stream);
}

void Network::load(const String &data) {
  String out;
  const auto error = macaron::Base64::Decode(data, out);
  if (!error.empty()) {
    EXCEPT(error);
  }
  std::istringstream stream(out);
  load(stream);
}

void Network::load(std::istream &stream) {
  if (cudaActive) {
    model->to(torch::kCPU);
    cudaActive = false;
  }
  torch::load(model, stream);
}

Action Network::predict(const Observation &observation) {
  torch::NoGradGuard noGradGuard;

  if (model->is_training()) {
    model->eval();
  }

  if (cudaActive) {
    model->to(torch::kCPU);
    cudaActive = false;
  }

  const auto inputObservation = torch::from_blob(
      reinterpret_cast<void*>(const_cast<float*>(&observation[0])),
      {1, static_cast<int>(observation.size())}, torch::kFloat32);

  const auto [sample, _] = model->actor->forward(inputObservation);
  const auto sampleAccessor = sample.accessor<float, 2>();
  Action action(0.0, model->actionLength);
  for (int i = 0; i < model->actionLength; i++) {
    action[i] = sampleAccessor[0][i];
  }

  return action;
}

ActorCriticLosses Network::train(const std::tuple<torch::Tensor, torch::Tensor, torch::Tensor, torch::Tensor, torch::Tensor> &samples) {
  const auto &[observation, nextObservation, action, reward, undone] = samples;

  if (observation.sizes().empty()) {
    return {0, 0};
  }

  if (!model->is_training()) {
    model->train();
  }

  if (!cudaActive && cudaAvailable) {
    model->to(torch::kCUDA);
    targetCritic->to(torch::kCUDA);
    cudaActive = true;
  }

  criticOptimizer->zero_grad();
  const auto [q1, q2] = model->critic->forward(observation, action);
  torch::Tensor backup;
  {
    torch::NoGradGuard noGradGuard;
    const auto [nextAction, nextLogProb] = model->actor->forward(nextObservation);
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
  const auto [sample, logProb] = model->actor->forward(observation);
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
