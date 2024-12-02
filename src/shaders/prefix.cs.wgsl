
struct StrokeData {
    positions: vec4<f32>,
    // color 
    strokeColor: vec4<f32>
};

@group(0) @binding(0)
var<storage, read> strokes: array<StrokeData>;

@compute
fn main(@builtin(vertex_index) VertexIndex: u32, 
@builtin(instance_index) in_instance_index: u32) -> VertexOutput {
    
        let position0: vec2<f32> = strokes[in_instance_index].positions.xy;
        let position1: vec2<f32> = strokes[in_instance_index].positions.zw;
        let radius0: f32 = 0.04;
        let radius1: f32 = 0.04; 
        let l0: f32 = 0.0;
        let l1: f32 = 0.0;
}