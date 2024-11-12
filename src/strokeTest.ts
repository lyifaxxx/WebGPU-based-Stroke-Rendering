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

// initialize webgpu device & config canvas context
export async function initWebGPU() {
    const canvasElement = document.querySelector('#webgpu');
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
async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<GPURenderPipeline> {
    // create vertex buffer layout
    const vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 16, // 2 vec2
        attributes: [
            { // pos0
                format: "float32x2",
                offset: 0,
                shaderLocation: 0
            },
            { // pos1
                format: "float32x2",
                offset: 8,
                shaderLocation: 1
            },
        ]
    };
    
    const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                label: 'stroke-vert',
                code: strokeVert
            }),
            entryPoint: 'main',
            buffers: [vertexBufferLayout]
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

    // Create the render pipeline
    const pipeline = await device.createRenderPipelineAsync(descriptor);
    // create a mvp matrix buffer
     const mvpBuffer = device.createBuffer({
        label: 'GPUBuffer store 4x4 matrix',
        size: 4 * 4 * 4, // 4 x 4 x float32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    // create a uniform group contains matrix
    const uniformGroup = device.createBindGroup({
        label: 'Uniform Group with Matrix',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: mvpBuffer
                }
            }
        ]
    })
    // return { pipeline, uniformGroup, mvpBuffer };
    return await device.createRenderPipelineAsync(descriptor)
}

// create & submit device commands
function draw(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline, stroke: Stroke) {
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

    // bind stroke vertices
    //stroke = new Stroke(device, trackInstance.strokeStart, trackInstance.strokeEnd)
    passEncoder.setVertexBuffer(0, stroke.vertexBuffer)

    // bind stroke indices
    passEncoder.setIndexBuffer(stroke.indexBuffer, 'uint32')

    // draw stroke
    //passEncoder.drawIndexed(stroke.numIndices)
    passEncoder.draw(4) // 1 vert has 2 pos

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

    const pipeline = await initPipeline(device, format)

    // re-configure context on resize
    window.addEventListener('resize', ()=>{

        // don't need to recall context.configure() after v104
        draw(device, context, pipeline, stroke)
    })
    
    function frame() {
        // start draw
        draw(device, context, pipeline, stroke)
        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    
}

run()