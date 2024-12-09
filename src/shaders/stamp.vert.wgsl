
struct StrokeData {
    positions: vec4<f32>,
    strokeColor: vec4<f32>
    //lengths: vec2<f32>,   // l0 (start length), l1 (end length)

};

@group(0) @binding(0)
var<storage, read> strokes: array<StrokeData>;


struct VertexOutput {
    // Output values to the fragment shader, `p` will be the current world position of a pixel. 
    @builtin(position) Position: vec4<f32>,
    @location(0) p0: vec2<f32>,
    @location(1) p1: vec2<f32>,
    @location(2) r0: f32,
    @location(3) r1: f32,
    @location(4) p: vec2<f32>,
    @location(5) valid: f32,
    // pass the length values to fragment shader
    @location(6) l0: f32,
    @location(7) l1: f32,
    @location(8) strokeColor: vec4<f32>
};

@vertex
fn main(@builtin(vertex_index) VertexIndex: u32, 
@builtin(instance_index) in_instance_index: u32) -> VertexOutput {

    let position0: vec2<f32> = strokes[in_instance_index].positions.xy;
    let position1: vec2<f32> = strokes[in_instance_index].positions.zw;
    let radius0: f32 = 0.1;
    let radius1: f32 = 0.1; 
    let l0: f32 = 0.0;
    let l1: f32 = 0.0;

    var output: VertexOutput;
    output.p0 = position0;
    output.p1 = position1;
    output.r0 = radius0;
    output.r1 = radius1;
    output.l0 = l0;
    output.l1 = l1;
    output.strokeColor = strokes[in_instance_index].strokeColor;

    let cosTheta = (radius0 - radius1) / distance(position0, position1);
    if (abs(cosTheta) >= 1.0) { 
        output.valid = 0.0;
    }
    
    let tangent = normalize(position1 - position0);
    let normal = vec2<f32>(-tangent.y, tangent.x);
    let position = array<vec2<f32>, 4>(
        position0, position0, position1, position1
    )[VertexIndex];

    //Each instance is a rectangle, whose vertices' positions are determined here.
    let offsetSign = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
    )[VertexIndex];
        
    let radius = array<f32, 4>(
        radius0, radius0, radius1, radius1
    )[VertexIndex];

    let tanHalfTheta = sqrt((1.0 + cosTheta) / (1.0 - cosTheta));
    let cotHalfTheta = 1.0 / tanHalfTheta;
    let normalTanValue = array<f32, 4>(
        tanHalfTheta, tanHalfTheta, cotHalfTheta, cotHalfTheta
    )[VertexIndex];

    if (normalTanValue > 10.0 || normalTanValue < 0.1) { 
        output.valid = 0.0;
    }

    let trapzoidVertexPosition = position +
        offsetSign.x * radius * tangent +
        offsetSign.y * radius * normal;
    
    output.p = trapzoidVertexPosition;
    output.Position = vec4<f32>(trapzoidVertexPosition, 0.0, 1.0); 

    

    return output;
}