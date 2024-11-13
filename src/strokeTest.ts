import strokeVert from './shaders/stroke.vert.wgsl?raw'
import basicFrag from './shaders/red.frag.wgsl?raw'
import { Stroke } from './util/stroke'
import { Track } from './util/track'
import { mat4, vec2, vec3 } from "gl-matrix";

export var canvas: HTMLCanvasElement;
export var canvasFormat: GPUTextureFormat;
export var device: GPUDevice
export var context: GPUCanvasContext
export var format: GPUTextureFormat
export var size: {width: number, height: number}
export var trackInstance: Track
var uniformGroup: GPUBindGroup

// initialize webgpu device & config canvas context
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

// create a simple pipiline
function initPipeline(device: GPUDevice, format: GPUTextureFormat, stroke: Stroke): GPURenderPipeline {
    // create vertex buffer layout
    const vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 16, // 16 * maxNumStrokes
        attributes: [
            { // pos
                format: "float32x4",
                offset: 0,
                shaderLocation: 0
            }
        ]
    };

    // Create the render pipeline
    const pipeline = device.createRenderPipeline(
        {
            layout: 'auto',
            vertex: {
                module: device.createShaderModule({
                    label: 'stroke-vert',
                    code: strokeVert
                }),
                entryPoint: 'main',
            },
            primitive: {
                topology: 'triangle-strip' // try point-list, line-list, line-strip, triangle-strip?
                // topology: 'line-strip'
            },
            fragment: {
                module: device.createShaderModule({
                    code: basicFrag
                }),
                entryPoint: 'main',
                targets: [
                    {
                        format: format
                    }
                ]
            }
        }
    );

    // create a uniform group contains matrix
    uniformGroup = device.createBindGroup({
        label: 'UniformGroup',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: stroke.vertexBuffer
                }
            }
        ]
    })

    // return { pipeline, uniformGroup, mvpBuffer };
    return pipeline;
}

// create & submit device commands
function draw(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline, stroke: Stroke, track: Track) {
    const commandEncoder = device.createCommandEncoder()
    const view = context.getCurrentTexture().createView()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: view,
                clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                loadOp: 'clear', // clear/load
                storeOp: 'store' // store/discard
            }
        ]
    }
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(pipeline)
    // stroke.applyTransform(track.scaleFactor, track.offsetX, track.offsetY);

    // bind stroke vertices
    //stroke = new Stroke(device, trackInstance.strokeStart, trackInstance.strokeEnd)
    //passEncoder.setVertexBuffer(0, stroke.vertexBuffer)
    passEncoder.setBindGroup(0, uniformGroup)

    // bind stroke indices
    //passEncoder.setIndexBuffer(stroke.indexBuffer, 'uint32')

    // draw stroke
    //passEncoder.drawIndexed(stroke.numIndices)
    //passEncoder.draw(4) // 1 vert has 2 pos
    passEncoder.drawIndirect(stroke.indirectBuffer, 0)

    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}

async function run(){
    await initWebGPU()

    // add new stroke
    const stroke = new Stroke(device, vec2.fromValues(-0.5, 0.0), vec2.fromValues(0.5, 0.0))

    // add track class
    trackInstance = new Track(stroke);

    const pipeline = initPipeline(device, format, stroke)

    // re-configure context on resize
    window.addEventListener('resize', ()=>{
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;        
        // don't need to recall context.configure() after v104
        draw(device, context, pipeline, stroke, trackInstance)
    })
    
    function frame() {
        // start draw
        draw(device, context, pipeline, stroke, trackInstance)
        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    
}

run()