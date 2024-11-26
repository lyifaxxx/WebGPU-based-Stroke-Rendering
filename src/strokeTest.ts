import strokeVert from './shaders/stroke.vert.wgsl?raw'
import basicFrag from './shaders/red.frag.wgsl?raw'
import stampFrag from './shaders/stamp.frag.wgsl?raw'
import { Stroke } from './util/stroke'
import { Track } from './util/track'
import { mat4, vec2, vec3 } from "gl-matrix";
import * as renderer from './renderer';
// import textureUrl from '../texture.webp?url'
//import png
import textureUrl from '../stamp1.png'


export class StrokeRenderer extends renderer.Renderer {
    pipeline: GPURenderPipeline;
    uniformsBindGroup: GPUBindGroup;
    uniformsBindGroupLayout: GPUBindGroupLayout;

    // Store the stroke texture and its view
    strokeTexture: GPUTexture;
    strokeTextureView: GPUTextureView
    
    constructor(stroke: Stroke, track: Track) {
        super(stroke, track);
        
        this.strokeTexture = renderer.device.createTexture({
            label: "Initiate texture",
            size: [renderer.size.width, renderer.size.height], 
            //size: [512, 512], 
            format: 'rgba8unorm', 
            usage: GPUTextureUsage.TEXTURE_BINDING |  
                   GPUTextureUsage.COPY_SRC |        
                   GPUTextureUsage.RENDER_ATTACHMENT 
        });        

        this.strokeTextureView = this.strokeTexture.createView({
            label: "Initiate texture view"
        });

        const sampler = renderer.device.createSampler({
            label: 'Sampler',
            magFilter: 'linear',
            minFilter: 'linear',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
        })

        this.uniformsBindGroupLayout = renderer.device.createBindGroupLayout({
            label: 'UniformsBindGroupLayout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'read-only-storage',
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }
            ]
        });

        this.uniformsBindGroup = renderer.device.createBindGroup({
            label: 'UniformsBindGroup',
            layout: this.uniformsBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: stroke.vertexBuffer
                    }
                }
                ,{
                    // Sampler binding
                    binding: 1,
                    resource: sampler
                },
                {
                    // Texture view binding
                    binding: 2,
                    resource: this.strokeTextureView
                }
            ]
        })

        this.pipeline = renderer.device.createRenderPipeline(
            {
                label: 'stroke-pipeline',
                layout: renderer.device.createPipelineLayout({
                    label: 'stroke-pipeline-layout',
                    bindGroupLayouts: [this.uniformsBindGroupLayout]
                }),    
                vertex: {
                    module: renderer.device.createShaderModule({
                        label: 'stroke-vert',
                        code: strokeVert
                    }),
                    entryPoint: 'main',
                },
                primitive: {
                    topology: 'triangle-strip' // try point-list, line-list, line-strip, triangle-strip?
                },
                fragment: {
                    module: renderer.device.createShaderModule({
                        //code: basicFrag
                        code: stampFrag
                    }),
                    entryPoint: 'main',
                    targets: [
                        {
                            format: renderer.format,
                            blend: {
                                color: {
                                    srcFactor: 'src-alpha',   // 使用源的 Alpha 值
                                    dstFactor: 'one-minus-src-alpha', // 目标透明度
                                    operation: 'add',
                                },
                                alpha: {
                                    srcFactor: 'one',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add',
                                },
                            },
                        }
                    ]
                }
            }
        );

        // this.uniformsBindGroup = renderer.device.createBindGroup({
        //     label: 'UniformGroup',
        //     layout: this.pipeline.getBindGroupLayout(0),
        //     entries: [
        //         {
        //             binding: 0,
        //             resource: {
        //                 buffer: stroke.vertexBuffer
        //             }
        //         }
        //     ]
        // })

    }

     buildPipeline(fragShader: string) {
        this.pipeline = renderer.device.createRenderPipeline({
            label: 'stroke-pipeline',
            layout: renderer.device.createPipelineLayout({
                label: 'stroke-pipeline-layout',
                bindGroupLayouts: [this.uniformsBindGroupLayout],
            }),
            vertex: {
                module: renderer.device.createShaderModule({
                    label: 'stroke-vert',
                    code: strokeVert,
                }),
                entryPoint: 'main',
            },
            primitive: {
                topology: 'triangle-strip',
            },
            fragment: {
                module: renderer.device.createShaderModule({
                    code: fragShader,
                }),
                entryPoint: 'main',
                targets: [
                    {
                        format: renderer.format,
                        blend: {
                            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        },
                    },
                ],
            },
        });
    }

    updateBindGroup() {
        this.uniformsBindGroup = renderer.device.createBindGroup({
            label: 'UpdatedUniformsBindGroup',
            layout: this.uniformsBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.stroke.vertexBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: renderer.device.createSampler({
                        label: 'UpdatedSampler',
                        magFilter: 'linear',
                        minFilter: 'linear',
                    }),
                },
                {
                    binding: 2,
                    resource: this.strokeTextureView, // use new texture view
                },
            ],
        });
    }

    override draw() {
        const commandEncoder = renderer.device.createCommandEncoder()
        const view = renderer.context.getCurrentTexture().createView({
            label: 'getCurrentTexture texture view'
        })
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
        passEncoder.setPipeline(this.pipeline)
        //passEncoder.setBindGroup(0, this.uniformGroup)
        passEncoder.setBindGroup(0, this.uniformsBindGroup)

        passEncoder.drawIndirect(this.stroke.indirectBuffer, 0)

        passEncoder.end()
        // webgpu run in a separate process, all the commands will be executed after submit
        renderer.device.queue.submit([commandEncoder.finish()])
    }
}


async function loadTexture(url: string): Promise<GPUTexture> {
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Failed to load texture: ${url}`);
        throw new Error(`Failed to load texture: ${response.statusText}`);
    }

    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // console.log('Loaded image:', imageBitmap);
    const textureImg = renderer.device.createTexture({
        label: 'Texture from image',
        size: [imageBitmap.width, imageBitmap.height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // update image to GPUTexture
    renderer.device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: textureImg},
        [imageBitmap.width, imageBitmap.height]
    );

    // console.log('UPDATE: Loaded image:', imageBitmap);
    // console.log('UPDATE: Created texture:', texture);
    return textureImg;
}

async function run(){

    await renderer.initWebGPU()
    const canvas = renderer.canvas;
    // console.log("canvas", canvas)
    // console.log("device", renderer.device)

    // add new stroke
    const stroke = new Stroke(renderer.device, vec2.fromValues(-0.5, 0.0), vec2.fromValues(0.5, 0.0))

    // add track class
    const track = new Track(stroke);
    var strokeRenderer: StrokeRenderer;
    strokeRenderer = new StrokeRenderer(stroke, track);

    // add texture from image
    const stampTexture = await loadTexture(textureUrl);
    strokeRenderer.strokeTexture = stampTexture;
    // console.log("stampTexture", strokeRenderer.strokeTexture);
    strokeRenderer.strokeTextureView = stampTexture.createView({
        label: "Texture from image texture view"
    });
    strokeRenderer.updateBindGroup();

    // re-configure context on resize
    window.addEventListener('resize', ()=>{
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;        
        // don't need to recall context.configure() after v104
        strokeRenderer.draw()
    })

    function frame() {
        // start draw
        strokeRenderer.draw()
        requestAnimationFrame(frame)
        // console.log("FRAME:stampTexture", strokeRenderer.strokeTexture);
    }
    requestAnimationFrame(frame)
    
}

run()