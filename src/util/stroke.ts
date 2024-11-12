import { device } from '../strokeTest';


export class Stroke {
    vertexBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    numIndices = 1;


    constructor(device: GPUDevice) {
        // Hardcoded vertex positions (e.g., 2D positions with (x, y))
        const vertices = new Float32Array([
            0.0, 0.0,  // Vertex 1: Position (x, y)
            -0.5, 0.0, // Vertex 2: Position (x, y)
        ]);

        // Hardcoded indices for a line between the two vertices
        const indices = new Uint32Array([
            0// Line from Vertex 1 to Vertex 2
        ]);

        const vertsArray = new Float32Array(4);
        vertsArray[0] = -0.5;
        vertsArray[1] = 0.0;
        vertsArray[2] = 0.5;
        vertsArray[3] = 0.0;

        // Create the vertex buffer
        this.vertexBuffer = device.createBuffer({
            label: "vertex buffer",
            size: 16,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, vertsArray);

        // Create the index buffer
        this.indexBuffer = device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.indexBuffer, 0, indices);
    }

}