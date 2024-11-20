import strokeVert from './shaders/stroke.vert.wgsl?raw'
import basicFrag from './shaders/red.frag.wgsl?raw'
import { Stroke } from './util/stroke'
import { Track } from './util/track'
import { mat4, vec2, vec3 } from "gl-matrix";
import * as renderer from './renderer';



export class StrokeRenderer extends renderer.Renderer {
    pipeline: GPURenderPipeline;
    uniformsBindGroup: GPUBindGroup;

    constructor(stroke: Stroke, track: Track) {
        super(stroke, track);

        this.pipeline = renderer.device.createRenderPipeline(
            {
                label: 'stroke-pipeline',
                layout:'auto',    
                vertex: {
                    module: renderer.device.createShaderModule({
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
                    module: renderer.device.createShaderModule({
                        code: basicFrag
                    }),
                    entryPoint: 'main',
                    targets: [
                        {
                            format: renderer.format
                        }
                    ]
                }
            }
        );

        this.uniformsBindGroup = renderer.device.createBindGroup({
            label: 'UniformGroup',
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: stroke.vertexBuffer
                    }
                }
            ]
        })
    }

    override draw() {
        const commandEncoder = renderer.device.createCommandEncoder()
        const view = renderer.context.getCurrentTexture().createView()
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

async function run(){

    await renderer.initWebGPU()
    const canvas = renderer.canvas;
    console.log("canvas", canvas)
    console.log("device", renderer.device)

    // add new stroke
    const stroke = new Stroke(renderer.device, vec2.fromValues(-0.5, 0.0), vec2.fromValues(0.5, 0.0))

    // add track class
    const track = new Track(stroke);
    var strokeRenderer: StrokeRenderer;
    strokeRenderer = new StrokeRenderer(stroke, track);

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
    }
    requestAnimationFrame(frame)
    
}

run()