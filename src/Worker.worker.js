import Trainer from "./Trainer";

onmessage = (e => {
  const [config, shapeData] = e.data;

  self.importScripts("training.js"); // eslint-disable-line

  Training().then(training => { // eslint-disable-line
    const trainer = new Trainer(training, config, shapeData);
    trainer.start();
  });
});
