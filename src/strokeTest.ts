import {GUI} from 'dat.gui'
import strokeVert from './shaders/stroke.vert.wgsl?raw'
import basicFrag from './shaders/red.frag.wgsl?raw'
import stampFrag from './shaders/stamp.frag.wgsl?raw'
import airFrag from './shaders/air.frag.wgsl?raw'
import computeShader from './shaders/prefix.cs.wgsl?raw'
import { Stroke } from './util/stroke'
import { Track } from './util/track'
import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import * as renderer from './renderer';
// import textureUrl from '../texture.webp?url'
//import png
import textureUrl from '../stamp1.png'


export class StrokeRenderer extends renderer.Renderer {
    pipeline: GPURenderPipeline;
    computePipeline: GPUComputePipeline;
    uniformsBindGroup: GPUBindGroup;
    uniformsBindGroupLayout: GPUBindGroupLayout;

    computeBindGroup: GPUBindGroup;
    computeBindGroupLayout: GPUBindGroupLayout;

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
                    // vertex buffer binding
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'read-only-storage',
                    }
                },
                {
                    // Sampler binding
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    // Texture view binding
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    // color buffer binding
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'read-only-storage',
                    }
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
                },
                {
                    // color buffer
                    binding: 3,
                    resource: {
                        buffer: stroke.colorBuffer
                    }
                }
            ]
        })

        this.computeBindGroupLayout = renderer.device.createBindGroupLayout({
            label: 'ComputeBindGroupLayout',
            entries: [
                {
                    // vertex buffer binding
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage',
                    }
                },
                {
                    // stamp count
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage',
                    }
                }
            ]
        });

        this.computeBindGroup = renderer.device.createBindGroup({
            label: 'ComputeBindGroup',
            layout: this.computeBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: stroke.vertexBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: stroke.stampCountBuffer
                    }
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
                        code: basicFrag
                        // code: stampFrag
                        //code: airFrag

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

        this.computePipeline = renderer.device.createComputePipeline({
            layout: renderer.device.createPipelineLayout({
                label: 'compute-pipeline',
                bindGroupLayouts: [
                    this.computeBindGroupLayout
                ]
            }),
            compute: {
                module: renderer.device.createShaderModule({
                    code: computeShader
                }),
                entryPoint: 'main'
            }
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
                {
                    // color buffer
                    binding: 3,
                    resource: {
                        buffer: this.stroke.colorBuffer,
                    },
                }
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

    // gui
    const gui = new GUI();
    let strokeFolder: GUI;
    let typeFolder: GUI;
    
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

    strokeFolder = gui.addFolder('Stroke Properties');

    // add color control
    var color = {value: [0, 0, 0]}
    var strokeColor = vec3.fromValues(color.value[0]/255, color.value[1]/255, color.value[2]/255);
    strokeFolder.addColor(color, 'value').onChange((value) => {  
        strokeColor = vec3.fromValues(value[0]/255, value[1]/255, value[2]/255);
        console.log("strokeColor", strokeColor);
        stroke.updateColorBuffer(strokeColor);
        stroke.strokeColor = vec4.fromValues(strokeColor[0], strokeColor[1], strokeColor[2], 1);
    });

    // adjust stroke width
    var width = {value: 0.01}
    strokeFolder.add(width, 'value', 0.01, 0.1).name('Width').onChange((value) => {
        stroke.updateWidth(value);
    });

    strokeFolder.open();


    // add eraser checkbox
    var eraser = {value: false}
    gui.add(eraser, 'value').name('Eraser').onChange((value) => {
        if(value) {
            stroke.updateColorBuffer(vec3.fromValues(1.0, 1.0, 1.0));
        } else {
            stroke.updateColorBuffer(strokeColor);
        }
    });


    // Add Stamp Loader to GUI
    const loaderConfig = {
        loadStamp: () => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";
            fileInput.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    const url = URL.createObjectURL(file); // Create a blob URL
                    const newTexture = await loadTexture(url); // Load the new texture
                    strokeRenderer.strokeTexture = newTexture;
                    strokeRenderer.strokeTextureView = newTexture.createView({
                        label: "Loaded Stamp Texture View",
                    });
                    strokeRenderer.updateBindGroup();
                    strokeRenderer.draw(); // Redraw with the new texture
                    // handleLoadedTexture(url); // Pass the URL to another function
                    console.log(`Loaded texture: ${url}`);
                }
            };
            fileInput.click(); // Trigger the file input
        },
    };

    gui.add(loaderConfig, "loadStamp").name("Load Stamp Image");

    function NDCToPixel(ndc: vec2) {
        const pixel = vec2.create();
        const width = renderer.size.width;
        const height = renderer.size.height;

        const normalizedX = (ndc[0] + 1) * 0.5;
        const normalizedY = (ndc[1] + 1) * 0.5;

        pixel[0] = normalizedX * width;
        pixel[1] = (1 - normalizedY) * height;
        
        
        return pixel;
    }

    function exportSVG() {
        const width = renderer.size.width;
        const height = renderer.size.height;
        
        // Example SVG content using geometry (customize as needed)
        let paths = '';
        track.polyline.forEach((stroke) => {
            console.log(stroke);
            let startPixel = NDCToPixel(stroke.startPos);
            let endPixel = NDCToPixel(stroke.endPos);

            const radius = 1000 * stroke.radius;
            let perpenDir = vec3.create();
            let dir = vec2.create();
            vec2.subtract(dir, endPixel, startPixel);
            vec2.normalize(dir, dir);
            vec3.cross(perpenDir, vec3.fromValues(dir[0], dir[1], 0), vec3.fromValues(0, 0, -1));         
            
            paths += `
                <path d="
                    M ${startPixel[0]} ${startPixel[1]}
                    L ${endPixel[0]} ${endPixel[1]}
                    L ${endPixel[0] - perpenDir[0] * radius} ${endPixel[1] - perpenDir[1] * radius}
                    A ${radius} ${radius} 0 0 1 ${endPixel[0] + perpenDir[0] * radius} ${endPixel[1] + perpenDir[1] * radius}
                    L ${startPixel[0]+ perpenDir[0] * radius} ${startPixel[1] + perpenDir[1] * radius}
                    A ${radius} ${radius} 0 0 1 ${startPixel[0] - perpenDir[0] * radius} ${startPixel[1] - perpenDir[1] * radius}
                    L ${endPixel[0] - perpenDir[0] * radius} ${endPixel[1] - perpenDir[1] * radius}
                    L ${endPixel[0]} ${endPixel[1]}
                    Z
                " 
                fill="rgb(${stroke.displayColor[0] * 256}, ${stroke.displayColor[1] * 256}, ${stroke.displayColor[2] * 256})" fill-opacity="${1}" />
            `;
        });
        
        const svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                ${paths}
            </svg>
        `;
        // const svgContent = `
        // <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 800 600">
        //     <path d="
        //         M 80 80
        //         L 130 80
        //         L 130 70
        //         A 10 10 0 0 1 130 90
        //         L 80 90
        //         A 10 10 0 0 1 80 70
        //         L 130 70
        //         L 130 80
        //         Z
        //     " 
        //     fill="rgb(0, 128, 255)" fill-opacity="0.5"
        //      />
        //     <path d="
        //         M 100 50
        //         L 100 150
        //         L 110 150
        //         A 10 10 0 0 1 90 150
        //         L 90 50
        //         A 10 10 0 0 1 110 50
        //         L 110 150
        //         L 100 150
        //         Z
        //     " 
        //     fill="rgb(0, 128, 255)" fill-opacity="0.5" />
        // </svg>
        // `;

        // Convert the SVG content to a Blob
        const blob = new Blob([svgContent], { type: "image/svg+xml" });

        // Create a download link
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "canvas_output.svg";
        a.click();
        URL.revokeObjectURL(a.href); // Cleanup
    }

    function undo() {
        console.log("undo");
        stroke.withdrawStroke();
    }

    function handleStrokeSelection(target) {
        let selectedShader;
        switch (target) {
            case 'vanilla':
                console.log('Switching to Vanilla stroke');
                // Add logic to set up "Vanilla" stroke
                stroke.updateType(0);
                break;
            case 'Stamp':
                console.log('Switching to Stamp stroke');
                // Add logic to set up "Stamp" stroke
                stroke.updateType(1);
                break;
            case 'Air':
                console.log('Switching to Air stroke');
                // Add logic to set up "Air" stroke
                stroke.updateType(2);
                break;
            default:
                console.error(`Unknown stroke: ${target}`);
                stroke.updateType(0);
        }

        // Dynamically rebuild the pipeline with the selected shader
        strokeRenderer.pipeline = renderer.device.createRenderPipeline({
            label: "stroke-pipeline",
            layout: renderer.device.createPipelineLayout({
                label: "stroke-pipeline-layout",
                bindGroupLayouts: [strokeRenderer.uniformsBindGroupLayout],
            }),
            vertex: {
                module: renderer.device.createShaderModule({
                    label: "stroke-vert",
                    code: strokeVert,
                }),
                entryPoint: "main",
            },
            primitive: {
                topology: "triangle-strip",
            },
            fragment: {
                module: renderer.device.createShaderModule({
                    code: basicFrag,
                }),
                entryPoint: "main",
                targets: [
                    {
                        format: renderer.format,
                        blend: {
                            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                        },
                    },
                ],
            },
        });
    }

    typeFolder = gui.addFolder('Stroke Type');

    typeFolder.add({ selectVanilla: () => handleStrokeSelection('vanilla') }, 'selectVanilla').name('Vanilla Stroke');
    typeFolder.add({ selectStamp: () => handleStrokeSelection('Stamp') }, 'selectStamp').name('Stamp Stroke');
    typeFolder.add({ selectAir: () => handleStrokeSelection('Air') }, 'selectAir').name('Air Stroke');
    gui.add({ selectExport: () => exportSVG() }, 'selectExport').name('Export to SVG');

    typeFolder.open();

    // withdraw last stroke
    gui.add({ selectUndo: () => undo() }, 'selectUndo').name('Undo');

    // clear the screen
    gui.add({ selectClear: () => stroke.cleanVertexBuffer() }, 'selectClear').name('Clear');

    function frame() {
        // start draw
        strokeRenderer.draw()
        requestAnimationFrame(frame)
        // console.log("FRAME:stampTexture", strokeRenderer.strokeTexture);
    }
    requestAnimationFrame(frame)
    
}

run()