import basicVert from './shaders/basic.vert.wgsl?raw'
import imageTexture from './shaders/imageTexture.frag.wgsl?raw'
import * as cube from './util/cube'
import { getMvpMatrix } from './util/math'

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

// create pipiline & buffers
async function initPipeline(device: GPUDevice, format: GPUTextureFormat, size: { width: number, height: number }) {
    const pipeline = await device.createRenderPipelineAsync({
        label: 'Basic Pipline',
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: basicVert,
            }),
            entryPoint: 'main',
            buffers: [{
                arrayStride: 5 * 4, // 3 position 2 uv,
                attributes: [
                    {
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float32x3'
                    },
                    {
                        // uv
                        shaderLocation: 1,
                        offset: 3 * 4,
                        format: 'float32x2'
                    }
                ]
            }]
        },
        fragment: {
            module: device.createShaderModule({
                code: imageTexture,
            }),
            entryPoint: 'main',
            targets: [
                {
                    format: format
                }
            ]
        },
        primitive: {
            topology: 'triangle-list',
            // Culling backfaces pointing away from the camera
            cullMode: 'back',
            frontFace: 'ccw'
        },
        // Enable depth testing since we have z-level positions
        // Fragment closest to the camera is rendered in front
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus'
        }
    } as GPURenderPipelineDescriptor)
    // create depthTexture for renderPass
    const depthTexture = device.createTexture({
        size, format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    })
    const depthView = depthTexture.createView()
    // create vertex buffer
    const vertexBuffer = device.createBuffer({
        label: 'GPUBuffer store vertex',
        size: cube.vertex.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    })
    device.queue.writeBuffer(vertexBuffer, 0, cube.vertex)
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
    // return all vars
    return { pipeline, vertexBuffer, mvpBuffer, uniformGroup, depthTexture, depthView }
}

// create & submit device commands
function draw(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipelineObj: {
        pipeline: GPURenderPipeline
        vertexBuffer: GPUBuffer
        mvpBuffer: GPUBuffer
        uniformGroup: GPUBindGroup
        depthView: GPUTextureView
    },
    textureGroup: GPUBindGroup
) {
    // start encoder
    const commandEncoder = device.createCommandEncoder()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                 // set background color
                clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                //what to do with view before draw
                loadOp: 'clear', // clear content of the view and then draw, 'clear', 'load', 'dont-care'
                //what to do with view after draw
                storeOp: 'store'// store the result of the draw, 'store', 'dont-care', 'discard'
            }
        ],
        depthStencilAttachment: {
            view: pipelineObj.depthView,
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store'
        }
    }
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    //load pipeline
    passEncoder.setPipeline(pipelineObj.pipeline)
    // set uniformGroup
    passEncoder.setBindGroup(0, pipelineObj.uniformGroup)
    passEncoder.setBindGroup(1, textureGroup)
    // set vertex
    passEncoder.setVertexBuffer(0, pipelineObj.vertexBuffer)
    // draw vertex count of cube, how many threads to run to generate the vertex
    // Can be change to stroke later
    passEncoder.draw(cube.vertexCount)
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}



//矢量圆形笔刷
async function run() {
    const canvas = document.querySelector('canvas#webgpu') as HTMLCanvasElement;
    const canvas2 = document.querySelector('canvas#canvas') as HTMLCanvasElement;
    // canvas.style.position = 'absolute';
    // canvas.style.zIndex = '2';
    // canvas2.style.position = 'absolute';
    // canvas2.style.zIndex = '1';
    
    if (!canvas || !canvas2) throw new Error('No Canvas');

    // 初始化 WebGPU
    const { device, context, format, size } = await initWebGPU(canvas);
    const pipelineObj = await initPipeline(device, format, size);

    // 设置 canvas2 的大小并初始化
    canvas2.width = window.innerWidth * 0.6;
    canvas2.height = window.innerHeight * 0.6;
    const ctx = canvas2.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas2.width, canvas2.height);

    // 初始化纹理并同步大小
    let textureSize = [canvas2.width, canvas2.height];
    let texture = device.createTexture({
        size: textureSize,
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING |
               GPUTextureUsage.COPY_DST |
               GPUTextureUsage.RENDER_ATTACHMENT
    });
    let sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear'
    });
    let textureGroup = device.createBindGroup({
        label: 'Texture Group with Texture/Sampler',
        layout: pipelineObj.pipeline.getBindGroupLayout(1),
        entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: texture.createView() }
        ]
    });

    // 默认缩放和平移参数
    let aspect = size.width / size.height;
    let position = { x: 0, y: 0, z: -5 };
    let scale = { x: 1, y: 1, z: 1 };
    let rotation = { x: 0, y: 0, z: 0 };

    let scaleFactor = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startX = 0, startY = 0;
    let strokes: { x: number; y: number; radius: number; hue: number }[] = [];

    function drawBrush(x: number, y: number, hue: number) {
        const radius = 5;
        strokes.push({ x, y, radius, hue });
        redrawCanvas();
    }

    // 重新绘制 canvas2 内容，考虑缩放和平移
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas2.width, canvas2.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas2.width, canvas2.height);

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scaleFactor, scaleFactor);

        for (const stroke of strokes) {
            ctx.fillStyle = `hsl(${stroke.hue}, 90%, 50%)`;
            ctx.beginPath();
            ctx.arc(stroke.x, stroke.y, stroke.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 缩放处理
    canvas2.addEventListener('wheel', (e: WheelEvent) => {
        const zoomIntensity = 0.1;
        const newScaleFactor = scaleFactor + e.deltaY * -zoomIntensity;
        const mouseX = (e.offsetX - offsetX) / scaleFactor;
        const mouseY = (e.offsetY - offsetY) / scaleFactor;
        scaleFactor = Math.max(0.1, newScaleFactor);
        offsetX = e.offsetX - mouseX * scaleFactor;
        offsetY = e.offsetY - mouseY * scaleFactor;
        redrawCanvas();
    });

    // 平移处理
    canvas2.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button === 1) {
            isPanning = true;
            startX = e.clientX - offsetX;
            startY = e.clientY - offsetY;
            canvas2.style.cursor = 'grabbing';
        }
    });
    canvas2.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isPanning) return;
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        redrawCanvas();
    });
    canvas2.addEventListener('mouseup', () => { isPanning = false; canvas2.style.cursor = 'default'; });
    canvas2.addEventListener('mouseleave', () => { isPanning = false; canvas2.style.cursor = 'default'; });

    // 绘制笔刷事件
    canvas2.addEventListener('pointerdown', (e: PointerEvent) => {
        const hue = (Date.now() / 10) % 360;
        drawBrush((e.offsetX - offsetX) / scaleFactor, (e.offsetY - offsetY) / scaleFactor, hue);
    });
    canvas2.addEventListener('pointermove', (e: PointerEvent) => {
        if (e.buttons !== 1) return;
        const hue = (Date.now() / 10) % 360;
        drawBrush((e.offsetX - offsetX) / scaleFactor, (e.offsetY - offsetY) / scaleFactor, hue);
    });

    // 动态更新 WebGPU 纹理和画布内容
    function frame() {
        device.queue.copyExternalImageToTexture(
            { source: canvas2 },
            { texture: texture },
            textureSize
        );

        const now = Date.now() / 1000;
        rotation.x = Math.sin(now);
        rotation.y = Math.cos(now);
        const mvpMatrix = getMvpMatrix(aspect, position, rotation, scale);
        device.queue.writeBuffer(pipelineObj.mvpBuffer, 0, mvpMatrix.buffer);

        draw(device, context, pipelineObj, textureGroup);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // 调整窗口大小
    window.addEventListener('resize', () => {
        canvas2.width = window.innerWidth * 0.6;
        canvas2.height = window.innerHeight * 0.6;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas2.width, canvas2.height);
        textureSize = [canvas2.width, canvas2.height];
        texture.destroy();
        texture = device.createTexture({
            size: textureSize,
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                   GPUTextureUsage.COPY_DST |
                   GPUTextureUsage.RENDER_ATTACHMENT
        });
        textureGroup = device.createBindGroup({
            label: 'Texture Group with Texture/Sampler',
            layout: pipelineObj.pipeline.getBindGroupLayout(1),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture.createView() }
            ]
        });
        redrawCanvas();
    });
}
run();


// async function run() {
//     const canvas = document.querySelector('canvas#webgpu') as HTMLCanvasElement
//     const canvas2 = document.querySelector('canvas#canvas') as HTMLCanvasElement
//     if (!canvas || !canvas2)
//         throw new Error('No Canvas')
//     const { device, context, format, size } = await initWebGPU(canvas)
//     const pipelineObj = await initPipeline(device, format, size)

//     // create empty texture
//     const textureSize = [canvas2.width, canvas2.height]
//     const texture = device.createTexture({
//         size: textureSize,
//         format: 'rgba8unorm',
//         usage:
//             GPUTextureUsage.TEXTURE_BINDING |
//             GPUTextureUsage.COPY_DST |
//             GPUTextureUsage.RENDER_ATTACHMENT
//     })
//     // Create a sampler with linear filtering for smooth interpolation.
//     const sampler = device.createSampler({
//         // addressModeU: 'repeat',
//         // addressModeV: 'repeat',
//         magFilter: 'linear',
//         minFilter: 'linear'
//     })
//     const textureGroup = device.createBindGroup({
//         label: 'Texture Group with Texture/Sampler',
//         layout: pipelineObj.pipeline.getBindGroupLayout(1),
//         entries: [
//             {
//                 binding: 0,
//                 resource: sampler
//             },
//             {
//                 binding: 1,
//                 resource: texture.createView()
//             }
//         ]
//     })

//     // default state
//     let aspect = size.width / size.height
//     const position = { x: 0, y: 0, z: -5 }
//     const scale = { x: 1, y: 1, z: 1 }
//     const rotation = { x: 0, y: 0, z: 0 }
//     // start loop
//     function frame() {
//         // rotate by time, and update transform matrix
//         const now = Date.now() / 1000
//         rotation.x = Math.sin(now)
//         rotation.y = Math.cos(now)
//         const mvpMatrix = getMvpMatrix(aspect, position, rotation, scale)
//         device.queue.writeBuffer(
//             pipelineObj.mvpBuffer,
//             0,
//             mvpMatrix.buffer
//         )
//         // update texture from canvas every frame
//         device.queue.copyExternalImageToTexture(
//             { source: canvas2 },
//             { texture: texture },
//             textureSize
//         )
//         // then draw
//         draw(device, context, pipelineObj, textureGroup)
//         requestAnimationFrame(frame)
//     }
//     requestAnimationFrame(frame)

//     // re-configure context on resize
//     window.addEventListener('resize', () => {
//         size.width = canvas.width = canvas.clientWidth * devicePixelRatio
//         size.height = canvas.height = canvas.clientHeight * devicePixelRatio
//         // don't need to recall context.configure() after v104
//         // re-create depth texture
//         pipelineObj.depthTexture.destroy()
//         pipelineObj.depthTexture = device.createTexture({
//             size, format: 'depth24plus',
//             usage: GPUTextureUsage.RENDER_ATTACHMENT
//         })
//         pipelineObj.depthView = pipelineObj.depthTexture.createView()
//         // update aspect
//         aspect = size.width / size.height
//     })

//     // a simple 2d canvas whiteboard
//     {
//         const ctx = canvas2.getContext('2d')
//         if(!ctx)
//             throw new Error('No support 2d')
//         ctx.fillStyle = '#fff'
//         ctx.lineWidth = 5
//         ctx.lineCap = 'round'
//         ctx.lineJoin = 'round'
//         ctx.fillRect(0,0, canvas2.width, canvas2.height)

//         let drawing = false
//         let lastX = 0, lastY = 0
//         let hue = 0
//         canvas2.addEventListener('pointerdown', (e:PointerEvent) => {
//             drawing = true
//             lastX = e.offsetX
//             lastY = e.offsetY
//         })
//         canvas2.addEventListener('pointermove', (e:PointerEvent) => {
//             if(!drawing)
//                 return
//             const x = e.offsetX
//             const y = e.offsetY
//             hue = hue > 360 ? 0 : hue +1
//             ctx.strokeStyle = `hsl(${ hue }, 90%, 50%)`
//             ctx.beginPath()
//             ctx.moveTo(lastX, lastY)
//             ctx.lineTo(x, y)
//             ctx.stroke()

//             lastX = x
//             lastY = y
//         })
//         canvas2.addEventListener('pointerup', ()=> drawing = false)
//         canvas2.addEventListener('pointerout', ()=> drawing = false)
//     }
// }
// run()

// async function run() {
//     const canvas = document.querySelector('canvas#webgpu') as HTMLCanvasElement;
//     const canvas2 = document.querySelector('canvas#canvas') as HTMLCanvasElement;
//     if (!canvas || !canvas2) throw new Error('No Canvas');

//     const { device, context, format, size } = await initWebGPU(canvas);
//     const pipelineObj = await initPipeline(device, format, size);

//     canvas2.width = window.innerWidth * 0.6;
//     canvas2.height = window.innerHeight * 0.6;

//     let textureSize = [canvas2.width, canvas2.height];
//     let texture = device.createTexture({
//         size: textureSize,
//         format: 'rgba8unorm',
//         usage: GPUTextureUsage.TEXTURE_BINDING |
//                GPUTextureUsage.COPY_DST |
//                GPUTextureUsage.RENDER_ATTACHMENT
//     });
//     const sampler = device.createSampler({
//         magFilter: 'linear',
//         minFilter: 'linear'
//     });
//     let textureGroup = device.createBindGroup({
//         label: 'Texture Group with Texture/Sampler',
//         layout: pipelineObj.pipeline.getBindGroupLayout(1),
//         entries: [
//             { binding: 0, resource: sampler },
//             { binding: 1, resource: texture.createView() }
//         ]
//     });

//     let aspect = size.width / size.height;
//     const position = { x: 0, y: 0, z: -5 };
//     const scale = { x: 1, y: 1, z: 1 };
//     const rotation = { x: 0, y: 0, z: 0 };

//     const ctx = canvas2.getContext('2d')!;
//     ctx.fillStyle = '#fff';
//     ctx.lineWidth = 5;
//     ctx.lineCap = 'round';
//     ctx.lineJoin = 'round';
//     ctx.fillRect(0, 0, canvas2.width, canvas2.height);

//     let scaleFactor = 1;
//     let offsetX = 0;
//     let offsetY = 0;
//     let drawing = false;
//     let lastX = 0, lastY = 0;
//     let hue = 0;

//     // 绘制 pixel 笔刷的逻辑
//     function drawPixelBrush(x: number, y: number) {
//         hue = hue > 360 ? 0 : hue + 1;
//         ctx.strokeStyle = `hsl(${hue}, 90%, 50%)`;
//         ctx.beginPath();
//         ctx.moveTo(lastX, lastY);
//         ctx.lineTo(x, y);
//         ctx.stroke();
//         lastX = x;
//         lastY = y;
//     }

//     // 鼠标绘制事件
//     canvas2.addEventListener('pointerdown', (e: PointerEvent) => {
//         drawing = true;
//         lastX = (e.offsetX - offsetX) / scaleFactor;
//         lastY = (e.offsetY - offsetY) / scaleFactor;
//     });

//     canvas2.addEventListener('pointermove', (e: PointerEvent) => {
//         if (!drawing) return;
//         const x = (e.offsetX - offsetX) / scaleFactor;
//         const y = (e.offsetY - offsetY) / scaleFactor;
//         drawPixelBrush(x, y);
//     });

//     canvas2.addEventListener('pointerup', () => (drawing = false));
//     canvas2.addEventListener('pointerout', () => (drawing = false));

//     // 缩放事件：仅放大已绘制内容
//     canvas2.addEventListener('wheel', (e: WheelEvent) => {
//         const zoomIntensity = 0.1;
//         const newScaleFactor = scaleFactor + e.deltaY * -zoomIntensity;
//         const mouseX = (e.offsetX - offsetX) / scaleFactor;
//         const mouseY = (e.offsetY - offsetY) / scaleFactor;
//         scaleFactor = Math.max(0.1, newScaleFactor);

//         // 更新偏移量，保持缩放中心
//         offsetX = e.offsetX - mouseX * scaleFactor;
//         offsetY = e.offsetY - mouseY * scaleFactor;

//         // 不重绘笔触，只放大现有内容
//         redrawCanvas();
//     });

//     // 重新绘制 canvas2 内容以应用缩放和偏移
//     function redrawCanvas() {
//         ctx.save();
//         ctx.setTransform(scaleFactor, 0, 0, scaleFactor, offsetX, offsetY);
//         ctx.clearRect(0, 0, canvas2.width, canvas2.height);
//         ctx.drawImage(canvas2, 0, 0); // 放大已绘制的像素内容
//         ctx.restore();
//     }

//     // 动态更新 WebGPU 纹理
//     function frame() {
//         device.queue.copyExternalImageToTexture(
//             { source: canvas2 },
//             { texture: texture },
//             textureSize
//         );

//         const now = Date.now() / 1000;
//         rotation.x = Math.sin(now);
//         rotation.y = Math.cos(now);
//         const mvpMatrix = getMvpMatrix(aspect, position, rotation, scale);
//         device.queue.writeBuffer(pipelineObj.mvpBuffer, 0, mvpMatrix.buffer);

//         draw(device, context, pipelineObj, textureGroup);
//         requestAnimationFrame(frame);
//     }
//     requestAnimationFrame(frame);

//     // 处理窗口调整大小
//     window.addEventListener('resize', () => {
//         canvas2.width = window.innerWidth * 0.6;
//         canvas2.height = window.innerHeight * 0.6;
//         ctx.fillStyle = '#fff';
//         ctx.fillRect(0, 0, canvas2.width, canvas2.height);
//         textureSize = [canvas2.width, canvas2.height];
//         texture.destroy();
//         texture = device.createTexture({
//             size: textureSize,
//             format: 'rgba8unorm',
//             usage: GPUTextureUsage.TEXTURE_BINDING |
//                    GPUTextureUsage.COPY_DST |
//                    GPUTextureUsage.RENDER_ATTACHMENT
//         });
//         textureGroup = device.createBindGroup({
//             label: 'Texture Group with Texture/Sampler',
//             layout: pipelineObj.pipeline.getBindGroupLayout(1),
//             entries: [
//                 { binding: 0, resource: sampler },
//                 { binding: 1, resource: texture.createView() }
//             ]
//         });
//     });
// }
// run();