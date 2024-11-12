import strokeVert from './shaders/stroke.vert.wgsl?raw'
import basicFrag from './shaders/red.frag.wgsl?raw'

// initialize webgpu device & config canvas context
async function initWebGPU(canvas: HTMLCanvasElement) {
    if(!navigator.gpu)
        throw new Error('Not Support WebGPU')
    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
        // powerPreference: 'low-power'
    })
    if (!adapter)
        throw new Error('No Adapter Found')
    const device = await adapter.requestDevice()
    const context = canvas.getContext('webgpu') as GPUCanvasContext
    const format = navigator.gpu.getPreferredCanvasFormat()
    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * devicePixelRatio
    canvas.height = canvas.clientHeight * devicePixelRatio
    const size = {width: canvas.width, height: canvas.height}
    context.configure({
        // json specific format when key and value are the same
        device, format,
        // prevent chrome warning
        alphaMode: 'opaque'
    })
    return {device, context, format, size}
}
// create a simple pipiline
async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<GPURenderPipeline> {
    const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: strokeVert
            }),
            entryPoint: 'main'
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
function draw(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline) {
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
    // 3 vertex form a triangle
    passEncoder.draw(256)
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}

async function run(){
    const canvas = document.querySelector('canvas')
    if (!canvas)
        throw new Error('No Canvas')
    const {device, context, format} = await initWebGPU(canvas)
    const pipeline = await initPipeline(device, format)
    // start draw
    draw(device, context, pipeline)
    
    // re-configure context on resize
    window.addEventListener('resize', ()=>{
        canvas.width = canvas.clientWidth * devicePixelRatio
        canvas.height = canvas.clientHeight * devicePixelRatio
        // don't need to recall context.configure() after v104
        draw(device, context, pipeline)
    })
}
run()