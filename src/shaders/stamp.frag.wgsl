@group(0) @binding(1) var strokeSampler: sampler;
@group(0) @binding(2) var strokeTexture: texture_2d<f32>;

@fragment
fn main(
    @location(0) p0: vec2<f32>,
    @location(1) p1: vec2<f32>,
    @location(2) r0: f32,
    @location(3) r1: f32,
    @location(4) p: vec2<f32>,
    @location(5) valid: f32,
    @location(6) l0: f32,
    @location(7) l1: f32,
    @location(8) strokeColor: vec4<f32>

) -> @location(0) vec4<f32> {
    let tangent = normalize(p1 - p0);
    let normal = vec2<f32>(-tangent.y, tangent.x);
    let len = distance(p1, p0);
    let pLocal = vec2<f32>(dot(p - p0, tangent), dot(p - p0, normal));
    let d0 = distance(p, p0);
    let d1 = distance(p, p1);
    let d0cos = pLocal.x / d0;
    let d1cos = (pLocal.x - len) / d1;

//    let cosTheta = (r0 - r1) / len; //radius no change for now
//    if (d0cos < cosTheta && d0 > r0) { discard; }
//    if (d1cos > cosTheta && d1 > r1) { discard; }
//    if (d0cos < cosTheta && d0 > r0) { return vec4<f32>(1.0, 0.0, 0.0, 1.0); }
//    if (d1cos > cosTheta && d1 > r1) { return vec4<f32>(1.0, 0.0, 0.0, 1.0); }

    // Remove corners
    if(pLocal.x < 0.0 && d0 > r0){ discard; } // left corners
    if(pLocal.x > len && d1 > r0){ discard; }// right corners

    // var A = 1.0;
    // if (d0 < r0 && d1 < r1) { discard; }
    // if (d0 < r0 || d1 < r1) { A = 1.0 - sqrt(1.0 - A); }

    // return vec4<f32>(0.0, 0.0, 0.0, 1.0); // 返回黑色并应用透明度

    let u = clamp((pLocal.x / len), 0.0, 1.0); // [0, 1]
    let v = clamp((pLocal.y / r0 + 1.0) * 0.5, 0.0, 1.0); // [0, 1]
    let uv = vec2<f32>(u, v);
    // return vec4<f32>(uv.x, uv.y, 0.0, 1.0);
    // return vec4<f32>(uv.x, 0.0, 0.0, 1.0); // u only
    // return vec4<f32>(0.0, uv.y, 0.0, 1.0); // v only


    let rotatedUV = vec2<f32>(1.0 - uv.y, uv.x);
    var color = textureSample(strokeTexture, strokeSampler, uv);
    var outputColor = vec3(1.0, 1.0, 1.0) - color.rgb;
    outputColor *= strokeColor.rgb;
    if(strokeColor.r == 1.0 && strokeColor.g == 1.0 && strokeColor.b == 1.0){
        return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    }
    return vec4<f32>(outputColor.rgb, color.a);
}
