@group(1) @binding(0) var Sampler: sampler;
@group(1) @binding(1) var Texture: texture_2d<f32>;

@fragment
fn main(@location(0) fragUV: vec2<f32>,
        @location(1) fragPosition: vec4<f32>) -> @location(0) vec4<f32> {

    // // Get the texture color and multiply it with the position color
    // let textureColor = textureSample(Texture, Sampler, fragUV) * fragPosition;

    // // Add a border to the image
    // if (fragUV.x < 0.01 || fragUV.x > 0.99 || fragUV.y < 0.01 || fragUV.y > 0.99) {
    //     return vec4<f32>(0.0, 0.0, 0.0, 1.0); // Black border
    // }

    // // Return the final color
    // return textureColor;

  return textureSample(Texture, Sampler, fragUV) * fragPosition;
  // return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Red color
}
