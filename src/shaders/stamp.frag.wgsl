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

    // The quadratic equation
    var a = 1.0 - pow(cosTheta, 2.0);
    var b = 2.0 * (r0 * cosTheta - pLocal.x);
    var c = pow(pLocal.x, 2.0) + pow(pLocal.y, 2.0) - pow(r0, 2.0);
    var delta = pow(b, 2.0) - 4.0 * a * c ;
    if(delta <= 0.0) {discard;}

    // Solve the quadratic equation
    let tempMathBlock = b + sign(b) * sqrt(delta);
    var x1 = -2.0 * c / tempMathBlock;
    var x2 = -tempMathBlock / (2.0*a);
    let temp = vec2(min(x1, x2), max(x1, x2));
    x1 = temp.x;
    x2 = temp.y;

    const interval = 0.1; // The interval between two stamps.
    let index0 = l0/interval; // The stamp index at vertex0.
    // float startIndex, endIndex; // The stamp index's begin and end values
    let x1Index = index0 + x1/interval; // The stamp index at x1.

    // if x1 is less than zero, start the loop from vertex0.
    var startIndex: f32;
    var endIndex: f32;
    if (x1 < 0.0){
        startIndex = ceil(index0);
    }else{
        startIndex = ceil(x1Index);
    }
    let index1 = l1/interval;
    let x2Index = x2/interval + index0;

    // if x2 is larger than L, end the loop at vertex1.
    if (x2 > len){
        endIndex = index1;
    }else{
        endIndex = x2Index;
    }
    if(startIndex > endIndex) {discard;}

    
    // The main loop to sample and blend color from the footprint, from `startIndex` to `endIndex`
    const MAX_i = 1;
    var currIndex = startIndex;
    var currColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    let maxIterations = i32(endIndex - startIndex);
    let validCount = min(MAX_i, maxIterations);
    for (var i = 0; i < MAX_i; i = i + 1) {
        let currStampLocalX = interval * (currIndex - index0);
        let currStampRadius = r0 - cosTheta * currStampLocalX;

        let pToCurrStamp = pLocal - vec2<f32>(currStampLocalX, 0.0);
        let textureCoordinate = (pToCurrStamp/currStampRadius + 1.0)/2.0;
        let sampledColor = textureSample(strokeTexture, strokeSampler, textureCoordinate);
        var colorA =  sampledColor.a + currColor.a * (1.0 - sampledColor.a);
        var colorRGB = (sampledColor.rgb * sampledColor.a + currColor.rgb * currColor.a * (1.0 - sampledColor.a)) / colorA;

        currColor = vec4<f32>(colorRGB, colorA);
        currIndex += 1; // Increment index
        // if (currIndex > endIndex) { break;}
    }

    return currColor;

    // let u = clamp((pLocal.x / len), 0.0, 1.0); // [0, 1]
    // let v = clamp((pLocal.y / r0 + 1.0) * 0.5, 0.0, 1.0); // [0, 1]
    // let uv = vec2<f32>(u, v);

    // let rotatedUV = vec2<f32>(1.0 - uv.y, uv.x);
    // var color = textureSample(strokeTexture, strokeSampler, uv);
    // var outputColor = vec3(1.0, 1.0, 1.0) - color.rgb;
    // outputColor *= strokeColor.rgb;
    // if(strokeColor.r == 1.0 && strokeColor.g == 1.0 && strokeColor.b == 1.0){
    //     return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    // }
    // return vec4<f32>(outputColor.rgb, color.a);
    // return vec4<f32>(1.0,0.0, 0.0, 1.0);
}