import basicVert from './shaders/position.vert.wgsl?raw';
import imageTexture from './shaders/imageTexture.frag.wgsl?raw';
// initialize webgpu device & config canvas context
async function initWebGPU(canvas: HTMLCanvasElement) {
    if (!navigator.gpu)
        throw new Error('Not Support WebGPU')
    const adapter = await navigator.gpu.requestAdapter()
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
        device, format,
        // prevent chrome warning after v102
        alphaMode: 'opaque'
    })
    return { device, context, format, size }
}

async function createPipeline(device: GPUDevice, format: GPUTextureFormat) {
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({ code: basicVert }),
            entryPoint: 'main',
            buffers: [
                {
                    arrayStride: 5 * 4,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' }, // Position
                        { shaderLocation: 1, offset: 3 * 4, format: 'float32x2' }, // UV
                    ],
                },
            ],
        },
        fragment: {
            module: device.createShaderModule({ code: imageTexture }),
            entryPoint: 'main',
            targets: [{ format }],
        },
        primitive: { topology: 'triangle-strip' },
        depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' },
    });
    return pipeline;
}


function createBrushVertices(x: number, y: number, radius: number) {
    const halfSize = radius;
    return new Float32Array([
        // x, y, z,   u, v
        x - halfSize, y - halfSize, 0.0, 0.0, 1.0,  // Bottom-left
        x + halfSize, y - halfSize, 0.0, 1.0, 1.0,  // Bottom-right
        x - halfSize, y + halfSize, 0.0, 0.0, 0.0,  // Top-left
        x + halfSize, y + halfSize, 0.0, 1.0, 0.0,  // Top-right
    ]);
}

let strokes: Float32Array[] = []; // 存储所有笔触顶点数据

function addBrushStroke(x: number, y: number, radius: number) {
    const vertices = createBrushVertices(x, y, radius);
    strokes.push(vertices);
}

function draw(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    depthTexture: GPUTexture,
    vertexBuffer: GPUBuffer
) {
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{ view: textureView, loadOp: 'clear', storeOp: 'store', clearValue: { r: 1, g: 1, b: 1, a: 1 } }],
        depthStencilAttachment: { view: depthTexture.createView(), depthLoadOp: 'clear', depthStoreOp: 'store', depthClearValue: 1.0 },
    });

    renderPass.setPipeline(pipeline);

    strokes.forEach(strokeVertices => {
        device.queue.writeBuffer(vertexBuffer, 0, strokeVertices);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.draw(4); // 绘制四边形
    });

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
}

async function run() {
    const canvas = document.querySelector('canvas#webgpu') as HTMLCanvasElement;
    const { device, context, format } = await initWebGPU(canvas);
    const pipeline = await createPipeline(device, format);

    const depthTexture = device.createTexture({
        size: { width: canvas.width, height: canvas.height, depthOrArrayLayers: 1 },
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const vertexBuffer = device.createBuffer({
        size: 4 * 5 * 4, // 4 vertices * (x, y, z, u, v) * 4 bytes per float
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    let isDrawing = false;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
        isDrawing = true;
        addBrushStroke(e.offsetX, e.offsetY, 10); // Add stroke with a default radius
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
        if (isDrawing) {
            addBrushStroke(e.offsetX, e.offsetY, 10);
        }
    });

    canvas.addEventListener('pointerup', () => {
        isDrawing = false;
    });

    function frame() {
        draw(device, context, pipeline, depthTexture, vertexBuffer);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

run();
