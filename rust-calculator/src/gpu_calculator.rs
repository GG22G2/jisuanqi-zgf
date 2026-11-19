use wgpu::util::DeviceExt;
use wgpu::*;

pub struct GpuContext {
    pub device: Device,
    pub queue: Queue,
    pub gpu_name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Stage1Input {
    pub score_cache: Vec<i32>,
    pub chef_equip_count: Vec<i32>,
    pub recipe_count: u32,
    pub total_chef_count: u32,
    pub own_chef_count: u32,
    pub own_presence_chef_count: u32,
    pub own_chef_top_k: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Stage2Input {
    pub play_recipes: Vec<u32>,
    pub chef_real_index: Vec<i32>,
    pub chef_masks: Vec<i32>,
    pub chef_match_masks: Vec<i32>,
    pub recipe_count: u32,
    pub chef_t: u32,
    pub num_combinations: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FullComputeInput {
    pub stage1: Stage1Input,
    pub stage2: Stage2Input,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ComputeResult {
    pub max_score: i32,
    pub max_score_chef_group: Vec<i32>,
    pub recipes: Vec<u32>,
    pub scores: Vec<i32>,
    pub gpu_name: String,
    pub time_ms: u128,
}

fn cal_i(i: i32, n: i32) -> i32 {
    let i_f = i as f64;
    let n_f = n as f64;
    let term1 = i_f * (i_f - 1.0) * (i_f - 3.0 * n_f - 2.0) / 6.0;
    let term2 = i_f * n_f * (n_f + 1.0) / 2.0;
    (term1 + term2).round() as i32
}

impl GpuContext {
    pub async fn init() -> Result<Self, String> {
        let instance = Instance::new(&InstanceDescriptor {
            backends: Backends::all(),
            ..Default::default()
        });

        // Specifically look for DiscreteGpu (RTX 3060) first
        let adapters = instance.enumerate_adapters(Backends::all());
        let adapter = adapters
            .into_iter()
            .find(|a| a.get_info().device_type == DeviceType::DiscreteGpu)
            .or_else(|| {
                pollster::block_on(instance.request_adapter(&RequestAdapterOptions {
                    power_preference: PowerPreference::HighPerformance,
                    compatible_surface: None,
                    force_fallback_adapter: false,
                }))
            })
            .ok_or_else(|| "Failed to find suitable GPU adapter".to_string())?;

        let info = adapter.get_info();
        println!("==> Selected GPU: {} ({:?})", info.name, info.backend);

        let (device, queue) = adapter
            .request_device(
                &DeviceDescriptor {
                    label: Some("Calculator GPU Device"),
                    required_features: Features::empty(),
                    required_limits: Limits {
                        max_storage_buffer_binding_size: 1024 * 1024 * 1024, // 1GB
                        max_buffer_size: 1024 * 1024 * 1024,
                        ..Limits::default()
                    },
                    memory_hints: Default::default(),
                },
                None,
            )
            .await
            .map_err(|e| format!("Failed to create GPU device: {:?}", e))?;

        Ok(Self {
            device,
            queue,
            gpu_name: info.name,
        })
    }

    pub async fn run_full_compute(&self, input: FullComputeInput) -> Result<ComputeResult, String> {
        let start = std::time::Instant::now();

        // 1. Run Stage 1
        let (group_max_score, group_max_score_chef_index) = self.run_stage1(&input.stage1).await?;

        // 2. Run Stage 2
        let result = self
            .run_stage2(
                &input.stage2,
                &group_max_score,
                &group_max_score_chef_index,
            )
            .await?;

        let time_ms = start.elapsed().as_millis();
        Ok(ComputeResult {
            max_score: result.max_score,
            max_score_chef_group: result.max_score_chef_group,
            recipes: result.recipes,
            scores: result.scores,
            gpu_name: self.gpu_name.clone(),
            time_ms,
        })
    }

    pub async fn run_stage1(
        &self,
        input: &Stage1Input,
    ) -> Result<(Vec<i32>, Vec<i32>), String> {
        let recipe_count = input.recipe_count as i32;
        let total_chef_count = input.total_chef_count as i32;
        let own_chef_count = input.own_chef_count as i32;
        let own_presence_chef_count = input.own_presence_chef_count as i32;
        let own_chef_top_k = input.own_chef_top_k as i32;

        let max_index = cal_i(recipe_count - 2, recipe_count - 2);
        let queue_deep = own_chef_top_k + own_presence_chef_count;
        let output_elements = (max_index * queue_deep) as usize;
        let output_bytes = (output_elements * 4) as u64;

        let score_cache_buffer = self
            .device
            .create_buffer_init(&util::BufferInitDescriptor {
                label: Some("Stage1 ScoreCache"),
                contents: bytemuck::cast_slice(&input.score_cache),
                usage: BufferUsages::STORAGE,
            });

        let chef_equip_count_buffer = self
            .device
            .create_buffer_init(&util::BufferInitDescriptor {
                label: Some("Stage1 ChefEquipCount"),
                contents: bytemuck::cast_slice(&input.chef_equip_count),
                usage: BufferUsages::STORAGE,
            });

        let group_max_score_buffer = self.device.create_buffer(&BufferDescriptor {
            label: Some("Stage1 GroupMaxScore"),
            size: output_bytes,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let group_max_score_chef_index_buffer = self.device.create_buffer(&BufferDescriptor {
            label: Some("Stage1 GroupMaxScoreChefIndex"),
            size: output_bytes,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let r2 = recipe_count * recipe_count;
        let max_idx_val = recipe_count * recipe_count * recipe_count;

        let shader_code = format!(
            r#"
            @group(0) @binding(0) var<storage, read> scoreCache: array<i32>;
            @group(0) @binding(1) var<storage, read> chefEquipCount: array<i32>;
            @group(0) @binding(2) var<storage, read_write> groupMaxScore: array<i32>;
            @group(0) @binding(3) var<storage, read_write> groupMaxScoreChefIndex: array<i32>;

            fn calI(i: i32, N: i32) -> i32 {{
                let i_f32 = f32(i);
                let N_f32 = f32(N);
                let term1 = i_f32 * (i_f32 - 1.0) * (i_f32 - 3.0 * N_f32 - 2.0) / 6.0;
                let term2 = i_f32 * N_f32 * (N_f32 + 1.0) / 2.0;
                return i32(round(term1 + term2));
            }}

            fn calJ(i: i32, j: i32, N: i32) -> i32 {{
                let count = j - i;
                let start = N - i - 2;
                let end = start - count + 1;
                return (start + end) * count / 2;
            }}

            fn getIndex(i: i32, j: i32, k: i32, recipeCount: i32) -> i32 {{
                let c1 = calI(i, recipeCount - 2);
                let c2 = calJ(i, j - 1, recipeCount);
                let c3 = k - j - 1;
                return c1 + c2 + c3;
            }}

            @compute @workgroup_size(256)
            fn main(@builtin(global_invocation_id) globalIndex: vec3<u32>) {{
                let recipeCount : i32 = {recipe_count};
                let totalChefCount : i32 = {total_chef_count};
                let ownChefCount : i32 = {own_chef_count};
                let ownPresenceChefCount : i32 = {own_presence_chef_count};
                let ownChefTopK : i32 = {own_chef_top_k};
                let queueDeep : i32 = {queue_deep};
                let maxIndex: i32 = {max_idx_val};
                let r2: i32 = {r2};

                let rawIndex: i32 = i32(globalIndex.x + globalIndex.y * 65535u * 256u + globalIndex.z * 65535u * 256u * 4u);
                if (rawIndex >= maxIndex) {{
                    return;
                }}

                let i: i32 = rawIndex / r2;
                let j: i32 = (rawIndex % r2) / recipeCount;
                let k: i32 = rawIndex % recipeCount;

                if (i >= j || j >= k) {{
                    return;
                }}

                let index = getIndex(i, j, k, recipeCount) * queueDeep;
                var bestScores: array<i32, {own_chef_top_k}>;
                var bestIndices: array<i32, {own_chef_top_k}>;
                for (var p: i32 = 0; p < ownChefTopK; p = p + 1) {{
                    bestScores[p] = 0;
                    bestIndices[p] = 0;
                }}

                var tAdd: i32 = 0;
                for (var r: i32 = 0; r < ownChefCount; r = r + 1) {{
                    var equipCount: i32 = chefEquipCount[r];
                    var start: i32 = tAdd;
                    var end: i32 = tAdd + equipCount + 1;
                    var maxNum: i32 = 0;
                    var maxT: i32 = 0;

                    for (var t: i32 = start; t < end; t = t + 1) {{
                        let s1 = scoreCache[t * recipeCount + i];
                        let s2 = scoreCache[t * recipeCount + j];
                        let s3 = scoreCache[t * recipeCount + k];
                        if (s1 != 0 && s2 != 0 && s3 != 0) {{
                            let num: i32 = s1 + s2 + s3;
                            if (num > maxNum) {{
                                maxNum = num;
                                maxT = t;
                            }}
                        }}
                    }}
                    tAdd = end;

                    if (maxNum > bestScores[ownChefTopK - 1]) {{
                        for (var p: i32 = 0; p < ownChefTopK; p = p + 1) {{
                            if (maxNum > bestScores[p]) {{
                                for (var shift: i32 = ownChefTopK - 1; shift > p; shift = shift - 1) {{
                                    bestScores[shift] = bestScores[shift - 1];
                                    bestIndices[shift] = bestIndices[shift - 1];
                                }}
                                bestScores[p] = maxNum;
                                bestIndices[p] = maxT;
                                break;
                            }}
                        }}
                    }}
                }}

                for (var p: i32 = 0; p < ownChefTopK; p = p + 1) {{
                    groupMaxScoreChefIndex[index + p] = bestIndices[p];
                    groupMaxScore[index + p] = bestScores[p];
                }}

                for (var r1: i32 = 0; r1 < ownPresenceChefCount; r1 = r1 + 1) {{
                    var r: i32 = r1 + ownChefCount;
                    var equipCount: i32 = chefEquipCount[r];
                    var start: i32 = tAdd;
                    var end: i32 = tAdd + equipCount + 1;
                    var maxNum: i32 = 0;
                    var maxT: i32 = 0;

                    for (var t: i32 = start; t < end; t = t + 1) {{
                        let s1 = scoreCache[t * recipeCount + i];
                        let s2 = scoreCache[t * recipeCount + j];
                        let s3 = scoreCache[t * recipeCount + k];
                        if (s1 != 0 && s2 != 0 && s3 != 0) {{
                            let num: i32 = s1 + s2 + s3;
                            if (num > maxNum) {{
                                maxNum = num;
                                maxT = t;
                            }}
                        }}
                    }}
                    tAdd = end;

                    let chefScoreIndex: i32 = index + ownChefTopK + r1;
                    groupMaxScoreChefIndex[chefScoreIndex] = maxT;
                    groupMaxScore[chefScoreIndex] = maxNum;
                }}
            }}
            "#
        );

        let shader_module = self.device.create_shader_module(ShaderModuleDescriptor {
            label: Some("Stage1 Shader"),
            source: ShaderSource::Wgsl(shader_code.into()),
        });

        let bind_group_layout =
            self.device
                .create_bind_group_layout(&BindGroupLayoutDescriptor {
                    label: Some("Stage1 BGL"),
                    entries: &[
                        BindGroupLayoutEntry {
                            binding: 0,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: true },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 1,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: true },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 2,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: false },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 3,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: false },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                    ],
                });

        let bind_group = self.device.create_bind_group(&BindGroupDescriptor {
            label: Some("Stage1 BG"),
            layout: &bind_group_layout,
            entries: &[
                BindGroupEntry {
                    binding: 0,
                    resource: score_cache_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 1,
                    resource: chef_equip_count_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 2,
                    resource: group_max_score_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 3,
                    resource: group_max_score_chef_index_buffer.as_entire_binding(),
                },
            ],
        });

        let pipeline_layout =
            self.device
                .create_pipeline_layout(&PipelineLayoutDescriptor {
                    label: Some("Stage1 Pipeline Layout"),
                    bind_group_layouts: &[&bind_group_layout],
                    push_constant_ranges: &[],
                });

        let compute_pipeline =
            self.device
                .create_compute_pipeline(&ComputePipelineDescriptor {
                    label: Some("Stage1 Pipeline"),
                    layout: Some(&pipeline_layout),
                    module: &shader_module,
                    entry_point: Some("main"),
                    compilation_options: Default::default(),
                    cache: None,
                });

        let total_threads = (input.recipe_count as u64).pow(3);
        let workgroup_size = 256u64;
        let total_workgroups = (total_threads + workgroup_size - 1) / workgroup_size;
        let max_workgroups_per_dim = 65535u64;

        let dispatch_x = total_workgroups.min(max_workgroups_per_dim) as u32;
        let dispatch_y = ((total_workgroups + dispatch_x as u64 - 1) / dispatch_x as u64) as u32;

        let mut encoder = self
            .device
            .create_command_encoder(&CommandEncoderDescriptor {
                label: Some("Stage1 Encoder"),
            });

        {
            let mut pass = encoder.begin_compute_pass(&ComputePassDescriptor {
                label: Some("Stage1 Pass"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&compute_pipeline);
            pass.set_bind_group(0, &bind_group, &[]);
            pass.dispatch_workgroups(dispatch_x, dispatch_y, 1);
        }

        let readback_score = self.device.create_buffer(&BufferDescriptor {
            label: Some("Stage1 Readback Score"),
            size: output_bytes,
            usage: BufferUsages::COPY_DST | BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let readback_idx = self.device.create_buffer(&BufferDescriptor {
            label: Some("Stage1 Readback Idx"),
            size: output_bytes,
            usage: BufferUsages::COPY_DST | BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        encoder.copy_buffer_to_buffer(
            &group_max_score_buffer,
            0,
            &readback_score,
            0,
            output_bytes,
        );
        encoder.copy_buffer_to_buffer(
            &group_max_score_chef_index_buffer,
            0,
            &readback_idx,
            0,
            output_bytes,
        );

        self.queue.submit(Some(encoder.finish()));

        let scores = self.read_buffer_i32(&readback_score, output_elements).await?;
        let indices = self.read_buffer_i32(&readback_idx, output_elements).await?;

        Ok((scores, indices))
    }

    pub async fn run_stage2(
        &self,
        input: &Stage2Input,
        group_max_score: &[i32],
        group_max_score_chef_index: &[i32],
    ) -> Result<ComputeResult, String> {
        let num_combinations = input.num_combinations;
        let recipe_count = input.recipe_count;
        let chef_t = input.chef_t;

        let play_recipes_buffer = self
            .device
            .create_buffer_init(&util::BufferInitDescriptor {
                label: Some("Stage2 PlayRecipes"),
                contents: bytemuck::cast_slice(&input.play_recipes),
                usage: BufferUsages::STORAGE,
            });

        let group_max_score_buffer = self
            .device
            .create_buffer_init(&util::BufferInitDescriptor {
                label: Some("Stage2 GroupMaxScore"),
                contents: bytemuck::cast_slice(group_max_score),
                usage: BufferUsages::STORAGE,
            });

        let group_max_score_chef_index_buffer = self
            .device
            .create_buffer_init(&util::BufferInitDescriptor {
                label: Some("Stage2 GroupMaxScoreChefIndex"),
                contents: bytemuck::cast_slice(group_max_score_chef_index),
                usage: BufferUsages::STORAGE,
            });

        let chef_real_index_buffer = self
            .device
            .create_buffer_init(&util::BufferInitDescriptor {
                label: Some("Stage2 ChefRealIndex"),
                contents: bytemuck::cast_slice(&input.chef_real_index),
                usage: BufferUsages::STORAGE,
            });

        let chef_masks_buffer = self
            .device
            .create_buffer_init(&util::BufferInitDescriptor {
                label: Some("Stage2 ChefMasks"),
                contents: bytemuck::cast_slice(&input.chef_masks),
                usage: BufferUsages::STORAGE,
            });

        let chef_match_masks_buffer = self
            .device
            .create_buffer_init(&util::BufferInitDescriptor {
                label: Some("Stage2 ChefMatchMasks"),
                contents: bytemuck::cast_slice(&input.chef_match_masks),
                usage: BufferUsages::STORAGE,
            });

        // FinalResult struct size: 7 * 4 = 28 bytes
        let result_struct_size = 28u64;
        let output_bytes = (num_combinations as u64) * result_struct_size;

        let output_buffer = self.device.create_buffer(&BufferDescriptor {
            label: Some("Stage2 Output"),
            size: output_bytes,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let max_dispatch_x = 65535u32;
        let dispatch_x = num_combinations.min(max_dispatch_x);
        let dispatch_y = (num_combinations + dispatch_x - 1) / dispatch_x;

        let shader_code = format!(
            r#"
            fn calI(i: i32, N: i32) -> i32 {{
                let term1 = i * (i - 1) * (i - 3 * N - 2) / 6;
                let term2 = i * N * (N + 1) / 2;
                return term1 + term2;
            }}
            fn calJ(i: i32, j: i32, N: i32) -> i32 {{
                let count = j - i;
                let start = N - i - 2;
                let end = start - count + 1;
                return (start + end) * count / 2;
            }}
            fn getIndex(i: u32, j: u32, k: u32, recipeCount: u32) -> u32 {{
                let c1 = calI(i32(i), i32(recipeCount) - 2);
                let c2 = calJ(i32(i), i32(j) - 1, i32(recipeCount));
                let c3 = k - j - 1u;
                return u32(c1 + c2 + i32(c3));
            }}

            struct WorkgroupResult {{
                maxScore: atomic<i32>,
                chef1: atomic<i32>,
                chef2: atomic<i32>,
                chef3: atomic<i32>,
                score1: atomic<i32>,
                score2: atomic<i32>,
                score3: atomic<i32>,
            }};

            struct FinalResult {{
                score: i32,
                chef1: i32,
                chef2: i32,
                chef3: i32,
                score1: i32,
                score2: i32,
                score3: i32,
            }};

            @group(0) @binding(0) var<storage, read> playRecipes: array<u32>;
            @group(0) @binding(1) var<storage, read> groupMaxScore: array<i32>;
            @group(0) @binding(2) var<storage, read> groupMaxScoreChefIndex: array<i32>;
            @group(0) @binding(3) var<storage, read> chefRealIndex: array<i32>;
            @group(0) @binding(4) var<storage, read> chefMasks: array<i32>;
            @group(0) @binding(5) var<storage, read> chefMatchMasks: array<i32>;
            @group(0) @binding(6) var<storage, read_write> output: array<FinalResult>;

            var<workgroup> localBest: WorkgroupResult;

            @compute @workgroup_size(256)
            fn main(@builtin(local_invocation_id) local_id: vec3<u32>, @builtin(workgroup_id) workgroup_id: vec3<u32>) {{
                let recipeCount: u32 = {recipe_count}u;
                let chefT: u32 = {chef_t}u;
                let numCombinations: u32 = {num_combinations}u;
                let workgroupSize: u32 = 256u;
                let dispatchX: u32 = {dispatch_x}u;

                let combinationIndex = workgroup_id.x + workgroup_id.y * dispatchX;
                if (combinationIndex >= numCombinations) {{
                    return;
                }}
                if (local_id.x == 0u) {{
                    atomicStore(&localBest.maxScore, 0);
                    atomicStore(&localBest.chef1, 0);
                    atomicStore(&localBest.chef2, 0);
                    atomicStore(&localBest.chef3, 0);
                    atomicStore(&localBest.score1, 0);
                    atomicStore(&localBest.score2, 0);
                    atomicStore(&localBest.score3, 0);
                }}
                workgroupBarrier();

                let recipeBaseIndex = combinationIndex * 9u;
                let r1 = playRecipes[recipeBaseIndex + 0u];
                let r2 = playRecipes[recipeBaseIndex + 1u];
                let r3 = playRecipes[recipeBaseIndex + 2u];
                let r4 = playRecipes[recipeBaseIndex + 3u];
                let r5 = playRecipes[recipeBaseIndex + 4u];
                let r6 = playRecipes[recipeBaseIndex + 5u];
                let r7 = playRecipes[recipeBaseIndex + 6u];
                let r8 = playRecipes[recipeBaseIndex + 7u];
                let r9 = playRecipes[recipeBaseIndex + 8u];

                let score1GroupIdx = getIndex(r1, r2, r3, recipeCount) * chefT;
                let score2GroupIdx = getIndex(r4, r5, r6, recipeCount) * chefT;
                let score3GroupIdx = getIndex(r7, r8, r9, recipeCount) * chefT;

                let totalIterations = chefT * chefT * chefT;
                for (var i = local_id.x; i < totalIterations; i = i + workgroupSize) {{
                    let c1 = i % chefT;
                    let c2 = (i / chefT) % chefT;
                    let c3 = i / (chefT * chefT);

                    let score1 = groupMaxScore[score1GroupIdx + c1];
                    let score2 = groupMaxScore[score2GroupIdx + c2];
                    let score3 = groupMaxScore[score3GroupIdx + c3];
                    let currentScore = score1 + score2 + score3;
                    if (currentScore <= atomicLoad(&localBest.maxScore)) {{
                        continue;
                    }}
                    let chef1_idx = groupMaxScoreChefIndex[score1GroupIdx + c1];
                    let chef2_idx = groupMaxScoreChefIndex[score2GroupIdx + c2];
                    let chef3_idx = groupMaxScoreChefIndex[score3GroupIdx + c3];

                    let realChef1 = chefRealIndex[chef1_idx];
                    let realChef2 = chefRealIndex[chef2_idx];
                    let realChef3 = chefRealIndex[chef3_idx];

                    if (realChef1 != realChef2 && realChef1 != realChef3 && realChef2 != realChef3) {{
                        let mm1 = chefMatchMasks[chef1_idx];
                        let mm2 = chefMatchMasks[chef2_idx];
                        let mm3 = chefMatchMasks[chef3_idx];
                        if ((mm1 | mm2 | mm3) != 0) {{
                            let m1 = chefMasks[chef1_idx];
                            let m2 = chefMasks[chef2_idx];
                            let m3 = chefMasks[chef3_idx];
                            let p1 = mm1 & (m2 | m3);
                            let p2 = mm2 & (m1 | m3);
                            let p3 = mm3 & (m1 | m2);
                            if (p1 != mm1 || p2 != mm2 || p3 != mm3) {{
                                continue;
                            }}
                        }}
                        let oldMax = atomicMax(&localBest.maxScore, currentScore);
                        if (currentScore > oldMax) {{
                            atomicStore(&localBest.chef1, chef1_idx);
                            atomicStore(&localBest.chef2, chef2_idx);
                            atomicStore(&localBest.chef3, chef3_idx);
                            atomicStore(&localBest.score1, score1);
                            atomicStore(&localBest.score2, score2);
                            atomicStore(&localBest.score3, score3);
                        }}
                    }}
                }}
                workgroupBarrier();

                if (local_id.x == 0u) {{
                    let finalScore = atomicLoad(&localBest.maxScore);
                    if (finalScore > 0) {{
                        let finalChef1 = atomicLoad(&localBest.chef1);
                        let finalChef2 = atomicLoad(&localBest.chef2);
                        let finalChef3 = atomicLoad(&localBest.chef3);
                        output[combinationIndex].score = finalScore;
                        output[combinationIndex].chef1 = finalChef1;
                        output[combinationIndex].chef2 = finalChef2;
                        output[combinationIndex].chef3 = finalChef3;
                        output[combinationIndex].score1 = atomicLoad(&localBest.score1);
                        output[combinationIndex].score2 = atomicLoad(&localBest.score2);
                        output[combinationIndex].score3 = atomicLoad(&localBest.score3);
                    }}
                }}
            }}
            "#
        );

        let shader_module = self.device.create_shader_module(ShaderModuleDescriptor {
            label: Some("Stage2 Shader"),
            source: ShaderSource::Wgsl(shader_code.into()),
        });

        let bind_group_layout =
            self.device
                .create_bind_group_layout(&BindGroupLayoutDescriptor {
                    label: Some("Stage2 BGL"),
                    entries: &[
                        BindGroupLayoutEntry {
                            binding: 0,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: true },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 1,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: true },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 2,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: true },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 3,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: true },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 4,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: true },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 5,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: true },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                        BindGroupLayoutEntry {
                            binding: 6,
                            visibility: ShaderStages::COMPUTE,
                            ty: BindingType::Buffer {
                                ty: BufferBindingType::Storage { read_only: false },
                                has_dynamic_offset: false,
                                min_binding_size: None,
                            },
                            count: None,
                        },
                    ],
                });

        let bind_group = self.device.create_bind_group(&BindGroupDescriptor {
            label: Some("Stage2 BG"),
            layout: &bind_group_layout,
            entries: &[
                BindGroupEntry {
                    binding: 0,
                    resource: play_recipes_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 1,
                    resource: group_max_score_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 2,
                    resource: group_max_score_chef_index_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 3,
                    resource: chef_real_index_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 4,
                    resource: chef_masks_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 5,
                    resource: chef_match_masks_buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 6,
                    resource: output_buffer.as_entire_binding(),
                },
            ],
        });

        let pipeline_layout =
            self.device
                .create_pipeline_layout(&PipelineLayoutDescriptor {
                    label: Some("Stage2 Pipeline Layout"),
                    bind_group_layouts: &[&bind_group_layout],
                    push_constant_ranges: &[],
                });

        let compute_pipeline =
            self.device
                .create_compute_pipeline(&ComputePipelineDescriptor {
                    label: Some("Stage2 Pipeline"),
                    layout: Some(&pipeline_layout),
                    module: &shader_module,
                    entry_point: Some("main"),
                    compilation_options: Default::default(),
                    cache: None,
                });

        let mut encoder = self
            .device
            .create_command_encoder(&CommandEncoderDescriptor {
                label: Some("Stage2 Encoder"),
            });

        {
            let mut pass = encoder.begin_compute_pass(&ComputePassDescriptor {
                label: Some("Stage2 Pass"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&compute_pipeline);
            pass.set_bind_group(0, &bind_group, &[]);
            pass.dispatch_workgroups(dispatch_x, dispatch_y, 1);
        }

        let readback_output = self.device.create_buffer(&BufferDescriptor {
            label: Some("Stage2 Readback Output"),
            size: output_bytes,
            usage: BufferUsages::COPY_DST | BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        encoder.copy_buffer_to_buffer(
            &output_buffer,
            0,
            &readback_output,
            0,
            output_bytes,
        );

        self.queue.submit(Some(encoder.finish()));

        let results_i32 = self
            .read_buffer_i32(&readback_output, (num_combinations * 7) as usize)
            .await?;

        // Find max score among combinations
        let mut best_idx = -1i32;
        let mut max_score = 0i32;

        for c in 0..num_combinations as usize {
            let base = c * 7;
            let score = results_i32[base];
            if score > max_score {
                max_score = score;
                best_idx = c as i32;
            }
        }

        if best_idx >= 0 {
            let base = (best_idx as usize) * 7;
            let chef1 = results_i32[base + 1];
            let chef2 = results_i32[base + 2];
            let chef3 = results_i32[base + 3];
            let score1 = results_i32[base + 4];
            let score2 = results_i32[base + 5];
            let score3 = results_i32[base + 6];

            let recipe_base = (best_idx as usize) * 9;
            let recipes = input.play_recipes[recipe_base..recipe_base + 9].to_vec();

            Ok(ComputeResult {
                max_score,
                max_score_chef_group: vec![chef1, chef2, chef3],
                recipes,
                scores: vec![score1, score2, score3],
                gpu_name: self.gpu_name.clone(),
                time_ms: 0,
            })
        } else {
            Ok(ComputeResult {
                max_score: 0,
                max_score_chef_group: vec![0, 0, 0],
                recipes: vec![],
                scores: vec![0, 0, 0],
                gpu_name: self.gpu_name.clone(),
                time_ms: 0,
            })
        }
    }

    async fn read_buffer_i32(&self, buffer: &Buffer, count: usize) -> Result<Vec<i32>, String> {
        let slice = buffer.slice(..);
        let (tx, rx) = tokio::sync::oneshot::channel();

        slice.map_async(MapMode::Read, move |res| {
            let _ = tx.send(res);
        });

        self.device.poll(Maintain::Wait);

        rx.await
            .map_err(|e| format!("Channel receive error: {:?}", e))?
            .map_err(|e| format!("Buffer map async error: {:?}", e))?;

        let data = {
            let view = slice.get_mapped_range();
            let slice_i32: &[i32] = bytemuck::cast_slice(&view);
            slice_i32[..count].to_vec()
        };

        buffer.unmap();
        Ok(data)
    }
}
