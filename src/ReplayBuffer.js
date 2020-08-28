import * as tf from '@tensorflow/tfjs';

class ReplayBuffer {
  constructor(maxLength) {
    this.maxLength = maxLength;
    this.buffer = new Array(maxLength);
    this.indices = [];
    this.cursor = 0;
  }

  size() {
    return this.indices.length;
  }

  append(entry) {
    this.buffer[this.cursor] = entry;
    this.cursor = (this.cursor + 1) % this.maxLength;
    if (this.size() < this.maxLength) {
      this.indices.push(this.size());
    }
  }

  sample(batchSize) {
    tf.util.shuffle(this.indices);
    const amount = Math.min(batchSize, this.size());
    const entries = [];
    for (let i = 0; i < amount; i++) {
      entries.push(this.buffer[this.indices[i]]);
    }
    return entries;
  }
}

export default ReplayBuffer;
