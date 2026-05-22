import { Body, Vector2D } from '../types';
import { SOFTENING, ASTEROID_DENSITY_GRID_SIZE } from '../constants';

// Shader code for Compute (Physics) - VELOCITY VERLET INTEGRATION
// This matches physicsEngineNew.ts exactly:
// 1. Half-kick: v_half = v + 0.5 * a * dt
// 2. Drift: x_new = x + v_half * dt
// 3. Recalculate acceleration at new position
// 4. Second half-kick: v_new = v_half + 0.5 * a_new * dt
//
// We use TWO separate shaders to achieve this:
// - COMPUTE_SHADER_HALFKICK_DRIFT: Steps 1 & 2
// - COMPUTE_SHADER_SECOND_HALFKICK: Steps 3 & 4

// Pass 1: Half-kick velocity, then drift position
const COMPUTE_SHADER_HALFKICK_DRIFT = `
struct Asteroid {
    pos: vec2f,
    vel: vec2f,
};

struct MassiveBody {
    pos: vec2f,
    mass: f32,
    radius: f32,
};

struct SimParams {
    dt: f32,
    g_const: f32,
    body_count: u32,
    softening: f32,
    min_radius: f32,
    max_radius: f32,
    center_x: f32,
    center_y: f32,
    sun_mass: f32,
    pad0: f32,
    pad1: f32,
    pad2: f32,
};

@group(0) @binding(0) var<storage, read_write> asteroids: array<Asteroid>;
@group(0) @binding(1) var<storage, read> bodies: array<MassiveBody>;
@group(0) @binding(2) var<uniform> params: SimParams;

// Calculate acceleration from all massive bodies (matches CPU calculateForcesNew)
fn calculateAcceleration(pos: vec2f) -> vec2f {
    var accel = vec2f(0.0, 0.0);
    let eps2: f32 = params.softening * params.softening;
    
    for (var i: u32 = 0; i < params.body_count; i++) {
        let body = bodies[i];
        let diff = body.pos - pos;
        
        // r² with softening (same as CPU: r2 = dx*dx + dy*dy + eps2)
        let r2 = dot(diff, diff) + eps2;
        
        // invR = 1/sqrt(r2), invR3 = invR^3
        let invR = 1.0 / sqrt(r2);
        let invR3 = invR * invR * invR;
        
        // a = G * M * invR³ * direction (test particle has m=1)
        let s = params.g_const * body.mass * invR3;
        accel += diff * s;
    }
    
    return accel;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let index = global_id.x;
    if (index >= arrayLength(&asteroids)) {
        return;
    }

    var asteroid = asteroids[index];

    // Calculate acceleration at current position
    let accel = calculateAcceleration(asteroid.pos);
    
    // VELOCITY VERLET - Step 1: Half-kick velocity
    // v_half = v + 0.5 * a * dt
    asteroid.vel = asteroid.vel + 0.5 * accel * params.dt;
    
    // VELOCITY VERLET - Step 2: Drift position using half-kicked velocity
    // x_new = x + v_half * dt
    asteroid.pos = asteroid.pos + asteroid.vel * params.dt;

    

    asteroids[index] = asteroid;
}
`;

// Pass 2: Recalculate forces at new position, second half-kick
const COMPUTE_SHADER_SECOND_HALFKICK = `
struct Asteroid {
    pos: vec2f,
    vel: vec2f,
};

struct MassiveBody {
    pos: vec2f,
    mass: f32,
    radius: f32,
};

struct SimParams {
    dt: f32,
    g_const: f32,
    body_count: u32,
    softening: f32,
    min_radius: f32,
    max_radius: f32,
    center_x: f32,
    center_y: f32,
    sun_mass: f32,
    pad0: f32,
    pad1: f32,
    pad2: f32,
};

@group(0) @binding(0) var<storage, read_write> asteroids: array<Asteroid>;
@group(0) @binding(1) var<storage, read> bodies: array<MassiveBody>;
@group(0) @binding(2) var<uniform> params: SimParams;

// Calculate acceleration from all massive bodies (matches CPU calculateForcesNew)
fn calculateAcceleration(pos: vec2f) -> vec2f {
    var accel = vec2f(0.0, 0.0);
    let eps2: f32 = params.softening * params.softening;
    
    for (var i: u32 = 0; i < params.body_count; i++) {
        let body = bodies[i];
        let diff = body.pos - pos;
        
        // r² with softening (same as CPU: r2 = dx*dx + dy*dy + eps2)
        let r2 = dot(diff, diff) + eps2;
        
        // invR = 1/sqrt(r2), invR3 = invR^3
        let invR = 1.0 / sqrt(r2);
        let invR3 = invR * invR * invR;
        
        // a = G * M * invR³ * direction (test particle has m=1)
        let s = params.g_const * body.mass * invR3;
        accel += diff * s;
    }
    
    return accel;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let index = global_id.x;
    if (index >= arrayLength(&asteroids)) {
        return;
    }

    var asteroid = asteroids[index];
    
    // Calculate acceleration at NEW position (after drift)
    let accel = calculateAcceleration(asteroid.pos);
    
    // VELOCITY VERLET - Step 4: Second half-kick
    // v_new = v_half + 0.5 * a_new * dt
    // Note: asteroid.vel currently holds v_half from pass 1
    asteroid.vel = asteroid.vel + 0.5 * accel * params.dt;

    asteroids[index] = asteroid;
}
`;

// Shader code for Rendering
const RENDER_SHADER = `
struct ViewParams {
    scale: f32,
    width: f32,
    height: f32,
    offset_x: f32,
    offset_y: f32,
    pad0: f32,
    pad1: f32,
    pad2: f32,
};

struct Asteroid {
    pos: vec2f,
    vel: vec2f,
};

@group(0) @binding(0) var<uniform> view: ViewParams;
@group(0) @binding(1) var<storage, read> asteroids: array<Asteroid>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@vertex
fn vs_main(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
    let asteroid = asteroids[instanceIndex];

    // Create a small quad/point for each asteroid
    let size = 0.8; // Reduced Size
    
    // Vertex positions for a quad [-1, 1]
    var pos = vec2f(0.0, 0.0);
    switch(vertexIndex) {
        case 0u: { pos = vec2f(-1.0, -1.0); }
        case 1u: { pos = vec2f( 1.0, -1.0); }
        case 2u: { pos = vec2f(-1.0,  1.0); }
        case 3u: { pos = vec2f(-1.0,  1.0); }
        case 4u: { pos = vec2f( 1.0, -1.0); }
        case 5u: { pos = vec2f( 1.0,  1.0); }
        default: { pos = vec2f(0.0, 0.0); }
    }

    let world_pos = asteroid.pos;
    let final_screen_x = (view.width * 0.5) + view.offset_x + (world_pos.x * view.scale);
    let final_screen_y = (view.height * 0.5) + view.offset_y + (world_pos.y * view.scale);

    // Add particle size offset
    let corner_x = final_screen_x + (pos.x * size);
    let corner_y = final_screen_y + (pos.y * size);

    // Convert to Clip Space [-1, 1]
    let clip_x = (corner_x / view.width) * 2.0 - 1.0;
    let clip_y = (corner_y / view.height) * -2.0 + 1.0;

    var output: VertexOutput;
    output.position = vec4f(clip_x, clip_y, 0.0, 1.0);
    
    // speed based color
    let speed = length(asteroid.vel);
    let brightness = min(1.0, 0.3 + speed * 10.0);
    output.color = vec4f(0.8, 0.9, 1.0, brightness); 

    return output;
}

@fragment
fn fs_main(@location(0) color: vec4f) -> @location(0) vec4f {
    return color;
}
`;

// Shader to compute density grid by binning asteroids into cells
const DENSITY_COMPUTE_SHADER = `
struct Asteroid {
    pos: vec2f,
    vel: vec2f,
};

struct DensityParams {
    grid_size: u32,
    world_min_x: f32,
    world_min_y: f32,
    world_max_x: f32,
    world_max_y: f32,
    pad0: f32,
    pad1: f32,
    pad2: f32,
};

@group(0) @binding(0) var<storage, read> asteroids: array<Asteroid>;
@group(0) @binding(1) var<storage, read_write> density_grid: array<atomic<u32>>;
@group(0) @binding(2) var<uniform> params: DensityParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let index = global_id.x;
    if (index >= arrayLength(&asteroids)) {
        return;
    }

    let asteroid = asteroids[index];
    let pos = asteroid.pos;
    
    // Calculate world bounds
    let world_width = params.world_max_x - params.world_min_x;
    let world_height = params.world_max_y - params.world_min_y;
    
    // Normalize position to [0, 1] within world bounds
    let norm_x = (pos.x - params.world_min_x) / world_width;
    let norm_y = (pos.y - params.world_min_y) / world_height;
    
    // Skip if outside bounds
    if (norm_x < 0.0 || norm_x >= 1.0 || norm_y < 0.0 || norm_y >= 1.0) {
        return;
    }
    
    // Calculate grid cell
    let cell_x = u32(norm_x * f32(params.grid_size));
    let cell_y = u32(norm_y * f32(params.grid_size));
    let cell_index = cell_y * params.grid_size + cell_x;
    
    // Atomic increment
    atomicAdd(&density_grid[cell_index], 1u);
}
`;

// Shader to clear the density grid
const DENSITY_CLEAR_SHADER = `
struct DensityParams {
    grid_size: u32,
    world_min_x: f32,
    world_min_y: f32,
    world_max_x: f32,
    world_max_y: f32,
    pad0: f32,
    pad1: f32,
    pad2: f32,
};

@group(0) @binding(0) var<storage, read_write> density_grid: array<atomic<u32>>;
@group(0) @binding(1) var<uniform> params: DensityParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let index = global_id.x;
    let total_cells = params.grid_size * params.grid_size;
    if (index >= total_cells) {
        return;
    }
    atomicStore(&density_grid[index], 0u);
}
`;

// Shader to render the density heatmap as a fullscreen quad
const DENSITY_RENDER_SHADER = `
struct DensityRenderParams {
    grid_size: u32,
    max_density: f32,
    screen_width: f32,
    screen_height: f32,
    world_min_x: f32,
    world_min_y: f32,
    world_max_x: f32,
    world_max_y: f32,
    view_scale: f32,
    view_offset_x: f32,
    view_offset_y: f32,
    pad0: f32,
};

@group(0) @binding(0) var<storage, read> density_grid: array<u32>;
@group(0) @binding(1) var<uniform> params: DensityRenderParams;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    // Fullscreen triangle (oversized, clipped)
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0)
    );
    
    var uvs = array<vec2f, 3>(
        vec2f(0.0, 1.0),
        vec2f(2.0, 1.0),
        vec2f(0.0, -1.0)
    );
    
    var output: VertexOutput;
    output.position = vec4f(positions[vertex_index], 0.0, 1.0);
    output.uv = uvs[vertex_index];
    return output;
}

// Heatmap color gradient: blue -> cyan -> green -> yellow -> red
fn heatmap_color(t: f32) -> vec3f {
    // Clamp t to [0, 1]
    let tc = clamp(t, 0.0, 1.0);
    
    // 5-stop gradient
    if (tc < 0.25) {
        // Blue to Cyan
        let local_t = tc / 0.25;
        return mix(vec3f(0.0, 0.0, 0.5), vec3f(0.0, 0.5, 1.0), local_t);
    } else if (tc < 0.5) {
        // Cyan to Green
        let local_t = (tc - 0.25) / 0.25;
        return mix(vec3f(0.0, 0.5, 1.0), vec3f(0.0, 1.0, 0.0), local_t);
    } else if (tc < 0.75) {
        // Green to Yellow
        let local_t = (tc - 0.5) / 0.25;
        return mix(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0), local_t);
    } else {
        // Yellow to Red
        let local_t = (tc - 0.75) / 0.25;
        return mix(vec3f(1.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), local_t);
    }
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    // Convert UV to screen coordinates
    let screen_x = uv.x * params.screen_width;
    let screen_y = uv.y * params.screen_height;
    
    // Convert screen to world coordinates (reverse of render shader transform)
    let world_x = (screen_x - params.screen_width * 0.5 - params.view_offset_x) / params.view_scale;
    let world_y = (screen_y - params.screen_height * 0.5 - params.view_offset_y) / params.view_scale;
    
    // Normalize to grid coordinates
    let world_width = params.world_max_x - params.world_min_x;
    let world_height = params.world_max_y - params.world_min_y;
    let norm_x = (world_x - params.world_min_x) / world_width;
    let norm_y = (world_y - params.world_min_y) / world_height;
    
    // Check bounds
    if (norm_x < 0.0 || norm_x >= 1.0 || norm_y < 0.0 || norm_y >= 1.0) {
        return vec4f(0.0, 0.0, 0.0, 0.0);
    }
    
    // Bilinear sampling for smooth rendering
    let fx = norm_x * f32(params.grid_size);
    let fy = norm_y * f32(params.grid_size);
    let ix = u32(fx);
    let iy = u32(fy);
    let frac_x = fx - f32(ix);
    let frac_y = fy - f32(iy);
    
    // Sample 4 neighboring cells
    let ix1 = min(ix + 1u, params.grid_size - 1u);
    let iy1 = min(iy + 1u, params.grid_size - 1u);
    
    let d00 = f32(density_grid[iy * params.grid_size + ix]);
    let d10 = f32(density_grid[iy * params.grid_size + ix1]);
    let d01 = f32(density_grid[iy1 * params.grid_size + ix]);
    let d11 = f32(density_grid[iy1 * params.grid_size + ix1]);
    
    // Bilinear interpolation
    let d0 = mix(d00, d10, frac_x);
    let d1 = mix(d01, d11, frac_x);
    let density = mix(d0, d1, frac_y);
    
    // Normalize and apply gamma for better visual distribution
    let normalized = pow(density / params.max_density, 0.6);
    
    // Get heatmap color
    let color = heatmap_color(normalized);
    
    // Alpha based on density (transparent for empty areas)
    let alpha = clamp(normalized * 0.85, 0.0, 0.85);
    
    // Discard nearly empty pixels
    if (alpha < 0.02) {
        return vec4f(0.0, 0.0, 0.0, 0.0);
    }
    
    return vec4f(color, alpha);
}
`;

export class AsteroidEngine {
    private adapter: GPUAdapter | null = null;
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private presentationFormat: GPUTextureFormat | null = null;

    private asteroidBuffer: GPUBuffer | null = null;
    private bodiesBuffer: GPUBuffer | null = null;
    private simParamsBuffer: GPUBuffer | null = null;
    private viewParamsBuffer: GPUBuffer | null = null;

    // Velocity Verlet requires two compute passes
    private computePipelineHalfKickDrift: GPUComputePipeline | null = null;
    private computePipelineSecondHalfKick: GPUComputePipeline | null = null;
    private renderPipeline: GPURenderPipeline | null = null;

    private bindGroup: GPUBindGroup | null = null; // Compute bind group (shared by both passes)
    private renderBindGroup: GPUBindGroup | null = null; // Render bind group

    // Density heatmap resources
    private densityGridBuffer: GPUBuffer | null = null;
    private densityParamsBuffer: GPUBuffer | null = null;
    private densityRenderParamsBuffer: GPUBuffer | null = null;
    private densityComputePipeline: GPUComputePipeline | null = null;
    private densityClearPipeline: GPUComputePipeline | null = null;
    private densityRenderPipeline: GPURenderPipeline | null = null;
    private densityComputeBindGroup: GPUBindGroup | null = null;
    private densityClearBindGroup: GPUBindGroup | null = null;
    private densityRenderBindGroup: GPUBindGroup | null = null;
    private densityEnabled = false;
    private densityGridSize = ASTEROID_DENSITY_GRID_SIZE;

    // World bounds for density calculation (auto-calculated from view)
    private worldBounds = {
        minX: -10000,
        minY: -10000,
        maxX: 10000,
        maxY: 10000
    };

    private numAsteroids = 2 ** 18; // 64k particles
    private initialized = false;

    constructor() { }

    async init(canvas: HTMLCanvasElement) {
        if (!navigator.gpu) {
            console.error("WebGPU not supported on this browser.");
            return false;
        }

        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            console.error("No WebGPU adapter found.");
            return false;
        }

        this.device = await this.adapter.requestDevice();
        this.context = canvas.getContext("webgpu");

        if (!this.device || !this.context) {
            console.error("Failed to initialize WebGPU device or context.");
            return false;
        }

        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.presentationFormat,
            alphaMode: 'premultiplied',
        });

        // Initialize Buffers & Pipelines
        this.createPipelines();

        this.initialized = true;
        console.log("AsteroidEngine WebGPU Initialized");
        return true;
    }

    private createPipelines() {
        if (!this.device) return;

        // 1. Create Buffers
        // Bodies Buffer
        this.bodiesBuffer = this.device.createBuffer({
            size: 20 * 16, // vec2 pos (8) + mass (4) + pad (4)
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        // Sim Params Buffer
        // float32 * 12 = 48 bytes (dt, g_const, body_count, softening, min_radius, max_radius, center_x, center_y, sun_mass, pad0, pad1, pad2)
        this.simParamsBuffer = this.device.createBuffer({
            size: 48,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // View Params Buffer
        this.viewParamsBuffer = this.device.createBuffer({
            size: 32, // scale, w, h, offx, offy ...
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Asteroid Buffer
        this.asteroidBuffer = this.device.createBuffer({
            size: this.numAsteroids * 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        // 2. Compute Pipelines (Velocity Verlet - 2 passes)
        // Both passes use the same bind group layout and buffers
        const computeModuleHalfKickDrift = this.device.createShaderModule({ code: COMPUTE_SHADER_HALFKICK_DRIFT });
        const computeModuleSecondHalfKick = this.device.createShaderModule({ code: COMPUTE_SHADER_SECOND_HALFKICK });

        const computeBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            ]
        });

        const computePipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [computeBindGroupLayout] });

        // Pass 1: Half-kick velocity + Drift position
        this.computePipelineHalfKickDrift = this.device.createComputePipeline({
            layout: computePipelineLayout,
            compute: { module: computeModuleHalfKickDrift, entryPoint: 'main' },
        });

        // Pass 2: Second half-kick (recalculate forces at new position)
        this.computePipelineSecondHalfKick = this.device.createComputePipeline({
            layout: computePipelineLayout,
            compute: { module: computeModuleSecondHalfKick, entryPoint: 'main' },
        });

        this.bindGroup = this.device.createBindGroup({
            layout: computeBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.asteroidBuffer } },
                { binding: 1, resource: { buffer: this.bodiesBuffer } },
                { binding: 2, resource: { buffer: this.simParamsBuffer } },
            ]
        });

        // 3. Render Pipeline
        const renderModule = this.device.createShaderModule({ code: RENDER_SHADER });

        const renderBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }
            ]
        });

        this.renderBindGroup = this.device.createBindGroup({
            layout: renderBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.viewParamsBuffer } },
                { binding: 1, resource: { buffer: this.asteroidBuffer } },
            ]
        });

        this.renderPipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [renderBindGroupLayout] }),
            vertex: {
                module: renderModule,
                entryPoint: 'vs_main',
            },
            fragment: {
                module: renderModule,
                entryPoint: 'fs_main',
                targets: [{
                    format: this.presentationFormat!,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
                        alpha: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
                    }
                }],
            },
            primitive: {
                topology: 'triangle-list',
            },
        });

        // 4. Density Heatmap Pipelines
        this.createDensityPipelines();
    }

    private createDensityPipelines() {
        if (!this.device) return;

        const gridCells = this.densityGridSize * this.densityGridSize;

        // Density Grid Buffer (u32 per cell)
        this.densityGridBuffer = this.device.createBuffer({
            size: gridCells * 4, // u32 = 4 bytes
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        // Density Params Buffer (for compute shader)
        // grid_size (u32), world_min_x, world_min_y, world_max_x, world_max_y, pad0, pad1, pad2
        this.densityParamsBuffer = this.device.createBuffer({
            size: 32, // 8 * 4 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Density Render Params Buffer
        // grid_size, max_density, screen_width, screen_height, world_min/max, view_scale, view_offset_x/y, pad
        this.densityRenderParamsBuffer = this.device.createBuffer({
            size: 48, // 12 * 4 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Density Compute Pipeline (bins asteroids into grid)
        const densityComputeModule = this.device.createShaderModule({ code: DENSITY_COMPUTE_SHADER });
        const densityComputeBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            ]
        });

        this.densityComputePipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [densityComputeBindGroupLayout] }),
            compute: { module: densityComputeModule, entryPoint: 'main' },
        });

        this.densityComputeBindGroup = this.device.createBindGroup({
            layout: densityComputeBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.asteroidBuffer! } },
                { binding: 1, resource: { buffer: this.densityGridBuffer } },
                { binding: 2, resource: { buffer: this.densityParamsBuffer } },
            ]
        });

        // Density Clear Pipeline
        const densityClearModule = this.device.createShaderModule({ code: DENSITY_CLEAR_SHADER });
        const densityClearBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            ]
        });

        this.densityClearPipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [densityClearBindGroupLayout] }),
            compute: { module: densityClearModule, entryPoint: 'main' },
        });

        this.densityClearBindGroup = this.device.createBindGroup({
            layout: densityClearBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.densityGridBuffer } },
                { binding: 1, resource: { buffer: this.densityParamsBuffer } },
            ]
        });

        // Density Render Pipeline (fullscreen heatmap)
        const densityRenderModule = this.device.createShaderModule({ code: DENSITY_RENDER_SHADER });
        const densityRenderBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
            ]
        });

        this.densityRenderPipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [densityRenderBindGroupLayout] }),
            vertex: {
                module: densityRenderModule,
                entryPoint: 'vs_main',
            },
            fragment: {
                module: densityRenderModule,
                entryPoint: 'fs_main',
                targets: [{
                    format: this.presentationFormat!,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        alpha: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                    }
                }],
            },
            primitive: {
                topology: 'triangle-list',
            },
        });

        this.densityRenderBindGroup = this.device.createBindGroup({
            layout: densityRenderBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.densityGridBuffer } },
                { binding: 1, resource: { buffer: this.densityRenderParamsBuffer } },
            ]
        });
    }

    public spawnAsteroids(bodies: Body[], gConst: number = 0.005) {
        if (!this.device || !this.asteroidBuffer) return;

        // Generate data on CPU
        const data = new Float32Array(this.numAsteroids * 4);

        let sun = bodies.find(b => b.mass > 1000);
        if (!sun) sun = bodies[0];

        // Default constraints (fallback)
        let minRadius = 300;
        let maxRadius = 5000;
        let isTargetingLagrange = false;
        let jupiterDist = 0;
        let jupiterAngle = 0;

        // Calculate minRadius based on closest body to sun (based on body.isStar)
        const star = bodies.find(b => b.isStar);


        const distance2d = (p1: Vector2D, p2: Vector2D) => Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
        const closestBodyToStar = bodies.reduce((closest, body) => {
            if (!body.isStar) return closest;
            return distance2d(body.position, star.position) < distance2d(closest.position, star.position) ? body : closest
        });
        const farthestBodyToStar = bodies.reduce((farthest, body) => distance2d(body.position, star.position) > distance2d(farthest.position, star.position) ? body : farthest);

        minRadius = distance2d(closestBodyToStar.position, star.position);
        maxRadius = distance2d(farthestBodyToStar.position, star.position);
        maxRadius = maxRadius * 1.2;


        // Check for Jupiter to spawn at L4/L5
        const jupiter = bodies.find(b => b.name.toLowerCase() === 'jupiter');

        if (jupiter) {
            const dx = jupiter.position.x - sun.position.x;
            const dy = jupiter.position.y - sun.position.y;
            jupiterDist = Math.sqrt(dx * dx + dy * dy);
            jupiterAngle = Math.atan2(dy, dx);
            isTargetingLagrange = true;

            console.log(`Spawning asteroids at Jupiter L4/L5. Distance: ${jupiterDist.toFixed(0)}`);
        }

        for (let i = 0; i < this.numAsteroids; i++) {
            let theta: number;
            let r: number;

            if (isTargetingLagrange) {
                // Target L4 (+60 deg) or L5 (-60 deg)
                const isL4 = Math.random() > 0.5;
                const offsetAngle = isL4 ? Math.PI / 3 : -Math.PI / 3;

                // Add some spread around the point (approx +/- 20 degrees = 0.35 rad)
                const spread = (Math.random() - 0.5) * 0.7;
                theta = jupiterAngle + offsetAngle + spread;

                // Radius spread
                const rSpread = (Math.random() - 0.5) * (jupiterDist * 0.15); // +/- 7.5%
                r = jupiterDist + rSpread;
            } else {
                // Fallback to random uniform distribution
                theta = Math.random() * Math.PI * 2;
                const u = Math.random() + Math.random();
                r = (u > 1 ? 2 - u : u) * (maxRadius - minRadius) + minRadius;
            }

            const px = sun.position.x + Math.cos(theta) * r;
            const py = sun.position.y + Math.sin(theta) * r;

            // Accurate Circular Velocity relative to Sun
            // v = sqrt(GM/r)
            const vMag = Math.sqrt(gConst * sun.mass / r);

            // Velocity directions for circular orbit
            const vx = -Math.sin(theta) * vMag;
            const vy = Math.cos(theta) * vMag;



            // Add Sun's velocity (relative to universe)
            const finalVx = vx + sun.velocity.x;
            const finalVy = vy + sun.velocity.y;

            const idx = i * 4;
            data[idx + 0] = px;
            data[idx + 1] = py;
            data[idx + 2] = finalVx;
            data[idx + 3] = finalVy;
        }

        this.device.queue.writeBuffer(this.asteroidBuffer, 0, data);
    }

    public updateBodies(bodies: Body[]) {
        if (!this.device || !this.bodiesBuffer) return;

        const count = Math.min(bodies.length, 20);
        const data = new Float32Array(count * 4);

        for (let i = 0; i < count; i++) {
            const b = bodies[i];
            const idx = i * 4;
            data[idx + 0] = b.position.x;
            data[idx + 1] = b.position.y;
            data[idx + 2] = b.mass;
            data[idx + 3] = b.radius;
        }

        this.device.queue.writeBuffer(this.bodiesBuffer, 0, data);
    }

    public updateParams(dt: number, gConst: number, bodyCount: number, minRadius: number, maxRadius: number, sunMass: number, sunPos: { x: number, y: number }) {
        if (!this.device || !this.simParamsBuffer) return;

        // Layout: dt, g_const, body_count(u32), softening, min_radius, max_radius, center_x, center_y, sun_mass, pad0, pad1, pad2
        const data = new Float32Array([
            dt,
            gConst,
            0, // Placeholder for u32 body_count
            SOFTENING, // softening parameter from constants
            minRadius,
            maxRadius,
            sunPos.x,
            sunPos.y,
            sunMass,
            0, // pad0
            0, // pad1
            0  // pad2
        ]);

        // Write Float parts
        this.device.queue.writeBuffer(this.simParamsBuffer, 0, data);

        // Overwrite the 'body_count' at offset 8 (index 2) with uint32
        this.device.queue.writeBuffer(this.simParamsBuffer, 8, new Uint32Array([Math.min(bodyCount, 20)]));
    }

    public updateView(scale: number, offset: { x: number, y: number }, width: number, height: number) {
        if (!this.device || !this.viewParamsBuffer) return;

        const data = new Float32Array([scale, width, height, offset.x, offset.y]);
        this.device.queue.writeBuffer(this.viewParamsBuffer, 0, data);

        // Update world bounds based on view (for density calculation)
        // Calculate visible world coordinates from screen bounds
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        // Screen corners to world coordinates
        this.worldBounds.minX = (-halfWidth - offset.x) / scale;
        this.worldBounds.maxX = (halfWidth - offset.x) / scale;
        this.worldBounds.minY = (-halfHeight - offset.y) / scale;
        this.worldBounds.maxY = (halfHeight - offset.y) / scale;

        // Update density params buffers
        this.updateDensityParams(scale, offset, width, height);
    }

    private updateDensityParams(scale: number, offset: { x: number, y: number }, width: number, height: number) {
        if (!this.device || !this.densityParamsBuffer || !this.densityRenderParamsBuffer) return;

        // Compute shader params: grid_size (u32), world_min_x, world_min_y, world_max_x, world_max_y, pad0, pad1, pad2
        const computeParams = new Float32Array([
            0, // Placeholder for grid_size (u32)
            this.worldBounds.minX,
            this.worldBounds.minY,
            this.worldBounds.maxX,
            this.worldBounds.maxY,
            0, 0, 0 // padding
        ]);
        this.device.queue.writeBuffer(this.densityParamsBuffer, 0, computeParams);
        this.device.queue.writeBuffer(this.densityParamsBuffer, 0, new Uint32Array([this.densityGridSize]));

        // Render shader params: grid_size, max_density, screen_width, screen_height, world bounds, view params
        const maxDensity = Math.max(10, this.numAsteroids / (this.densityGridSize * 4)); // Estimated max per cell
        const renderParams = new Float32Array([
            0, // Placeholder for grid_size (u32)
            maxDensity,
            width,
            height,
            this.worldBounds.minX,
            this.worldBounds.minY,
            this.worldBounds.maxX,
            this.worldBounds.maxY,
            scale,
            offset.x,
            offset.y,
            0 // padding
        ]);
        this.device.queue.writeBuffer(this.densityRenderParamsBuffer, 0, renderParams);
        this.device.queue.writeBuffer(this.densityRenderParamsBuffer, 0, new Uint32Array([this.densityGridSize]));
    }

    public setDensityEnabled(enabled: boolean) {
        this.densityEnabled = enabled;
    }

    public isDensityEnabled(): boolean {
        return this.densityEnabled;
    }

    // Sub-stepping constants (matching CPU physicsEngineNew.ts)
    private static readonly TARGET_DT = 0.008;
    private static readonly MAX_SUBSTEPS = 100;

    /**
     * Performs physics integration with adaptive sub-stepping to match CPU behavior.
     * This is the main entry point for physics updates.
     * 
     * @param totalDt - Total time to advance (can be large for high time warp)
     * @param gConst - Gravitational constant
     * @param bodyCount - Number of massive bodies
     * @param minRadius - Min spawn radius (unused, kept for API compat)
     * @param maxRadius - Max spawn radius (unused, kept for API compat)
     * @param sunMass - Sun mass (unused, kept for API compat)
     * @param sunPos - Sun position (unused, kept for API compat)
     */
    public updatePhysics(totalDt: number, gConst: number, bodyCount: number, minRadius: number, maxRadius: number, sunMass: number, sunPos: { x: number, y: number }) {
        if (!this.initialized || !this.device || !this.computePipelineHalfKickDrift || !this.computePipelineSecondHalfKick) return;

        // Adaptive sub-stepping (matching CPU physicsEngineNew.ts lines 251-254)
        const numSteps = Math.ceil(Math.abs(totalDt) / AsteroidEngine.TARGET_DT);
        const steps = Math.min(numSteps, AsteroidEngine.MAX_SUBSTEPS);
        const dt = totalDt / steps;

        // Update params buffer with sub-step dt
        this.updateParams(dt, gConst, bodyCount, minRadius, maxRadius, sunMass, sunPos);

        const commandEncoder = this.device.createCommandEncoder();
        const workgroupCount = Math.ceil(this.numAsteroids / 64);

        // Run multiple sub-steps of Velocity Verlet
        for (let s = 0; s < steps; s++) {
            // VELOCITY VERLET INTEGRATION (matches CPU physicsEngineNew.ts)
            // 
            // Pass 1: Half-kick + Drift
            //   v_half = v + 0.5 * a * dt
            //   x_new = x + v_half * dt
            const computePass1 = commandEncoder.beginComputePass();
            computePass1.setPipeline(this.computePipelineHalfKickDrift);
            if (this.bindGroup) computePass1.setBindGroup(0, this.bindGroup);
            computePass1.dispatchWorkgroups(workgroupCount);
            computePass1.end();

            // Pass 2: Second half-kick (forces recalculated at new position)
            //   a_new = calculateAcceleration(x_new)
            //   v_new = v_half + 0.5 * a_new * dt
            const computePass2 = commandEncoder.beginComputePass();
            computePass2.setPipeline(this.computePipelineSecondHalfKick);
            if (this.bindGroup) computePass2.setBindGroup(0, this.bindGroup);
            computePass2.dispatchWorkgroups(workgroupCount);
            computePass2.end();
        }

        this.device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Legacy step() method - performs a single integration step and renders.
     * For better accuracy at high time warp, use updatePhysics() + render() separately.
     */
    public step() {
        if (!this.initialized || !this.device || !this.context || !this.computePipelineHalfKickDrift || !this.computePipelineSecondHalfKick || !this.renderPipeline) return;

        const commandEncoder = this.device.createCommandEncoder();
        const workgroupCount = Math.ceil(this.numAsteroids / 64);

        // Single step of Velocity Verlet (for backward compatibility)
        // Pass 1: Half-kick + Drift
        const computePass1 = commandEncoder.beginComputePass();
        computePass1.setPipeline(this.computePipelineHalfKickDrift);
        if (this.bindGroup) computePass1.setBindGroup(0, this.bindGroup);
        computePass1.dispatchWorkgroups(workgroupCount);
        computePass1.end();

        // Pass 2: Second half-kick
        const computePass2 = commandEncoder.beginComputePass();
        computePass2.setPipeline(this.computePipelineSecondHalfKick);
        if (this.bindGroup) computePass2.setBindGroup(0, this.bindGroup);
        computePass2.dispatchWorkgroups(workgroupCount);
        computePass2.end();

        // Render Pass (Asteroids)
        const textureView = this.context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });

        renderPass.setPipeline(this.renderPipeline);
        if (this.renderBindGroup) renderPass.setBindGroup(0, this.renderBindGroup);
        renderPass.draw(6, this.numAsteroids);
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Render asteroids without running physics.
     * Use this after calling updatePhysics() for separate physics/render cycles.
     */
    public render() {
        if (!this.initialized || !this.device || !this.context || !this.renderPipeline) return;

        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });

        renderPass.setPipeline(this.renderPipeline);
        if (this.renderBindGroup) renderPass.setBindGroup(0, this.renderBindGroup);
        renderPass.draw(6, this.numAsteroids);
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Computes and renders the asteroid density heatmap overlay.
     * Call this after step() when density visualization is enabled.
     */
    public renderDensity() {
        if (!this.initialized || !this.device || !this.context) return;
        if (!this.densityEnabled) return;
        if (!this.densityClearPipeline || !this.densityComputePipeline || !this.densityRenderPipeline) return;
        if (!this.densityClearBindGroup || !this.densityComputeBindGroup || !this.densityRenderBindGroup) return;

        const commandEncoder = this.device.createCommandEncoder();
        const gridCells = this.densityGridSize * this.densityGridSize;

        // 1. Clear density grid
        const clearPass = commandEncoder.beginComputePass();
        clearPass.setPipeline(this.densityClearPipeline);
        clearPass.setBindGroup(0, this.densityClearBindGroup);
        clearPass.dispatchWorkgroups(Math.ceil(gridCells / 64));
        clearPass.end();

        // 2. Compute density (bin asteroids)
        const densityComputePass = commandEncoder.beginComputePass();
        densityComputePass.setPipeline(this.densityComputePipeline);
        densityComputePass.setBindGroup(0, this.densityComputeBindGroup);
        densityComputePass.dispatchWorkgroups(Math.ceil(this.numAsteroids / 64));
        densityComputePass.end();

        // 3. Render density heatmap (fullscreen quad, blended over existing content)
        const textureView = this.context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                loadOp: 'load', // Load existing content (asteroids)
                storeOp: 'store',
            }],
        });

        renderPass.setPipeline(this.densityRenderPipeline);
        renderPass.setBindGroup(0, this.densityRenderBindGroup);
        renderPass.draw(3); // Fullscreen triangle
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}
