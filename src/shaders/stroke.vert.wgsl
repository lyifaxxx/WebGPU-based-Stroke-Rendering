struct VertexInput {
    @location(0) position0: vec2<f32>,
    @location(1) position1: vec2<f32>,
}

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) p0: vec2<f32>,
    @location(1) p1: vec2<f32>,
    @location(2) r0: f32,
    @location(3) r1: f32,
    @location(4) p: vec2<f32>,
    @location(5) valid: f32
};

@vertex
fn main(in:VertexInput,  @builtin(vertex_index) VertexIndex: u32) -> VertexOutput {

    // let position0: vec2<f32> = vec2<f32>(-0.5, 0.0);
    // let position1: vec2<f32> = vec2<f32>(0.5, 0.0);
    let position0: vec2<f32> = in.position0;
    let position1: vec2<f32> = in.position1;
    let radius0: f32 = 0.2;
    let radius1: f32 = 0.2;

    var output: VertexOutput;
    output.p0 = position0;
    output.p1 = position1;
    output.r0 = radius0;
    output.r1 = radius1;

    // 计算圆心之间的角度
    let cosTheta = (radius0 - radius1) / distance(position0, position1);

    let tangent = normalize(position1 - position0);
    let normal = vec2<f32>(-tangent.y, tangent.x);
    let position = array<vec2<f32>, 4>(
        position0, position0, position1, position1
    )[VertexIndex];
    let offsetSign = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0)
    )[VertexIndex];
        
    let radius = array<f32, 4>(
        radius0, radius0, radius1, radius1
    )[VertexIndex];

    let vertexPosition = position +
    offsetSign.x * radius * tangent +
    offsetSign.y * radius * normal;

    output.p = vertexPosition;
    output.Position = vec4<f32>(vertexPosition, 0.0, 1.0); // 不使用 MVP 矩阵
    return output;
}

// @vertex
// fn main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
//     // var pos = array<vec2<f32>, 3>(
//     //     vec2<f32>(0.0, 0.1),
//     //     vec2<f32>(-0.5, 0.0),
//     //     vec2<f32>(0.5, 0.0)
//     // );

//     // let position0: vec2<f32> = vec2<f32>(-0.5, -0.5);
//     // let position1: vec2<f32> = vec2<f32>(0.5, 0.5);
//     let position0: vec2<f32> = vec2<f32>(-0.5, 0.0);
//     let position1: vec2<f32> = vec2<f32>(0.5, 0.0);
//     let radius0: f32 = 0.5;
//     let radius1: f32 = 0.5;

//     var output: VertexOutput;
//     output.p0 = position0;
//     output.p1 = position1;
//     output.r0 = radius0;
//     output.r1 = radius1;

//     // 计算圆心之间的角度
//     let cosTheta = (radius0 - radius1) / distance(position0, position1);
//     if (abs(cosTheta) >= 1.0) { // 完全内切的情况，不绘制边缘
//         // return output;
//         output.valid = 0.0;
//     }

//     let tangent = normalize(position1 - position0);
//     let normal = vec2<f32>(-tangent.y, tangent.x);

//     let offsetSign = array<vec2<f32>, 4>(
//         vec2<f32>(-1.0, -1.0),
//         vec2<f32>(-1.0, 1.0),
//         vec2<f32>(1.0, 1.0),
//         vec2<f32>(1.0, -1.0)
//     )[VertexIndex];

//     let position = array<vec2<f32>, 4>(
//         position0, position0, position1, position1
//     )[VertexIndex];
//     let radius = array<f32, 4>(
//         radius0, radius0, radius1, radius1
//     )[VertexIndex];

//     let tanHalfTheta = sqrt((1.0 + cosTheta) / (1.0 - cosTheta));
//     let cotHalfTheta = 1.0 / tanHalfTheta;
//     let normalTanValue = array<f32, 4>(
//         tanHalfTheta, tanHalfTheta, cotHalfTheta, cotHalfTheta
//     )[VertexIndex];

//     if (normalTanValue > 10.0 || normalTanValue < 0.1) { // 过滤边缘异常情况
//         output.valid = 0.0;
//     }

//     let trapzoidVertexPosition = position +
//         offsetSign.x * radius * tangent +
//         offsetSign.y * radius * normal * normalTanValue;
    
//     output.p = trapzoidVertexPosition;
//     output.Position = vec4<f32>(trapzoidVertexPosition, 0.0, 1.0); // 不使用 MVP 矩阵

//     return output;

//     // 设置 position 输出，使 GPU 知道顶点的绘制位置
//     // output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
//     // return output;
// }