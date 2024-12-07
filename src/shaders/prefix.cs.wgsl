
struct StrokeData {
    positions: vec4<f32>,
    // color 
    strokeColor: vec4<f32>
};

@group(0) @binding(0)
var<storage, read> strokes: array<StrokeData>;

@compute
fn main(){}