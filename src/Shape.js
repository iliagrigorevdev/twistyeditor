class Shape {
  constructor() {
    this.prisms = [];
    this.roll = 0;
    this.pitch = 0;
  }

  clone() {
    const shape = new Shape();
    shape.roll = this.roll;
    shape.pitch = this.pitch;
    for (let i = 0; i < this.prisms.length; i++) {
      shape.prisms.push(this.prisms[i].clone());
    }
    return shape;
  }
}

export default Shape;
