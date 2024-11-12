struct VertexInput {
    @location(0) position: vec2<f32>,
}

@vertex
fn main(input: VertexInput) -> @builtin(position) vec4<f32> {
    return vec4<f32>(input.position, 0.0, 1.0); // Convert vec2 to vec4
}