struct StrokeData {
    positions: vec4<f32>,     // x0, y0, x1, y1
    strokeColor: vec4<f32>,   // RGBA color
    strokeWidth: f32,         // Width of the stroke
    strokeType: f32,          // Type of stroke
};

@group(0) @binding(0) var<storage, read> strokes: array<StrokeData>;
@group(0) @binding(1) var<storage, read_write> stampCounts: array<u32>; // Intermediate stroke stamp counts
@group(0) @binding(2) var<storage, read_write> cumulativeLengths: array<f32>;

const EquiDistance: i32 = 0;
const RatioDistance: i32 = 1;

@workgroup_size(32, 32, 1) // Adjust workgroup size (x, y, z)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id: u32 = global_id.x; // For 1D workgroup, using x component for indexing
    var p0: vec2<f32> = position[id];
    var p1: vec2<f32>;

    // Use if statement instead of ternary operator
    if (id == 0) {
        p1 = p0;  // If it's the first element, set p1 to p0
    } else {
        p1 = position[id - 1]; // Otherwise, set p1 to the previous element
    }
    
    // length of each segment
    var L: f32 = distance(p0, p1);
    
    var segmentLength: f32 = 0.0;
    
    if (stampMode == EquiDistance) {
        segmentLength = L / (uniRadius * 2.0);
    } else if (stampMode == RatioDistance) {
        var t2: f32 = 2.0 * (uniRadius + thicknessOffset[id]);
        var t1: f32;
        if (id == 0) { t1 = t2;} else { t1 = 2.0 * (uniRadius + thicknessOffset[id - 1]); }; 
        
        var stretchedL: f32 = 0.0;
        const tolerance: f32 = 1e-5;
        
        // Handling small values for t1 and t2 to prevent division by zero
        if (t1 <= 0.0 || t1 / t2 < tolerance) {
            t1 = tolerance * t2;
        } else if (t2 <= 0.0 || t2 / t1 < tolerance) {
            t2 = tolerance * t1;
        }
        
        if (t1 <= 0.0 && t2 <= 0.0) {
            stretchedL = 0.0;
        } else if (t1 == t2) {
            stretchedL = L / t1;
        } else {
            stretchedL = log(t1 / t2) / (t1 - t2) * L;
        }
        
        segmentLength = stretchedL;
    }
    
    // Shared memory for prefix sum
    shared var<workgroup> segmentLengths: array<f32> = array<f32>(0.0, 0.0, 0.0); // 示例初始化


    segmentLengths[id] = segmentLength;

    // Ensure all threads in the workgroup have written their values to shared memory
    workgroupBarrier();

    // Prefix sum (scan) on segment lengths
    let n_steps: u32 = u32(log2(f32(workgroup_size_x))) + 1;

    for (var s: u32 = 0u; s < n_steps; s = s + 1u) {
        var mask: u32 = (1u << s) - 1u;
        var rd_id: u32 = ((id >> s) << (s + 1)) + mask;

        var wr_id: u32 = rd_id + 1u + (id & mask);
        
        // Perform the prefix sum operation
        segmentLengths[wr_id] += segmentLengths[rd_id];
        
        // Ensure all threads within the workgroup synchronize after each iteration
        workgroupBarrier();
    }
    
    // Store the final result in the output buffer
    lengthOutput[id] = segmentLengths[id];
}
