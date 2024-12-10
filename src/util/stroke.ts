import { device, canvas, constants } from '../renderer';
import { mat4, vec2, vec3, vec4 } from "gl-matrix";
const STORE_PRESET_DATA = true;

export enum StrokeType {
    vanilla = 0,
    stamp = 1,
    airbrush = 2,
    eraser = 3,
}

interface PresetData {
    startPos: vec2;
    endPos: vec2;
    strokeColor: vec4;
    radius: number;
    strokeType: StrokeType;
}

export class Stroke {
    vertexBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    colorBuffer: GPUBuffer;
    stampCountBuffer: GPUBuffer;

    numIndices = 1;
    startPos: vec2 = vec2.create();
    endPos: vec2 = vec2.create();
    displayColor: vec4 = vec4.fromValues(0, 0, 0, 1);

    indirectBuffer: GPUBuffer;
    numInstances = 0; // change from stokes to polyline
    maxStrokes = 10000;
    radius = 0.01;

    strokeColor: vec4 = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
    strokeType: StrokeType = StrokeType.vanilla;

    // Store the preset data
    data: PresetData[] = [];
    dataSVG: PresetData[] = [];


    constructor(device: GPUDevice, startPos: vec2, endPos: vec2) {
        this.startPos = startPos;
        this.endPos = endPos;
        this.displayColor = this.strokeColor;

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

        // Create the stamp count buffer
        this.stampCountBuffer = device.createBuffer({
            label: "stamp count buffer",
            size: 4, // just one integer 
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

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
        if(this.numInstances === 0) {
            return;
        }
        const vertsArraySize = constants.StrokeVertexSize; // 4 * 4 vertices for tesing
        const vertsArray = new Float32Array(vertsArraySize);
        for(let i = 0; i < vertsArraySize; i++) {
            if(i % 12 === 0) {
                vertsArray[i] = this.startPos[0];
            }
            if(i % 12 === 1) {
                vertsArray[i] = this.startPos[1];
            }
            if(i % 12 === 2) {
                vertsArray[i] = this.endPos[0];
            }
            if(i % 12 === 3) {
                vertsArray[i] = this.endPos[1];
            }
            if(i % 12 === 4) {
                vertsArray[i] = this.strokeColor[0];
            }
            if(i % 12 === 5) {
                vertsArray[i] = this.strokeColor[1];
            }
            if(i % 12 === 6) {
                vertsArray[i] = this.strokeColor[2];
            }
            if(i % 12 === 7) {
                vertsArray[i] = this.strokeColor[3];
            }
            if(i % 12 === 8) {
                vertsArray[i] = this.radius;
            }
            if(i % 12 === 9) {
                vertsArray[i] = this.strokeType;
            }
        }
        device.queue.writeBuffer(this.vertexBuffer, (this.numInstances - 1) * vertsArraySize, vertsArray);
        device.queue.writeBuffer(this.indirectBuffer, 4, new Uint32Array([this.numInstances]));
    }


    updateVertexBufferWithPresetData() {
        if (this.presetStrokes.length == 0) {
            console.error('No preset strokes to update the vertex buffer with');
            return;
        }
    
        this.numInstances = 0;
        this.cleanVertexBuffer();
        // all the strokes are stored in a single buffer
        const vertsArraySize = constants.StrokeVertexSize; // 4 floats(2*vec2 for p0, p1) per vertex, 4 floats per stroke color, 1 float + 3 padding per stroke width
        const vertsArray = new Float32Array(vertsArraySize * this.presetStrokes.length);
    
        this.presetStrokes.forEach((stroke, i) => {
            // console.log('index and stroke:', i, stroke);
            const offset = i * 12;
            vertsArray[offset + 0] = stroke.startPos[0];
            vertsArray[offset + 1] = stroke.startPos[1];
            vertsArray[offset + 2] = stroke.endPos[0];
            vertsArray[offset + 3] = stroke.endPos[1];
            vertsArray[offset + 4] = stroke.strokeColor[0];
            vertsArray[offset + 5] = stroke.strokeColor[1];
            vertsArray[offset + 6] = stroke.strokeColor[2];
            vertsArray[offset + 7] = stroke.strokeColor[3];
            vertsArray[offset + 8] = stroke.radius;
            vertsArray[offset + 9] = stroke.strokeType;
            this.numInstances++;
        });
    
        device.queue.writeBuffer(this.vertexBuffer, 0, vertsArray);
    
        device.queue.writeBuffer(this.indirectBuffer, 4, new Uint32Array([this.presetStrokes.length]));
    }
    
    addPresetData(startPos: vec2, endPos: vec2) {
        this.data.push({
            startPos: vec2.clone(startPos),
            endPos: vec2.clone(endPos),
            strokeColor: vec4.clone(this.strokeColor),
            radius: this.radius,
            strokeType: this.strokeType,
        });
        this.dataSVG.push({
            startPos: vec2.clone(startPos),
            endPos: vec2.clone(endPos),
            strokeColor: vec4.clone(this.strokeColor),
            radius: this.radius,
            strokeType: this.strokeType,
        });
    }
    
    clearPresetData() {
        this.data = [];
    }
    
    // Export the paths to a JSON file
    exportPresetData() {
        const round = (value: number) => parseFloat(value.toFixed(3));
        const simplifiedData = this.data.map(d => ({
            startPos: [round(d.startPos[0]), round(d.startPos[1])],
            endPos: [round(d.endPos[0]), round(d.endPos[1])],
            strokeColor: [
                round(d.strokeColor[0]),
                round(d.strokeColor[1]),
                round(d.strokeColor[2]),
                round(d.strokeColor[3])
            ],
            radius: round(d.radius),
            strokeType: d.strokeType,
        }));
    
        const jsonData = JSON.stringify(simplifiedData);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'preset.json';
        link.click();
        // this.clearPresetData();
    }
    

    // Read the preset data from a JSON file
    presetStrokes: Stroke[] = [];

    readPresetData(jsonData: any) {
        // make sure the JSON data is a string
        if (typeof jsonData !== 'string') {
            console.error('Invalid JSON data, expected a string:', jsonData);
            return;
        }
        try {
            this.presetStrokes = JSON.parse(jsonData).map((data: any) => ({
                startPos: vec2.fromValues(data.startPos[0], data.startPos[1]),
                endPos: vec2.fromValues(data.endPos[0], data.endPos[1]),
                strokeColor: vec4.fromValues(
                    data.strokeColor[0],
                    data.strokeColor[1],
                    data.strokeColor[2],
                    data.strokeColor[3]
                ),
                radius: data.radius,
                strokeType: data.strokeType,
            }));
            console.log('Preset strokes imported from JSON:', this.presetStrokes);
            this.updateVertexBufferWithPresetData();
            this.data = this.presetStrokes.map(stroke => ({
                startPos: vec2.clone(stroke.startPos),
                endPos: vec2.clone(stroke.endPos),
                strokeColor: vec4.clone(stroke.strokeColor),
                radius: stroke.radius,
                strokeType: stroke.strokeType,
            }));
            this.dataSVG = this.presetStrokes.map(stroke => ({
                startPos: vec2.clone(stroke.startPos),
                endPos: vec2.clone(stroke.endPos),
                strokeColor: vec4.clone(stroke.strokeColor),
                radius: stroke.radius,
                strokeType: stroke.strokeType,
            }));
        } catch (error) {
            console.error('Failed to parse JSON data:', error, jsonData);
        }
    }

    updateStroke(startPos: vec2, endPos: vec2) {
        this.startPos = startPos;
        this.endPos = endPos;
        this.updateVertexBuffer();
        // add preset data
        this.addPresetData(startPos, endPos);
    }

    // update color buffer
    updateColorBuffer(color: vec3) {
        this.strokeColor = vec4.fromValues(color[0], color[1], color[2], 1.0);
    }

    updateWidth(width: number) {
        this.radius = width;
        if(this.numInstances === 0) {
            return;
        }
        device.queue.writeBuffer(this.vertexBuffer, (this.numInstances) * constants.StrokeVertexSize + 32, new Float32Array([width]));
    }

    updateType(type: StrokeType) {
        this.strokeType = type;
        if(this.numInstances === 0) {
            return;
        }
        device.queue.writeBuffer(this.vertexBuffer, (this.numInstances) * constants.StrokeVertexSize + 36, new Float32Array([type]));
    }

    cleanVertexBufferByIndex(instanceIdx: number) {
        // set the vertexbuffer at the index to 0
        const vertsArraySize = constants.StrokeVertexSize;
        const vertsArray = new Float32Array(vertsArraySize);
        device.queue.writeBuffer(this.vertexBuffer, instanceIdx * vertsArraySize, vertsArray);
    }

    cleanVertexBuffer() {  
        // set the vertexbuffer at the index to 0
        const vertsArraySize = constants.StrokeVertexSize * this.maxStrokes;
        const vertsArray = new Float32Array(vertsArraySize);
        device.queue.writeBuffer(this.vertexBuffer, 0, vertsArray);
        this.dataSVG = [];
    }

    // withdraw the last stroke
    withdrawStroke() {
        if(this.numInstances === 0) {
            return;
        }
        this.numInstances -= 10;
        this.numInstances = Math.max(0, this.numInstances);
        //Math.min(10,Math.max(10, this.numInstances));
        console.log('numInstances:', this.numInstances);
        device.queue.writeBuffer(this.indirectBuffer, 4, new Uint32Array([this.numInstances]));
       /*  if(this.numInstances === 0) {
            this.cleanVertexBufferByIndex(0);
            return;
        }
        this.cleanVertexBufferByIndex(this.numInstances-1);
        this.numInstances -= 10;
        if(this.numInstances < 0) {
            this.numInstances = 0;
            this.cleanVertexBufferByIndex(0);
        }
        this.updateVertexBuffer(); */
    }
}