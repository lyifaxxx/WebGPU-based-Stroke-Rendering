import { mat4, vec2, vec3 } from "gl-matrix";
import { device, canvas } from '../strokeTest';
import { Stroke } from "./stroke";

// This class is used to track mouse position and create vertex data
export class Track {
    keys: { [key: string]: boolean } = {};
    strokeStart: vec2 = vec2.create();
    strokeEnd: vec2 = vec2.create();
    
    scaleFactor: number = 1.0;
    offsetX: number = 0;
    offsetY: number = 0;
    isPanning: boolean = false;
    isDown: boolean = false;
    startX: number = 0;
    startY: number = 0;

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
        canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        // canvas.addEventListener('wheel', (event) => this.onWheel(event));
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
        // The middle mouse button is pressed
        if(evt.button === 1) {
            this.isPanning = true;
            this.startX = evt.clientX - this.offsetX;
            this.startY = evt.clientY - this.offsetY;
            canvas.style.cursor = 'grabbing';
        }else{
            this.isPanning = false;
            this.isDown = true;
            console.log("is down true: ", this.isDown);
            const pos = this.getMousePos(canvas, evt);
            const canvasPos = this.pixelToNDC(vec2.fromValues(pos.x, pos.y));
            this.strokeStart = vec2.fromValues(canvasPos[0], canvasPos[1]);
        }
    }

    private onMouseUp(evt: MouseEvent) {
        this.isPanning = false;
        this.isDown = false;
        const pos = this.getMousePos(canvas, evt);
        const canvasPos = this.pixelToNDC(vec2.fromValues(pos.x, pos.y));
        this.strokeEnd = vec2.fromValues(canvasPos[0], canvasPos[1]);
        // Create a new stroke object
        //this.stroke.updateStroke(this.strokeStart, this.strokeEnd);
        this.stroke.updateStroke(this.strokeStart, this.strokeEnd, this.scaleFactor, this.offsetX, this.offsetY);
        canvas.style.cursor = 'default';  //grabbing, crosshair, move, pointer, text, wait
    }

    private onMouseMove(evt: MouseEvent) {
        if (!this.isDown) return;
        console.log("!!!On Mouse move is down true: ", this.isDown);
        const pos = this.getMousePos(canvas, evt);
        const canvasPos = this.pixelToNDC(vec2.fromValues(pos.x, pos.y));
        this.strokeEnd = vec2.fromValues(canvasPos[0], canvasPos[1]);
        // Create a new stroke object
        //this.stroke.updateStroke(this.strokeStart, this.strokeEnd);
        this.stroke.updateStroke(this.strokeStart, this.strokeEnd, this.scaleFactor, this.offsetX, this.offsetY);
        canvas.style.cursor = 'default';  //grabbing, crosshair, move, pointer, text, wait
        // console.log("offsetX:", this.offsetX);
    }

    // private onWheel(evt: WheelEvent) {
    //     const zoomIntensity = 0.001;
    //     // console.log("evt.deltaY:", evt.deltaY);
    //     // const newScaleFactor = this.scaleFactor + evt.deltaY * -zoomIntensity;
    //     const newScaleFactor = Math.min(Math.max(this.scaleFactor + evt.deltaY * -zoomIntensity, 0.1), 10);
    //     const mouseX = (evt.offsetX - this.offsetX) / this.scaleFactor;
    //     const mouseY = (evt.offsetY - this.offsetY) / this.scaleFactor;
    //     this.scaleFactor = Math.max(0.1, newScaleFactor);
    //     // this.offsetX = evt.offsetX - mouseX * this.scaleFactor;
    //     // this.offsetY = evt.offsetY - mouseY * this.scaleFactor;
    //     console.log("scaleFactor:", this.scaleFactor);
    //     this.stroke.updateStroke(this.strokeStart, this.strokeEnd, this.scaleFactor, this.offsetX, this.offsetY);
    // }

    onFrame() {

    }


}