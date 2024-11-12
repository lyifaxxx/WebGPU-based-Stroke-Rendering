import { device } from '../strokeTest';


export class Stroke {
    vertexBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    numIndices = 3;

    constructor(device: GPUDevice) {
        // Hardcoded vertex positions (e.g., 2D positions with (x, y))
        const vertices = new Float32Array([
            0.0, 0.1,  // Vertex 1: Position (x, y)
            -0.5, 0.0, // Vertex 2: Position (x, y)
            0.5, 0.0
        ]);

        // Hardcoded indices for a line between the two vertices
        const indices = new Uint16Array([
            0, 1, 2 // Line from Vertex 1 to Vertex 2
        ]);

        // Create the vertex buffer
        this.vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(vertices);
        this.vertexBuffer.unmap();

        // Create the index buffer
        this.indexBuffer = device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint16Array(this.indexBuffer.getMappedRange()).set(indices);
        this.indexBuffer.unmap();
    }

    // Method to bind the buffers in a render pass
    bindBuffers(renderPass: GPURenderPassEncoder) {
        renderPass.setVertexBuffer(0, this.vertexBuffer);
        renderPass.setIndexBuffer(this.indexBuffer, 'uint16');
    }
}