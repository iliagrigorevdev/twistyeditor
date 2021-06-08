
const frameTime = 40;
const maxTime = 1000;

onmessage = function(e) {
  importScripts("training.js");

  const [key, config, shapeData] = e.data;

  Training().then(training => {
    const worker = new Worker(training, key, config, shapeData);
    worker.start();
  });
}

class Worker {
  constructor(training, key, config, shapeData) {
    this.training = training;
    this.key = key;
    this.config = config;
    this.shapeData = shapeData;

    this.config.hiddenLayerSizes = this.toNativeArray(this.config.hiddenLayerSizes);
  }

  start() {
    this.openDB(db => {
      if (db) {
        this.load(db, object => {
          if (object) {
            this.training.load(object.data);
            console.log("Load checkpoint");
          }
          this.run(db);
        });
      } else {
        this.run();
      }
    });
  }

  run(db = null) {
    this.training.create(this.config, this.shapeData);

    const startTime = Date.now();
    let endTime = startTime;
    let lastTime = startTime;
    let stepNumber = 0;
    while (true) {
      if (stepNumber < this.config.totalSteps) {
        this.training.step();
        endTime = Date.now();
        stepNumber++;

        if (((stepNumber % this.config.checkpointSteps) == 0) && db) {
          const data = this.training.save();
          if (data) {
            this.save(db, data);
          }
        }
      }

      const currentTime = Date.now();
      const elapsedTime = currentTime - lastTime;
      if (elapsedTime >= frameTime) {
        if (elapsedTime > maxTime) {
          lastTime = currentTime;
        } else {
          lastTime += frameTime;
        }
        const progress = Math.floor(stepNumber * 100 / this.config.totalSteps);
        const time = Math.floor((endTime - startTime) / 1000);
        const nativeState = this.training.evaluate();
        const state = this.fromNativeState(nativeState);
        postMessage([progress, time, state]);
      }
    }
  }

  openDB(ondone) {
    const openRequest = indexedDB.open("training");
    openRequest.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("data")) {
        db.createObjectStore("data", {keyPath: "key"});
        console.log("Initialize DB");
      }
    };
    openRequest.onsuccess = (e) => {
      const db = openRequest.result;
      db.onabort = (e) => {
        console.log("db onabort: " + e); // XXX
      };
      db.onclose = (e) => {
        console.log("db onclose: " + e); // XXX
      };
      db.onerror = (e) => {
        console.log("db onerror: " + e); // XXX
      };
      db.onversionchange = (e) => {
        console.log("db onversionchange: " + e); // XXX
      };
      ondone(db);
    };
    openRequest.onerror = (e) => {
      console.log("Failed to open DB");
      ondone();
    };
  }

  load(db, ondone) {
    const getRequest = db.transaction("data", "readonly")
                       .objectStore("data")
                       .get(this.key);
    getRequest.onsuccess = (e) => {
      console.log("getRequest onsuccess"); // XXX
      ondone(getRequest.result);
    };
    getRequest.onerror = (e) => {
      console.log("Failed to load data");
      ondone();
    };
  }

  save(db, data) {
    const transaction = db.transaction("data", "readwrite");
    const putRequest = transaction
                       .objectStore("data")
                       .put({key: this.key, data: data});
    putRequest.onsuccess = (e) => {
      console.log("Saved"); // XXX
    };
    putRequest.onerror = (e) => {
      console.log("Failed to save data");
    };
    transaction.oncomplete = (e) => {
      console.log("oncomplete: " + e); // XXX
    };
    transaction.onabort = (e) => {
      console.log("onabort: " + e); // XXX
    };
    transaction.onerror = (e) => {
      console.log("onerror: " + e); // XXX
    };
  }

  toNativeArray(array) {
    const nativeArray = new this.training.IntArray();
    nativeArray.resize(array.length, 0);
    for (let i = 0; i < array.length; i++) {
      nativeArray.set(i, array[i]);
    }
    return nativeArray;
  }

  fromNativeState(nativeState) {
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
    return state;
  }
}
