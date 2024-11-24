import { Stroke } from "./util/stroke";
import { Track } from "./util/track";
import { mat4, vec2, vec3 } from "gl-matrix";


// export vars
export var canvas: HTMLCanvasElement;
export var canvasFormat: GPUTextureFormat;
export var device: GPUDevice
export var context: GPUCanvasContext
export var format: GPUTextureFormat
export var size: {width: number, height: number}

export const constants = {
    bindGroup_strokes: 0,

    StrokeComputeWorkgroupSize: 128,

    // TODO: change this size when adding more attributes to the stroke
    StrokeVertexSize: 4 * 4, // 4 floats(2*vec2 for p0, p1) per vertex
    numVertPerStroke: 4,
    //TODO: add texture size here
    StrokeTextureSize: 1024,
};

// Initialize WebGPU
export async function initWebGPU() {
    const canvasElement = document.querySelector('#webgpu');
    // const canvasElement = document.querySelector('canvas');
    if (!canvasElement)
        throw new Error('No Canvas');
    canvas = canvasElement as HTMLCanvasElement;

    if (!navigator.gpu) {
        console.error("WebGPU is not supported in this browser.");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        console.error("Failed to obtain GPU adapter.");
        return;
    }

    device = await adapter.requestDevice();
    console.log("WebGPU initialized with device:", device);

    context = canvas.getContext('webgpu') as GPUCanvasContext;
    format = navigator.gpu.getPreferredCanvasFormat();
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    size = {width: canvas.width, height: canvas.height};
    context.configure({
        // json specific format when key and value are the same
        device, format,
        // prevent chrome warning
        alphaMode: 'opaque'
    });

    console.log("WebGPU init successsful");
}

// Renderer class
export abstract class Renderer { 

    private prevTime: number = 0;
    private frameRequestId: number;

    stroke: Stroke;
    track: Track;

    constructor(stroke: Stroke, track: Track) {
        this.stroke = stroke;
        this.track = track;
        this.frameRequestId = requestAnimationFrame((t) => this.onFrame(t));
    }

    stop(): void {
        cancelAnimationFrame(this.frameRequestId);
    }

    protected abstract draw(): void;

    private onFrame(time: number) {
        if (this.prevTime == 0) {
            this.prevTime = time;
        }

        let deltaTime = time - this.prevTime;

        this.draw();

        this.prevTime = time;
        this.frameRequestId = requestAnimationFrame((t) => this.onFrame(t));
    }

}
