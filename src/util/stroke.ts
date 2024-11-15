import { device } from '../strokeTest';
import { mat4, vec2, vec3 } from "gl-matrix";


export class Stroke {
    vertexBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    numIndices = 1;
    startPos: vec2 = vec2.create();
    endPos: vec2 = vec2.create();

    indirectBuffer: GPUBuffer;
    numInstances = 0;
    maxStrokes = 100;

    constructor(device: GPUDevice, startPos: vec2, endPos: vec2) {
        this.startPos = startPos;
        this.endPos = endPos;

        // Hardcoded vertex positions (e.g., 2D positions with (x, y))
        const vertices = new Float32Array([
            0.0, 0.0,  // Vertex 1: Position (x, y)
            -0.5, 0.0, // Vertex 2: Position (x, y)
        ]);

        // Hardcoded indices for a line between the two vertices

        // const indices = new Uint16Array([
        //     0, 1, 2 // Line from Vertex 1 to Vertex 2

        const indices = new Uint32Array([
            0// Line from Vertex 1 to Vertex 2
        ]);

        const vertsArraySize = 4 * 4; // 4 vertices for tesing
        const vertsArray = new Float32Array(vertsArraySize);
        for(let i = 0; i < vertsArraySize; i++) {
            if(i % 4 === 0) {
                vertsArray[i] = -0.5;
            }
            if(i % 4 === 1) {
                vertsArray[i] = 0.0;
            }
            if(i % 4 === 2) {
                vertsArray[i] = 0.5;
            }
            if(i % 4 === 3) {
                vertsArray[i] = 0.0;
            }
        }
        // Create the vertex buffer
        this.vertexBuffer = device.createBuffer({
            label: "vertex buffer",
            size: vertsArray.byteLength * this.maxStrokes,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, vertsArray);

        // Create the index buffer
        this.indexBuffer = device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.indexBuffer, 0, indices);

        // Create the indirect buffer
        this.indirectBuffer = device.createBuffer({
            size: 4 * 4, // 4 x 4 bytes
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        })
    
        const indirectArray = new Uint32Array([4, 0, 0, 0])
    
        device.queue.writeBuffer(this.indirectBuffer, 0, indirectArray)
    }

    updateVertexBuffer(scaleFactor: number, offsetX: number, offsetY: number) {
        const vertsArraySize = 4 * 4; // 4 vertices for tesing
        const vertsArray = new Float32Array(vertsArraySize);
        for(let i = 0; i < vertsArraySize; i++) {
            if(i % 4 === 0) {
                vertsArray[i] = this.startPos[0];
                // console.log("scaleFactorHere:", scaleFactor);
                // vertsArray[i] = (this.startPos[0] * scaleFactor + offsetX);
                // console.log("vertsArray[i]:", vertsArray[i]);
            }
            if(i % 4 === 1) {
                vertsArray[i] = this.startPos[1];
                // vertsArray[i] = (this.startPos[1] * scaleFactor + offsetY); 
            }
            if(i % 4 === 2) {
                vertsArray[i] = this.endPos[0];
                // vertsArray[i] = (this.endPos[0] * scaleFactor + offsetX);
            }
            if(i % 4 === 3) {
                vertsArray[i] = this.endPos[1];
                // vertsArray[i] = (this.endPos[1] * scaleFactor + offsetY);
            }
        }
        //console.log("vertsArray", vertsArray);
        device.queue.writeBuffer(this.vertexBuffer, (this.numInstances - 1) * 16, vertsArray);
        device.queue.writeBuffer(this.indirectBuffer, 4, new Uint32Array([this.numInstances]));
    }

    updateStroke(startPos: vec2, endPos: vec2, scaleFactor: number, offsetX: number, offsetY: number) {
        this.startPos = startPos;
        this.endPos = endPos;
        this.updateVertexBuffer(scaleFactor, offsetX, offsetY);
    }

}