import { device, canvas, constants } from '../renderer';
import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { vertex } from './cube';


export class Stroke {
    vertexBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    colorBuffer: GPUBuffer;

    // depthTexture: GPUTexture;
    // depthTextureView: GPUTextureView;

    numIndices = 1;
    startPos: vec2 = vec2.create();
    endPos: vec2 = vec2.create();

    indirectBuffer: GPUBuffer;
    numInstances = 0; // change from stokes to polyline
    maxStrokes = 10000;
    radius = 0.01;

    strokeColor: vec4 = vec4.fromValues(0.0, 0.0, 0.0, 1.0);


    constructor(device: GPUDevice, startPos: vec2, endPos: vec2) {
        this.startPos = startPos;
        this.endPos = endPos;

        // Hardcoded indices for a line between the two vertices
        const indices = new Uint32Array([
            0// Line from Vertex 1 to Vertex 2
        ]);
        
        const vertsArraySize = constants.StrokeVertexSize; // 4 vertices for tesing
        const vertsArray = new Float32Array(vertsArraySize);
    
        // Create the vertex buffer
        this.vertexBuffer = device.createBuffer({
            label: "vertex buffer",
            size: vertsArray.byteLength * this.maxStrokes,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        // Create the index buffer
        this.indexBuffer = device.createBuffer({
            label: "index buffer",
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.indexBuffer, 0, indices);

        // Create the color buffer
        this.colorBuffer = device.createBuffer({
            label: "color buffer",
            size: 4 * 4,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        const colorArray = new Float32Array([1.0, 0.0, 0.0, 1.0]);
        device.queue.writeBuffer(this.colorBuffer, 0, colorArray);

        // Create the indirect buffer
        this.indirectBuffer = device.createBuffer({
            label: "indirect buffer",
            size: constants.numVertPerStroke * 4, // 4 x 4 bytes
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        })
    
        const indirectArray = new Uint32Array([4, 0, 0, 0])
    
        device.queue.writeBuffer(this.indirectBuffer, 0, indirectArray)
    }

    updateVertexBuffer() {
        const vertsArraySize = constants.StrokeVertexSize; // 4 * 4 vertices for tesing
        const vertsArray = new Float32Array(vertsArraySize);
        for(let i = 0; i < vertsArraySize; i++) {
            if(i % 8 === 0) {
                vertsArray[i] = this.startPos[0];
                // console.log("scaleFactorHere:", scaleFactor);
                // vertsArray[i] = (this.startPos[0] * scaleFactor + offsetX);
                // console.log("vertsArray[i]:", vertsArray[i]);
            }
            if(i % 8 === 1) {
                vertsArray[i] = this.startPos[1];
                // vertsArray[i] = (this.startPos[1] * scaleFactor + offsetY); 
            }
            if(i % 8 === 2) {
                vertsArray[i] = this.endPos[0];
                // vertsArray[i] = (this.endPos[0] * scaleFactor + offsetX);
            }
            if(i % 8 === 3) {
                vertsArray[i] = this.endPos[1];
                // vertsArray[i] = (this.endPos[1] * scaleFactor + offsetY);
            }
            if(i % 8 === 4) {
                vertsArray[i] = this.strokeColor[0];
            }
            if(i % 8 === 5) {
                vertsArray[i] = this.strokeColor[1];
            }
            if(i % 8 === 6) {
                vertsArray[i] = this.strokeColor[2];
            }
            if(i % 8 === 7) {
                vertsArray[i] = this.strokeColor[3];
            }
        }
        device.queue.writeBuffer(this.vertexBuffer, (this.numInstances - 1) * vertsArraySize, vertsArray);
        device.queue.writeBuffer(this.indirectBuffer, 4, new Uint32Array([this.numInstances]));
    }


    updateStroke(startPos: vec2, endPos: vec2) {
        this.startPos = startPos;
        this.endPos = endPos;
        this.updateVertexBuffer();
        // this.updateVertexBufferByPath(path);
    }

    // update color buffer
    updateColorBuffer(color: vec3) {
        // const vertsArraySize = constants.StrokeVertexSize;
        // const colorArray = new Float32Array([color[0], color[1], color[2], 1.0]);
        // device.queue.writeBuffer(this.colorBuffer,  (this.numInstances - 1) * vertsArraySize + 32, colorArray);
        this.strokeColor = vec4.fromValues(color[0], color[1], color[2], 1.0);
    }

    cleanVertexBuffer(instanceIdx: number) {
        // set the vertexbuffer at the index to 0
        const vertsArraySize = constants.StrokeVertexSize;
        const vertsArray = new Float32Array(vertsArraySize);
        device.queue.writeBuffer(this.vertexBuffer, instanceIdx * vertsArraySize, vertsArray);
    }

    // withdraw the last stroke
    withdrawStroke() {
        if(this.numInstances === 0) {
            this.cleanVertexBuffer(0);
            this.updateVertexBuffer();
            return;
        }
        this.cleanVertexBuffer(this.numInstances-1);
        console.log("instance number before withdraw:", this.numInstances);
        this.numInstances -= 10;
        if(this.numInstances < 0) {
            this.numInstances = 0;
            this.cleanVertexBuffer(0);
        }
        console.log("instance number after withdraw:", this.numInstances);
        this.updateVertexBuffer();
    }

}