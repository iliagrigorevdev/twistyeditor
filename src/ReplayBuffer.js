
class ReplayBuffer {
  constructor(maxLength) {
    this.maxLength = maxLength;
    this.buffer = new Array(maxLength);
    this.length = 0;
    this.cursor = 0;
  }

  append(entry) {
    this.buffer[this.cursor] = entry;
    this.cursor = (this.cursor + 1) % this.maxLength;
    this.length = Math.min(this.length + 1, this.maxLength);
  }

  sample(batchSize) {
    const entries = new Array(batchSize);
    for (let i = 0; i < batchSize; i++) {
      entries[i] = this.buffer[Math.floor(Math.random() * this.length)];
    }
    return entries;
  }
}

export default ReplayBuffer;
