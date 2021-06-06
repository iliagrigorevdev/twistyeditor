
const stepCount = 100000;
const frameTime = 40;
const maxTime = 1000;

onmessage = function(e) {
  importScripts("training.js");

  const shapeData = e.data;

  Training().then(training => {
    training.create(shapeData);

    const startTime = Date.now();
    let endTime = startTime;
    let lastTime = startTime;
    let stepNumber = 0;
    while (true) {
      if (stepNumber < stepCount) {
        training.step();
        endTime = Date.now();
        stepNumber++;
      }

      const currentTime = Date.now();
      const elapsedTime = currentTime - lastTime;
      if (elapsedTime >= frameTime) {
        if (elapsedTime > maxTime) {
          lastTime = currentTime;
        } else {
          lastTime += frameTime;
        }
        const progress = Math.floor(stepNumber * 100 / stepCount);
        const time = Math.floor((endTime - startTime) / 1000);
        const nativeState = training.evaluate();
        const state = {
          goalPosition: [
            nativeState.goalPosition.x,
            nativeState.goalPosition.y,
            nativeState.goalPosition.z
          ],
          transforms: []
        };
        for (let i = 0; i < nativeState.transforms.size(); i++) {
          const transform = nativeState.transforms.get(i);
          state.transforms.push({
            position: [
              transform.position.x,
              transform.position.y,
              transform.position.z
            ],
            orientation: [
              transform.orientation.x,
              transform.orientation.y,
              transform.orientation.z,
              transform.orientation.w
            ]
          });
        }
        postMessage([progress, time, state]);
      }
    }
  });
}
