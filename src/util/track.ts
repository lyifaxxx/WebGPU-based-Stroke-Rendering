import { mat4, vec2, vec3 } from "gl-matrix";
import { device, canvas } from '../strokeTest';
import { Stroke } from "./stroke";

// This class is used to track mouse position and create vertex data
export class Track {
    keys: { [key: string]: boolean } = {};
    strokeStart: vec2 = vec2.create();
    strokeEnd: vec2 = vec2.create();

    stroke: Stroke;

    constructor(stroke: Stroke) {
        this.stroke = stroke;

        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
    }

    public getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        console.log("rect:", rect);
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    private pixelToNDC(pixel: vec2) {
        const ndc = vec2.create();
        ndc[0] = (pixel[0] / canvas.width) * 2 - 1;
        ndc[1] = (1 - pixel[1] / canvas.height) * 2 - 1;
        console.log("ndc:", ndc);
        console.log("canvas.width:", canvas.width);
        console.log("canvas.height:", canvas.height);
        return ndc;
    }

    // For now, get the positions when mouse is clicked and released as p0 and p1 of a stroke
    private onMouseDown(evt: MouseEvent) {
        const pos = this.getMousePos(canvas, evt);
        const canvasPos = this.pixelToNDC(vec2.fromValues(pos.x, pos.y));
        this.strokeStart = vec2.fromValues(canvasPos[0], canvasPos[1]);
    }

    private onMouseUp(evt: MouseEvent) {
        const pos = this.getMousePos(canvas, evt);
        const canvasPos = this.pixelToNDC(vec2.fromValues(pos.x, pos.y));
        this.strokeEnd = vec2.fromValues(canvasPos[0], canvasPos[1]);
        // Create a new stroke object
        this.stroke.updateStroke(this.strokeStart, this.strokeEnd);
    }


    onFrame() {

    }


}