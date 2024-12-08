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
    @location(8) strokeColor: vec4<f32>,
    @location(9) strokeType: f32

) -> @location(0) vec4<f32> {
    let tangent = normalize(p1 - p0);
    let normal = vec2<f32>(-tangent.y, tangent.x);
    let len = distance(p1, p0);
    let pLocal = vec2<f32>(dot(p - p0, tangent), dot(p - p0, normal));
    let d0 = distance(p, p0);
    let d1 = distance(p, p1);
    let d0cos = pLocal.x / d0;
    let d1cos = (pLocal.x - len) / d1;

   let cosTheta = (r0 - r1) / len; //radius no change for now
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
    let u = clamp((pLocal.x / len), 0.0, 1.0); // [0, 1]
    let v = clamp((pLocal.y / r0 + 1.0) * 0.5, 0.0, 1.0); // [0, 1]
    let uv = vec2<f32>(u, v);
    var color = textureSample(strokeTexture, strokeSampler, uv);
    var resultColor: vec4<f32>;
    let castType = i32(strokeType);
    
    switch (castType) {
        case 0: { // Vanilla Stroke
            return strokeColor;
        }
        case 1: { // Stamp Stroke
            var outputColor = vec3(1.0, 1.0, 1.0) - color.rgb;
            outputColor *= strokeColor.rgb;
            return vec4<f32>(outputColor.rgb, color.a);
        }
        case 2: { // Airbrush Stroke
            let a = 1.0 - pow(cosTheta, 2.0);
            let b = 2.0 * (r0 * cosTheta - pLocal.x);
            let c = pow(pLocal.x, 2.0) + pow(r0, 2.0) - pow(r0 * cosTheta, 2.0);
            let delta = pow(b, 2.0) - 4.0 * a * c;
            // if (delta < 0.0) { discard; }
            let tempMathBlock = b + sign(b) * sqrt(delta);
            var x1 = -2.0 * c / tempMathBlock;
            var x2 = -tempMathBlock / (2.0 * a);
            let temp = vec2<f32>(min(x1, x2), max(x1, x2));
            x1 = temp.x;
            x2 = temp.y;

            let rangeLength = min(len, x2) - max(x1, 0.0);// The L_r value.
            let alphaDensity = 2.0;
            let alpha = 1.0 - exp(-rangeLength*alphaDensity);
            // Remove corners
            if(pLocal.x < 0.0 && d0 > r0){ discard; } // left corners
            if(pLocal.x > len && d1 > r0){ discard; }// right corners
            return vec4<f32>(strokeColor.rgb, alpha);
        }
        case 3: { // eraser
            return vec4<f32>(1.0, 1.0, 1.0, 1.0);

        }
        default: {
            return strokeColor;
        }
    }

}