function createMeshLines(name, vertices, triangleIndices) {
  // OBJ file format
  const lines = [];
  lines.push("o " + name);
  for (const vertex of vertices) {
    lines.push("v " + vertex[0].toFixed(6)
        + " " + vertex[1].toFixed(6)
        + " " + vertex[2].toFixed(6));
  }
  for (let j = 2; j < triangleIndices.length; j += 3) {
    lines.push("f " + (triangleIndices[j - 2] + 1)
        + " " + (triangleIndices[j - 1] + 1)
        + " " + (triangleIndices[j] + 1));
  }
  return lines;
}

function createMeshFile(name, vertices, triangleIndices) {
  return createMeshLines(name, vertices, triangleIndices).join("\n");
}

export { createMeshLines, createMeshFile };
