import { mat4, vec2, vec3 } from "gl-matrix";
import { device, canvas } from '../renderer';
import { Stroke } from "./stroke";
import { StrokeRenderer } from '../strokeTest';
import { vec4 } from "gl-matrix";

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

    trackStep: number = 0.01;

    // Store the path of the stroke to get polyline
    polyline: Stroke[] = [];
    allStrokes: Stroke[] = [];

    strokeRenderer: StrokeRenderer;

    constructor(stroke: Stroke) {
        this.stroke = stroke;

        this.strokeRenderer = new StrokeRenderer(this.stroke, this);

        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
        canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
    }

    public getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    private pixelToNDC(pixel: vec2) {
        const ndc = vec2.create();
        ndc[0] = (pixel[0] / canvas.width) * 2 - 1;
        ndc[1] = (1 - pixel[1] / canvas.height) * 2 - 1;
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
            this.stroke.numInstances++;
            this.isPanning = false;
            this.isDown = true;
            console.log("is down true: ", this.isDown);
            const pos = this.getMousePos(canvas, evt);
            const canvasPos = this.pixelToNDC(vec2.fromValues(pos.x, pos.y));
            this.strokeStart = vec2.fromValues(canvasPos[0], canvasPos[1]);
            
            // Initialize a new stroke for the polyline
            const newStroke = new Stroke(device, this.strokeStart, this.strokeStart);
            newStroke.displayColor = this.stroke.strokeColor;
            newStroke.radius = this.stroke.radius;
            newStroke.strokeType = this.stroke.strokeType;
            this.polyline.push(newStroke);
            this.allStrokes.push(newStroke);

        }
    }

    private onMouseMove(evt: MouseEvent) {
        if (!this.isDown) return;
        //console.log("!!!On Mouse move is down true: ", this.isDown);
        const pos = this.getMousePos(canvas, evt);
        const canvasPos = this.pixelToNDC(vec2.fromValues(pos.x, pos.y));
        this.strokeEnd = vec2.fromValues(canvasPos[0], canvasPos[1]);
        
        const currentStroke = this.polyline[this.polyline.length - 1];
        if(vec2.distance(this.strokeEnd,currentStroke.endPos) > this.trackStep){

            this.stroke.updateStroke(currentStroke.endPos, this.strokeEnd);
            this.strokeStart = vec2.clone(this.strokeEnd);
            this.stroke.numInstances++;

            // Initialize a new stroke for the polyline
            const newStroke = new Stroke(device,currentStroke.endPos, this.strokeStart);
            newStroke.displayColor = this.stroke.strokeColor;
            newStroke.radius = this.stroke.radius;
            newStroke.strokeType = this.stroke.strokeType;
            this.polyline.push(newStroke);
            this.allStrokes.push(newStroke);
       }
        canvas.style.cursor = 'default';  //grabbing, crosshair, move, pointer, text, wait
    }

    private onMouseUp(evt: MouseEvent) {
        this.isPanning = false;
        this.isDown = false;
        const pos = this.getMousePos(canvas, evt);
        const canvasPos = this.pixelToNDC(vec2.fromValues(pos.x, pos.y));
        this.strokeEnd = vec2.fromValues(canvasPos[0], canvasPos[1]);

        const currentStroke = this.polyline[this.polyline.length - 1];
        if(vec2.distance(this.strokeEnd,currentStroke.endPos) > this.trackStep){

            this.stroke.updateStroke(currentStroke.endPos, this.strokeEnd);
            this.strokeStart = vec2.clone(this.strokeEnd);
            this.stroke.numInstances++;

            // Initialize a new stroke for the polyline
            const newStroke = new Stroke(device,currentStroke.endPos, this.strokeStart);
            newStroke.displayColor = this.stroke.strokeColor;
            newStroke.radius = this.stroke.radius;
            newStroke.strokeType = this.stroke.strokeType;
            this.polyline.push(newStroke);
            this.allStrokes.push(newStroke);
        }
        canvas.style.cursor = 'default';
        
        // Do polyline Computation
        this.strokeRenderer.computeCumulativeLengths(this.polyline);
    }

    onFrame() {

    }


}