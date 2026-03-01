

self.onmessage = async (e) => {
    let data = e.data;
    await chefAndRecipeThread.setBaseData(data.data);
    let result = chefAndRecipeThread.call(data.start, data.limit);
    console.log(result)
    self.postMessage({type: 'r', result: result});
};

export class ChefAndRecipeThread {

    constructor() {
        this.playRecipes = null;
        this.start = 0;
        this.groupMaxScore = null;
        this.groupMaxScoreChefIndex = null;
        this.groupBestScore = null;
        this.groupBestScoreBase = null;
        this.chefRealIndex = null;
        this.recipeCount = 0;
        this.ownChefTopK = 3;
        this.baseOwnChefTopK = 3;
        this.enableDynamicTopK = true;
        this.baseCandidateSlots = null;

    }


    async setBaseData({
                          playRecipesArr,
                          recipePL,
                          scoreCache,
                          amberPrice,
                          recipeCount,
                          playChefCount,
                          ownChefCount,
                          playPresenceChefCount,
                          presenceChefCount,
                          chefEquipCount,
                          chefMasks,
                          chefMatchMasks,
                          chefRealIndex,
                          ownChefTopK,
                          baseOwnChefTopK,
                          enableDynamicTopK
                      }) {
        this.playRecipes = playRecipesArr;
        this.recipePL = recipePL
        this.ownChefTopK = ownChefTopK == null ? 3 : Math.max(3, ownChefTopK | 0);
        this.baseOwnChefTopK = baseOwnChefTopK == null ? 3 : Math.max(1, baseOwnChefTopK | 0);
        this.enableDynamicTopK = enableDynamicTopK !== false;

        let result = null;
        let isMobile = navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i);
        console.time('计算每三道菜最高得分的厨师')
        if (isMobile || !navigator.gpu) {
            result = this.calAllCache(scoreCache, recipeCount
                , playChefCount + playPresenceChefCount, ownChefCount, presenceChefCount, chefEquipCount, this.ownChefTopK);
        } else {
            try {
                result = await this.computeWithWebGPU(scoreCache, recipeCount
                    , playChefCount + playPresenceChefCount, ownChefCount, presenceChefCount, chefEquipCount, this.ownChefTopK);
            } catch (e) {
                console.warn('[GPU] 第一阶段计算失败，自动回退 CPU 路径', e);
                result = this.calAllCache(scoreCache, recipeCount
                    , playChefCount + playPresenceChefCount, ownChefCount, presenceChefCount, chefEquipCount, this.ownChefTopK);
            }
        }
        console.timeEnd('计算每三道菜最高得分的厨师')

        //验证结果
        // for (let i = 0; i < result2.groupMaxScore.length; i++) {
        //     if (result3.groupMaxScore[i]!==result2.groupMaxScore[i]){
        //         //debugger
        //         console.log("结果不正确")
        //     }
        // }
        //
        // for (let i = 0; i < result2.groupMaxScore.length; i++) {
        //     if (result3.groupMaxScoreChefIndex[i]!==result2.groupMaxScoreChefIndex[i]){
        //         debugger
        //         console.log("结果不正确")
        //     }
        // }

        //  console.log(result2.groupMaxScoreChefIndex)

        this.groupMaxScore = result.groupMaxScore
        this.groupMaxScoreChefIndex = result.groupMaxScoreChefIndex
        this.chefRealIndex = chefRealIndex

        this.recipeCount = recipeCount;
        this.chefMasks = chefMasks;
        this.chefMatchMasks = chefMatchMasks;
        this.presenceChefCount = presenceChefCount;
        const chefT = this.presenceChefCount + this.ownChefTopK;
        const groupCount = (this.groupMaxScore.length / chefT) | 0;
        this.groupBestScore = new Int32Array(groupCount);
        this.groupBestScoreBase = new Int32Array(groupCount);
        const baseOwnTopK = Math.min(this.baseOwnChefTopK, this.ownChefTopK);
        const baseCandidateSlots = new Int16Array(baseOwnTopK + this.presenceChefCount);
        for (let i = 0; i < baseOwnTopK; i++) {
            baseCandidateSlots[i] = i;
        }
        for (let i = 0; i < this.presenceChefCount; i++) {
            baseCandidateSlots[baseOwnTopK + i] = this.ownChefTopK + i;
        }
        this.baseCandidateSlots = baseCandidateSlots;
        for (let g = 0, base = 0; g < groupCount; g++, base += chefT) {
            let best = 0;
            for (let c = 0; c < chefT; c++) {
                const score = this.groupMaxScore[base + c];
                if (score > best) {
                    best = score;
                }
            }
            this.groupBestScore[g] = best;

            let baseBest = 0;
            for (let i = 0; i < baseCandidateSlots.length; i++) {
                const slot = baseCandidateSlots[i];
                const score = this.groupMaxScore[base + slot];
                if (score > baseBest) {
                    baseBest = score;
                }
            }
            this.groupBestScoreBase[g] = baseBest;
        }
        //console.log(calAllCache1)

    }


    /**
     * @return {} 返回得分最高的tomNum个结果，结果是有序的，已经按照得分从高到底排序了
     */
    call(start, limit) {
        let startTime = Date.now(), endTime = 0;

        let maxScore = 0;
        let maxScoreChefGroup = new Array(3);
        let chefMasks = this.chefMasks;
        let chefMatchMasks = this.chefMatchMasks;

        let result = {
            maxScore: 0,
            maxScoreChefGroup: maxScoreChefGroup,
            recipes: null
        }

        const recipeCount = this.recipeCount;
        let chefRealIndex = this.chefRealIndex;
        const groupBestScore = this.groupBestScore;
        const groupBestScoreBase = this.groupBestScoreBase;
        const groupMaxScore = this.groupMaxScore;
        const groupMaxScoreChefIndex = this.groupMaxScoreChefIndex;
        const useDynamicTopK = this.enableDynamicTopK && this.ownChefTopK > Math.min(this.baseOwnChefTopK, this.ownChefTopK);
        const baseCandidateSlots = this.baseCandidateSlots;

        const temp = this.playRecipes;
        const groupCount = limit - start;
        if (groupCount <= 0) {
            return result;
        }

       // let playRecipes = new Int32Array(temp.length * 1680);
        let playRecipes = new Uint16Array(groupCount * 1680 * 9);
        for (let i = 0; i < groupCount; i++) {
            const srcGroupIndex = start + i;
            const index = srcGroupIndex * 9;
            for (let k = 0; k < 1680; k++) {
                const ints = this.recipePL[k];
                for (let j = 0; j < 9; j++) {
                    playRecipes[i * 1680 * 9 + k * 9 + j] = temp[index + ints[j]]
                }
            }
        }

        const chefT = this.presenceChefCount + this.ownChefTopK;
        //这一部分应该也可以交给gpu计算
        //可以保存结果每组菜谱的最大分，最后在cpu中计算最大分
        for (let t = 0; t < playRecipes.length; t += 9) {
            //这里等于是根据三个菜谱的id 判断出来三个菜组合得分的索引位置
            const g1 = this.getIndex(playRecipes[t + 0],playRecipes[t + 1],playRecipes[t + 2],recipeCount);
            const g2 = this.getIndex(playRecipes[t + 3],playRecipes[t + 4],playRecipes[t + 5],recipeCount);
            const g3 = this.getIndex(playRecipes[t + 6],playRecipes[t + 7],playRecipes[t + 8],recipeCount);
            const fullUpperBound = groupBestScore[g1] + groupBestScore[g2] + groupBestScore[g3];
            if (fullUpperBound <= maxScore) {
                continue;
            }

            const score1Index = g1 * chefT;
            const score2Index = g2 * chefT;
            const score3Index = g3 * chefT;

            //给每个厨师生成一个条件码，这里判断如果符合条件，则进入光环技能判断流程。
            //比如刘昂星如果有 兰飞鸿的技能，则兰飞鸿必须在场，特殊技能的厨师生成一个特殊的标识，这里做一次匹配

            //有某个厨师重复出现，则便利所有可能

            if (useDynamicTopK) {
                const baseUpperBound = groupBestScoreBase[g1] + groupBestScoreBase[g2] + groupBestScoreBase[g3];
                if (baseUpperBound > maxScore) {
                    for (let i1 = 0; i1 < baseCandidateSlots.length; i1++) {
                        const c1 = baseCandidateSlots[i1];
                        const s1 = groupMaxScore[score1Index + c1];
                        if (s1 === 0 || s1 + groupBestScoreBase[g2] + groupBestScoreBase[g3] <= maxScore) {
                            continue;
                        }
                        for (let i2 = 0; i2 < baseCandidateSlots.length; i2++) {
                            const c2 = baseCandidateSlots[i2];
                            const s2 = groupMaxScore[score2Index + c2];
                            if (s2 === 0) {
                                continue;
                            }
                            const s12 = s1 + s2;
                            if (s12 + groupBestScoreBase[g3] <= maxScore) {
                                continue;
                            }
                            for (let i3 = 0; i3 < baseCandidateSlots.length; i3++) {
                                const c3 = baseCandidateSlots[i3];
                                const s3 = groupMaxScore[score3Index + c3];
                                if (s3 === 0) {
                                    continue;
                                }
                                const score = s12 + s3;
                                if (score <= maxScore) {
                                    continue;
                                }
                                let chef1 = groupMaxScoreChefIndex[score1Index + c1];
                                let chef2 = groupMaxScoreChefIndex[score2Index + c2];
                                let chef3 = groupMaxScoreChefIndex[score3Index + c3];

                                let realChef1 = chefRealIndex[chef1];
                                let realChef2 = chefRealIndex[chef2];
                                let realChef3 = chefRealIndex[chef3];
                                if (realChef1 !== realChef2 && realChef1 !== realChef3 && realChef2 !== realChef3) {
                                    let mm1 = chefMatchMasks[chef1];
                                    let mm2 = chefMatchMasks[chef2];
                                    let mm3 = chefMatchMasks[chef3];
                                    if ((mm1 | mm2 | mm3) !== 0) {
                                        let m1 = chefMasks[chef1];
                                        let m2 = chefMasks[chef2];
                                        let m3 = chefMasks[chef3];
                                        let p1 = mm1 & (m2 | m3);
                                        let p2 = mm2 & (m1 | m3);
                                        let p3 = mm3 & (m1 | m2);
                                        if (p1 !== mm1 || p2 !== mm2 || p3 !== mm3) {
                                            continue;
                                        }
                                    }

                                    maxScore = score;
                                    result.maxScore = maxScore;
                                    result.maxScoreChefGroup = [chef1, chef2, chef3];
                                    result.recipes = playRecipes.slice(t, t + 9);
                                    result.scores = [s1, s2, s3];
                                }
                            }
                        }
                    }
                }
                if (fullUpperBound > maxScore && fullUpperBound > baseUpperBound) {
                    for (let c1 = 0; c1 < chefT; c1++) {
                        const s1 = groupMaxScore[score1Index + c1];
                        if (s1 === 0 || s1 + groupBestScore[g2] + groupBestScore[g3] <= maxScore) {
                            continue;
                        }
                        for (let c2 = 0; c2 < chefT; c2++) {
                            const s2 = groupMaxScore[score2Index + c2];
                            if (s2 === 0) {
                                continue;
                            }
                            const s12 = s1 + s2;
                            if (s12 + groupBestScore[g3] <= maxScore) {
                                continue;
                            }
                            for (let c3 = 0; c3 < chefT; c3++) {
                                const s3 = groupMaxScore[score3Index + c3];
                                if (s3 === 0) {
                                    continue;
                                }
                                const score = s12 + s3;
                                if (score <= maxScore) {
                                    continue;
                                }
                                let chef1 = groupMaxScoreChefIndex[score1Index + c1];
                                let chef2 = groupMaxScoreChefIndex[score2Index + c2];
                                let chef3 = groupMaxScoreChefIndex[score3Index + c3];

                                let realChef1 = chefRealIndex[chef1];
                                let realChef2 = chefRealIndex[chef2];
                                let realChef3 = chefRealIndex[chef3];
                                if (realChef1 !== realChef2 && realChef1 !== realChef3 && realChef2 !== realChef3) {
                                    let mm1 = chefMatchMasks[chef1];
                                    let mm2 = chefMatchMasks[chef2];
                                    let mm3 = chefMatchMasks[chef3];
                                    if ((mm1 | mm2 | mm3) !== 0) {
                                        let m1 = chefMasks[chef1];
                                        let m2 = chefMasks[chef2];
                                        let m3 = chefMasks[chef3];
                                        let p1 = mm1 & (m2 | m3);
                                        let p2 = mm2 & (m1 | m3);
                                        let p3 = mm3 & (m1 | m2);
                                        if (p1 !== mm1 || p2 !== mm2 || p3 !== mm3) {
                                            continue;
                                        }
                                    }

                                    maxScore = score;
                                    result.maxScore = maxScore;
                                    result.maxScoreChefGroup = [chef1, chef2, chef3];
                                    result.recipes = playRecipes.slice(t, t + 9);
                                    result.scores = [s1, s2, s3];
                                }
                            }
                        }
                    }
                }
            } else {
                for (let c1 = 0; c1 < chefT; c1++) {
                    const s1 = groupMaxScore[score1Index + c1];
                    if (s1 === 0 || s1 + groupBestScore[g2] + groupBestScore[g3] <= maxScore) {
                        continue;
                    }
                    for (let c2 = 0; c2 < chefT; c2++) {
                        const s2 = groupMaxScore[score2Index + c2];
                        if (s2 === 0) {
                            continue;
                        }
                        const s12 = s1 + s2;
                        if (s12 + groupBestScore[g3] <= maxScore) {
                            continue;
                        }
                        for (let c3 = 0; c3 < chefT; c3++) {
                            const s3 = groupMaxScore[score3Index + c3];
                            if (s3 === 0) {
                                continue;
                            }
                            const score = s12 + s3;
                            if (score <= maxScore) {
                                continue;
                            }
                            let chef1 = groupMaxScoreChefIndex[score1Index + c1];
                            let chef2 = groupMaxScoreChefIndex[score2Index + c2];
                            let chef3 = groupMaxScoreChefIndex[score3Index + c3];

                            let realChef1 = chefRealIndex[chef1];
                            let realChef2 = chefRealIndex[chef2];
                            let realChef3 = chefRealIndex[chef3];
                            if (realChef1 !== realChef2 && realChef1 !== realChef3 && realChef2 !== realChef3) {
                                let mm1 = chefMatchMasks[chef1];
                                let mm2 = chefMatchMasks[chef2];
                                let mm3 = chefMatchMasks[chef3];
                                if ((mm1 | mm2 | mm3) !== 0) {
                                    let m1 = chefMasks[chef1];
                                    let m2 = chefMasks[chef2];
                                    let m3 = chefMasks[chef3];
                                    let p1 = mm1 & (m2 | m3);
                                    let p2 = mm2 & (m1 | m3);
                                    let p3 = mm3 & (m1 | m2);
                                    if (p1 !== mm1 || p2 !== mm2 || p3 !== mm3) {
                                        continue;
                                    }
                                }

                                maxScore = score;
                                result.maxScore = maxScore;
                                result.maxScoreChefGroup = [chef1, chef2, chef3];
                                result.recipes = playRecipes.slice(t, t + 9);
                                result.scores = [s1, s2, s3];
                            }
                        }
                    }
                }
            }
        }
        //这部分代码能放到gpu执行吗， playRecipes，groupMaxScore，groupMaxScoreChefIndex，chefRealIndex，chefMatchMasks，chefMasks都是  Int32Array,getIndex返回的是正整数

        endTime = Date.now();
        console.info((limit - start) + "组数据计算用时:" + (endTime - startTime) + "ms");

        return result;
    }


    // 将这个新方法添加到您的 ChefAndRecipeThread 类中

    /**
     * `call` 方法的 GPU 加速版本（已修复缓冲区大小和对齐问题）。
     *
     * @param {number} start 菜谱组合的起始索引。
     * @param {number} limit 菜谱组合的结束索引。
     * @returns {Promise<object>} 一个 Promise，它会解析为与原始格式完全相同的结果对象。
     */
    //todo 还有bug
    async callWithGpu(start, limit) {
        console.log("[GPU] callWithGpu 开始执行，范围:", start, "到", limit);
        const startTime = Date.now();

        const numGroups = limit - start;
        if (numGroups <= 0) {
            console.warn("[GPU] 警告: 计算范围为空，直接返回。");
            return { maxScore: 0, maxScoreChefGroup: new Array(3), recipes: null, scores: null };
        }

        // --- 步骤 1: CPU 端数据预处理 (已修正) ---
        // 直接创建 Uint32Array 以匹配 WGSL 中的 u32 类型，并保证4字节对齐
        const recipePermutationCount = this.recipePL.length;
        const numCombinations = numGroups * recipePermutationCount;
        const playRecipes = new Uint32Array(numCombinations * 9);
        const temp = this.playRecipes;
        const recipePL = this.recipePL;
        for (let i = 0; i < numGroups; i++) {
            const groupIndex = start + i;
            const tempBaseIndex = groupIndex * 9;
            const dstGroupBase = i * recipePermutationCount * 9;
            for (let k = 0; k < recipePermutationCount; k++) {
                const dstRecipeBase = dstGroupBase + k * 9;
                const ints = recipePL[k];
                for (let j = 0; j < 9; j++) {
                    // 将 Uint16 的菜谱ID 存入 Uint32 数组
                    playRecipes[dstRecipeBase + j] = temp[tempBaseIndex + ints[j]];
                }
            }
        }
        console.log(`[GPU] 数据预处理完成，创建了 ${numCombinations} 个排列组合 (Uint32Array)。`);

        // --- 步骤 2: WebGPU 初始化 ---
        let device;
        try {
            device = await this.initWebGPU();
        } catch (error) {
            console.error("[GPU] 致命错误: WebGPU设备初始化失败!", error);
            return this.call(start, limit);
        }

        if (!device) {
            console.error("[GPU] 致命错误: WebGPU设备不可用，回退到CPU执行。");
            return this.call(start, limit);
        }
        console.log("[GPU] WebGPU 设备初始化成功。");

        try {
            const chefT = this.presenceChefCount + this.ownChefTopK;

            // --- 创建并写入 GPU 缓冲区 (已修正) ---
            console.log("[GPU] 开始创建和写入GPU缓冲区...");
            // playRecipes 本身就是 Uint32Array，大小正确且对齐
            const playRecipesBuffer = device.createBuffer({ size: playRecipes.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            // 直接写入 playRecipes 的数据
            device.queue.writeBuffer(playRecipesBuffer, 0, playRecipes);

            // ... 其他缓冲区的创建保持不变 ...
            const groupMaxScoreBuffer = device.createBuffer({ size: this.groupMaxScore.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(groupMaxScoreBuffer, 0, this.groupMaxScore);

            const groupMaxScoreChefIndexBuffer = device.createBuffer({ size: this.groupMaxScoreChefIndex.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(groupMaxScoreChefIndexBuffer, 0, this.groupMaxScoreChefIndex);

            const chefRealIndexBuffer = device.createBuffer({ size: this.chefRealIndex.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(chefRealIndexBuffer, 0, this.chefRealIndex);

            const chefMasksBuffer = device.createBuffer({ size: this.chefMasks.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(chefMasksBuffer, 0, this.chefMasks);

            const chefMatchMasksBuffer = device.createBuffer({ size: this.chefMatchMasks.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(chefMatchMasksBuffer, 0, this.chefMatchMasks);

            const resultStructSizeBytes = 7 * 4;
            const outputBufferSize = numCombinations * resultStructSizeBytes;
            const outputBuffer = device.createBuffer({ size: outputBufferSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
            console.log(`[GPU] 缓冲区创建完成，输出缓冲区大小: ${outputBufferSize / 1024} KB`);

            const maxDispatchX = 65535;
            const dispatchX = Math.min(numCombinations, maxDispatchX);
            const dispatchY = Math.ceil(numCombinations / dispatchX);

            // --- WGSL 着色器与管线 (保持不变) ---
            const shaderCode = `
            // ... (此处省略与之前相同的WGSL代码) ...
            fn calI(i: i32, N: i32) -> i32 { let term1 = i * (i - 1) * (i - 3 * N - 2) / 6; let term2 = i * N * (N + 1) / 2; return term1 + term2; }
            fn calJ(i: i32, j: i32, N: i32) -> i32 { let count = j - i; let start = N - i - 2; let end = start - count + 1; return (start + end) * count / 2; }
            fn getIndex(i: u32, j: u32, k: u32, recipeCount: u32) -> u32 { let c1 = calI(i32(i), i32(recipeCount) - 2); let c2 = calJ(i32(i), i32(j) - 1, i32(recipeCount)); let c3 = k - j - 1; return u32(c1 + c2 + i32(c3)); }
            struct WorkgroupResult { maxScore: atomic<i32>, chef1: atomic<i32>, chef2: atomic<i32>, chef3: atomic<i32>, score1: atomic<i32>, score2: atomic<i32>, score3: atomic<i32>, };
            struct FinalResult { score: i32, chef1: i32, chef2: i32, chef3: i32, score1: i32, score2: i32, score3: i32, };
            @group(0) @binding(0) var<storage, read> playRecipes: array<u32>; @group(0) @binding(1) var<storage, read> groupMaxScore: array<i32>; @group(0) @binding(2) var<storage, read> groupMaxScoreChefIndex: array<i32>; @group(0) @binding(3) var<storage, read> chefRealIndex: array<i32>; @group(0) @binding(4) var<storage, read> chefMasks: array<i32>; @group(0) @binding(5) var<storage, read> chefMatchMasks: array<i32>; @group(0) @binding(6) var<storage, read_write> output: array<FinalResult>;
            var<workgroup> localBest: WorkgroupResult;
            @compute @workgroup_size(256)
            fn main(@builtin(local_invocation_id) local_id: vec3<u32>, @builtin(workgroup_id) workgroup_id: vec3<u32>) {
                let recipeCount: u32 = ${this.recipeCount}; let chefT: u32 = ${chefT}; let numCombinations: u32 = ${numCombinations}; let workgroupSize: u32 = 256;
                let combinationIndex = workgroup_id.x + workgroup_id.y * ${dispatchX}u; if (combinationIndex >= numCombinations) { return; }
                if (local_id.x == 0u) { atomicStore(&localBest.maxScore, 0); atomicStore(&localBest.chef1, 0); atomicStore(&localBest.chef2, 0); atomicStore(&localBest.chef3, 0); atomicStore(&localBest.score1, 0); atomicStore(&localBest.score2, 0); atomicStore(&localBest.score3, 0); }
                workgroupBarrier();
                let recipeBaseIndex = combinationIndex * 9u;
                let r1 = playRecipes[recipeBaseIndex + 0u]; let r2 = playRecipes[recipeBaseIndex + 1u]; let r3 = playRecipes[recipeBaseIndex + 2u];
                let r4 = playRecipes[recipeBaseIndex + 3u]; let r5 = playRecipes[recipeBaseIndex + 4u]; let r6 = playRecipes[recipeBaseIndex + 5u];
                let r7 = playRecipes[recipeBaseIndex + 6u]; let r8 = playRecipes[recipeBaseIndex + 7u]; let r9 = playRecipes[recipeBaseIndex + 8u];
                let score1GroupIdx = getIndex(r1, r2, r3, recipeCount) * chefT; let score2GroupIdx = getIndex(r4, r5, r6, recipeCount) * chefT; let score3GroupIdx = getIndex(r7, r8, r9, recipeCount) * chefT;
                let totalIterations = chefT * chefT * chefT;
                for (var i = local_id.x; i < totalIterations; i = i + workgroupSize) {
                    let c1 = i % chefT; let c2 = (i / chefT) % chefT; let c3 = i / (chefT * chefT);
                    let score1 = groupMaxScore[score1GroupIdx + c1]; let score2 = groupMaxScore[score2GroupIdx + c2]; let score3 = groupMaxScore[score3GroupIdx + c3];
                    let currentScore = score1 + score2 + score3;
                    if (currentScore <= atomicLoad(&localBest.maxScore)) { continue; }
                    let chef1_idx = groupMaxScoreChefIndex[score1GroupIdx + c1]; let chef2_idx = groupMaxScoreChefIndex[score2GroupIdx + c2]; let chef3_idx = groupMaxScoreChefIndex[score3GroupIdx + c3];
                    let realChef1 = chefRealIndex[chef1_idx]; let realChef2 = chefRealIndex[chef2_idx]; let realChef3 = chefRealIndex[chef3_idx];
                    if (realChef1 != realChef2 && realChef1 != realChef3 && realChef2 != realChef3) {
                        let mm1 = chefMatchMasks[chef1_idx]; let mm2 = chefMatchMasks[chef2_idx]; let mm3 = chefMatchMasks[chef3_idx];
                        if ((mm1 | mm2 | mm3) != 0) {
                            let m1 = chefMasks[chef1_idx]; let m2 = chefMasks[chef2_idx]; let m3 = chefMasks[chef3_idx];
                            let p1 = mm1 & (m2 | m3); let p2 = mm2 & (m1 | m3); let p3 = mm3 & (m1 | m2);
                            if (p1 != mm1 || p2 != mm2 || p3 != mm3) { continue; }
                        }
                        let oldMax = atomicMax(&localBest.maxScore, currentScore);
                        if (currentScore > oldMax) { atomicStore(&localBest.chef1, chef1_idx); atomicStore(&localBest.chef2, chef2_idx); atomicStore(&localBest.chef3, chef3_idx); atomicStore(&localBest.score1, score1); atomicStore(&localBest.score2, score2); atomicStore(&localBest.score3, score3); }
                    }
                }
                workgroupBarrier();
                if (local_id.x == 0u) {
                    let finalScore = atomicLoad(&localBest.maxScore);
                    if (finalScore > 0) {
                        let finalChef1 = atomicLoad(&localBest.chef1); let finalChef2 = atomicLoad(&localBest.chef2); let finalChef3 = atomicLoad(&localBest.chef3);
                        output[combinationIndex].score = finalScore; output[combinationIndex].chef1 = finalChef1; output[combinationIndex].chef2 = finalChef2; output[combinationIndex].chef3 = finalChef3;
                        output[combinationIndex].score1 = atomicLoad(&localBest.score1); output[combinationIndex].score2 = atomicLoad(&localBest.score2); output[combinationIndex].score3 = atomicLoad(&localBest.score3);
                    }
                }
            }`;

            // ... 后续代码保持不变 ...
            let shaderModule, pipeline;
            try {
                console.log("[GPU] 正在编译WGSL着色器...");
                shaderModule = device.createShaderModule({ code: shaderCode });
                console.log("[GPU] 着色器编译成功。正在创建计算管线...");
                pipeline = await device.createComputePipelineAsync({ layout: "auto", compute: { module: shaderModule, entryPoint: "main" } });
                console.log("[GPU] 计算管线创建成功。");
            } catch (e) {
                console.error("[GPU] 致命错误: WGSL编译或管线创建失败!", e);
                throw e;
            }

            const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
                    { binding: 0, resource: { buffer: playRecipesBuffer } }, { binding: 1, resource: { buffer: groupMaxScoreBuffer } },
                    { binding: 2, resource: { buffer: groupMaxScoreChefIndexBuffer } }, { binding: 3, resource: { buffer: chefRealIndexBuffer } },
                    { binding: 4, resource: { buffer: chefMasksBuffer } }, { binding: 5, resource: { buffer: chefMatchMasksBuffer } },
                    { binding: 6, resource: { buffer: outputBuffer } }
                ]});

            console.log("[GPU] 正在提交计算任务...");
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.dispatchWorkgroups(dispatchX, dispatchY, 1);
            passEncoder.end();

            const readbackBuffer = device.createBuffer({ size: outputBufferSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
            commandEncoder.copyBufferToBuffer(outputBuffer, 0, readbackBuffer, 0, outputBufferSize);
            device.queue.submit([commandEncoder.finish()]);
            console.log("[GPU] 计算任务已提交，等待GPU执行完成...");

            await readbackBuffer.mapAsync(GPUMapMode.READ);
            console.log("[GPU] GPU执行完成，结果已成功映射到CPU内存。");

            const gpuResults = new Int32Array(readbackBuffer.getMappedRange().slice());
            readbackBuffer.unmap();

            console.log("[GPU] 正在CPU端进行最终结果规约...");
            let maxScore = 0;
            let bestCombinationIndex = -1;
            for (let i = 0; i < numCombinations; i++) {
                const score = gpuResults[i * 7];
                if (score > maxScore) {
                    maxScore = score;
                    bestCombinationIndex = i;
                }
            }

            let finalResult;
            if (bestCombinationIndex !== -1) {
                const resultBaseIndex = bestCombinationIndex * 7;
                finalResult = {
                    maxScore: gpuResults[resultBaseIndex],
                    maxScoreChefGroup: [gpuResults[resultBaseIndex + 1], gpuResults[resultBaseIndex + 2], gpuResults[resultBaseIndex + 3]],
                    // 在返回结果时，需要从 Uint32Array 转回 Uint16Array 或常规数组
                    recipes: new Uint16Array(playRecipes.slice(bestCombinationIndex * 9, bestCombinationIndex * 9 + 9)),
                    scores: [gpuResults[resultBaseIndex + 4], gpuResults[resultBaseIndex + 5], gpuResults[resultBaseIndex + 6]]
                };
                console.log(`[GPU] 找到最优解！最高分: ${finalResult.maxScore}`);
            } else {
                finalResult = { maxScore: 0, maxScoreChefGroup: new Array(3), recipes: null, scores:null };
                console.warn("[GPU] 警告: GPU计算完成，但未找到任何得分大于0的组合。");
            }

            console.log("[GPU] 清理GPU资源...");
            playRecipesBuffer.destroy(); groupMaxScoreBuffer.destroy(); groupMaxScoreChefIndexBuffer.destroy();
            chefRealIndexBuffer.destroy(); chefMasksBuffer.destroy(); chefMatchMasksBuffer.destroy();
            outputBuffer.destroy(); readbackBuffer.destroy();

            const endTime = Date.now();
            console.info(`[GPU] 完整流程结束，总用时: ${endTime - startTime}ms`);
            return finalResult;

        } catch (e) {
            console.error("[GPU] 捕获到GPU执行期间的致命错误!", e);
            console.log("[GPU] 因发生错误，正在回退到CPU版本执行...");
            return this.call(start, limit);
        } finally {
            if (device) {
                device.destroy();
                console.log("[GPU] 设备已销毁。");
            }
        }
    }

    calAllCache(scoreCache, recipeCount, totalChefCount, ownChefCount, ownPresenceChefCount, chefEquipCount, ownChefTopK = 3) {
        let maxIndex = this.calI(recipeCount - 2, recipeCount - 2);
        console.log(maxIndex,recipeCount*recipeCount*recipeCount)
        const queueDeep = ownChefTopK + ownPresenceChefCount;
        const groupMaxScore = new Int32Array(maxIndex * queueDeep);
        const groupMaxScoreChefIndex = new Int32Array(maxIndex * queueDeep)

        console.time("计算每三道菜最高得分的厨师")

        let index = 0;
        if (ownChefTopK === 3) {
            for (let i = 0; i < recipeCount; i++) {
                for (let j = i + 1; j < recipeCount; j++) {
                    for (let k = j + 1; k < recipeCount; k++) {
                        index = this.getIndex(i,j,k,recipeCount);
                        index = index * queueDeep;
                        //每一组菜谱组合，计算得分最高的3个厨师
                        let a = 0, b = 0, c = 0, ai = 0, bi = 0, ci = 0;
                        let tAdd = 0;

                        for (let r = 0; r < ownChefCount; r++) {
                            let equipCount = chefEquipCount[r];
                            let start = tAdd, end = tAdd + equipCount + 1;
                            let maxNum = 0;
                            let maxT = 0;
                            //计算同一个厨师带不同的厨具时候，做这三个菜谱的最大分
                            for (let t = start; t < end; t++) {
                                if (!(scoreCache[t * recipeCount + i] === 0 || scoreCache[t * recipeCount + j] === 0 || scoreCache[t * recipeCount + k] === 0)) {
                                    const num = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                    if (num > maxNum) {
                                        maxNum = num;
                                        maxT = t;
                                    }
                                }
                            }
                            tAdd = end;

                            if (maxNum > a) {
                                c = b;
                                ci = bi;
                                b = a;
                                bi = ai;
                                a = maxNum;
                                ai = maxT;
                            } else if (maxNum > b) {
                                c = b;
                                ci = bi;
                                b = maxNum;
                                bi = maxT;
                            } else if (maxNum > c) {
                                c = maxNum;
                                ci = maxT;
                            }
                        }
                        groupMaxScoreChefIndex[index] = ai;
                        groupMaxScoreChefIndex[index + 1] = bi;
                        groupMaxScoreChefIndex[index + 2] = ci;

                        groupMaxScore[index] = a
                        groupMaxScore[index + 1] = b
                        groupMaxScore[index + 2] = c

                        //遍历在场生效厨师 ，生产对应结果
                        for (let r1 = 0; r1 < ownPresenceChefCount; r1++) {
                            let r = r1 + ownChefCount;
                            let equipCount = chefEquipCount[r];
                            let start = tAdd, end = tAdd + equipCount + 1;
                            let maxNum = 0;
                            let maxT = 0;
                            //计算同一个厨师带不同的厨具时候，做这三个菜谱的最大分
                            for (let t = start; t < end; t++) {
                                if (!(scoreCache[t * recipeCount + i] === 0 || scoreCache[t * recipeCount + j] === 0 || scoreCache[t * recipeCount + k] === 0)) {
                                    const num = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                    if (num > maxNum) {
                                        maxNum = num;
                                        maxT = t;
                                    }
                                }
                            }
                            tAdd = end;
                            let chefScoreIndex = index + ownChefTopK + r1;
                            groupMaxScoreChefIndex[chefScoreIndex] = maxT;
                            groupMaxScore[chefScoreIndex] = maxNum
                        }
                    }
                }
                postMessage({type: 'p', p: index / (maxIndex * queueDeep)})
            }
        } else {
            const bestScores = new Int32Array(ownChefTopK);
            const bestIndices = new Int32Array(ownChefTopK);
            for (let i = 0; i < recipeCount; i++) {
                for (let j = i + 1; j < recipeCount; j++) {
                    for (let k = j + 1; k < recipeCount; k++) {
                        index = this.getIndex(i,j,k,recipeCount);
                        index = index * queueDeep;
                        bestScores.fill(0);
                        bestIndices.fill(0);
                        let tAdd = 0;

                        for (let r = 0; r < ownChefCount; r++) {
                            let equipCount = chefEquipCount[r];
                            let start = tAdd, end = tAdd + equipCount + 1;
                            let maxNum = 0;
                            let maxT = 0;
                            for (let t = start; t < end; t++) {
                                if (!(scoreCache[t * recipeCount + i] === 0 || scoreCache[t * recipeCount + j] === 0 || scoreCache[t * recipeCount + k] === 0)) {
                                    const num = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                    if (num > maxNum) {
                                        maxNum = num;
                                        maxT = t;
                                    }
                                }
                            }
                            tAdd = end;

                            if (maxNum > bestScores[ownChefTopK - 1]) {
                                for (let p = 0; p < ownChefTopK; p++) {
                                    if (maxNum > bestScores[p]) {
                                        for (let shift = ownChefTopK - 1; shift > p; shift--) {
                                            bestScores[shift] = bestScores[shift - 1];
                                            bestIndices[shift] = bestIndices[shift - 1];
                                        }
                                        bestScores[p] = maxNum;
                                        bestIndices[p] = maxT;
                                        break;
                                    }
                                }
                            }
                        }

                        for (let p = 0; p < ownChefTopK; p++) {
                            groupMaxScore[index + p] = bestScores[p];
                            groupMaxScoreChefIndex[index + p] = bestIndices[p];
                        }

                        for (let r1 = 0; r1 < ownPresenceChefCount; r1++) {
                            let r = r1 + ownChefCount;
                            let equipCount = chefEquipCount[r];
                            let start = tAdd, end = tAdd + equipCount + 1;
                            let maxNum = 0;
                            let maxT = 0;
                            for (let t = start; t < end; t++) {
                                if (!(scoreCache[t * recipeCount + i] === 0 || scoreCache[t * recipeCount + j] === 0 || scoreCache[t * recipeCount + k] === 0)) {
                                    const num = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                    if (num > maxNum) {
                                        maxNum = num;
                                        maxT = t;
                                    }
                                }
                            }
                            tAdd = end;
                            let chefScoreIndex = index + ownChefTopK + r1;
                            groupMaxScoreChefIndex[chefScoreIndex] = maxT;
                            groupMaxScore[chefScoreIndex] = maxNum
                        }
                    }
                }
                postMessage({type: 'p', p: index / (maxIndex * queueDeep)})
            }
        }

        console.timeEnd("计算每三道菜最高得分的厨师")
        return {
            groupMaxScore, groupMaxScoreChefIndex
        }
    }

    async  initWebGPU() {
        console.log("执行initWebGPU")

        if (!navigator.gpu) {
            console.log("WebGPU not supported")
            throw new Error("WebGPU not supported");
        }
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice({
            requiredLimits: {
                maxBufferSize:2147483644,
                maxStorageBufferBindingSize: 2147483644 // 或adapter.limits.maxStorageBufferBindingSize
            }
        });
        console.log("gpuDevice",device)
        return device;
    }

    async  computeWithWebGPU(
        scoreCache, recipeCount, totalChefCount, ownChefCount, ownPresenceChefCount, chefEquipCount, ownChefTopK = 3
    ) {
        //console.log("执行computeWithWebGPU")
        const device = await this.initWebGPU();
        try {
            // 创建输出缓冲区
            const maxIndex =  this.calI(recipeCount - 2, recipeCount - 2);
            const queueDeep = ownChefTopK + ownPresenceChefCount;
            const outputSize = maxIndex * queueDeep * 4; // Int32Array 的字节大小

            let totalByteCount = outputSize + outputSize;
            console.log("预估显存占用",totalByteCount / 1024.0 / 1024.0 / 1024.0)
            //预估显存使用量，如果显存不够分批次计算

            // 创建输入缓冲区
            const scoreCacheBuffer = device.createBuffer({
                size: scoreCache.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,

            });
            device.queue.writeBuffer(scoreCacheBuffer, 0, scoreCache);


            const chefEquipCountBuffer = device.createBuffer({
                size: chefEquipCount.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,

            });

            device.queue.writeBuffer(chefEquipCountBuffer, 0, chefEquipCount);


            // 创建 uniform 缓冲区存储参数
            const params = new Uint32Array([
                recipeCount, totalChefCount, ownChefCount, ownPresenceChefCount
            ]);
            const paramsBuffer = device.createBuffer({
                size: params.byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,

            });
            // new Uint32Array(paramsBuffer.getMappedRange()).set(params);
            // paramsBuffer.unmap();
            device.queue.writeBuffer(paramsBuffer, 0, params);



            const groupMaxScoreBuffer = device.createBuffer({
                size: outputSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });
            //这里是否可以用2字节
            const groupMaxScoreChefIndexBuffer = device.createBuffer({
                size: outputSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });


            // 创建着色器模块
            const shaderModule = device.createShaderModule({
                code: ` @group(0) @binding(0) var<storage, read> scoreCache: array<i32>;
                @group(0) @binding(1) var<storage, read> chefEquipCount: array<i32>;
                @group(0) @binding(2) var<storage, read_write> groupMaxScore: array<i32>;
                @group(0) @binding(3) var<storage, read_write> groupMaxScoreChefIndex: array<i32>;
         
         fn calI(i: i32, N: i32) -> i32 {
            let i_f32 = i;
            let N_f32 = N;
            let term1 = i_f32 * (i_f32 - 1) * (i_f32 - 3 * N_f32 - 2) / 6;
            let term2 = i_f32 * N_f32 * (N_f32 + 1) / 2;
            return term1 + term2;
        }

// Function to calculate calJ (translated from JS)
fn calJ(i: i32, j: i32, N: i32) -> i32 {
    let count = j - i;
    let start = N - i - 2;
    let end = start - count + 1;
    return (start + end) * count / 2;
}

// Function to calculate getIndex (translated from JS)
        fn getIndex(i: i32, j: i32, k: i32, recipeCount: i32) -> i32 {
            let c1 = calI(i, recipeCount - 2);
            let c2 = calJ(i, j - 1, recipeCount);
            let c3 = k - j - 1;
            return c1 + c2 + c3;
        }
                
                @compute @workgroup_size(256)
                fn main(@builtin(global_invocation_id) globalIndex: vec3<u32>) {
                            let recipeCount : i32 = ${recipeCount};
                           let totalChefCount : i32 = ${totalChefCount};
                           let ownChefCount : i32= ${ownChefCount};
                           let ownPresenceChefCount : i32= ${ownPresenceChefCount};
                           let ownChefTopK : i32 = ${ownChefTopK};
                             let queueDeep : i32 = ${(ownChefTopK + ownPresenceChefCount)};
                             
                    //let maxIndex: i32 = recipeCount * recipeCount * recipeCount;
                     let maxIndex: i32 = ${recipeCount * recipeCount * recipeCount};
                    let r2: i32 = recipeCount * recipeCount;
                
                    // Compute rawIndex using x, y, z dimensions
                    let rawIndex: i32 = i32(globalIndex.x + globalIndex.y * 65535u * 256u + globalIndex.z * 65535u * 256u * 4u);
                
                    if (rawIndex >= maxIndex) {
                        return;
                    }
                
                    let i: i32 = rawIndex / r2;
                    let j: i32 = (rawIndex % r2) / recipeCount;
                    let k: i32 = rawIndex % recipeCount;
                
                    if (i >= j || j >= k) {
                        return;
                    }
                    
                    let index = getIndex(i,j,k,recipeCount) * queueDeep;
                    var bestScores: array<i32, ${ownChefTopK}>;
                    var bestIndices: array<i32, ${ownChefTopK}>;
                    for (var p: i32 = 0; p < ownChefTopK; p++) {
                        bestScores[p] = 0;
                        bestIndices[p] = 0;
                    }

                    var tAdd: i32 = 0;

                    for (var r: i32 = 0; r < ownChefCount; r++) {
                        var equipCount: i32 = chefEquipCount[r];
                        var start: i32 = tAdd;
                        var end: i32 = tAdd + equipCount + 1;
                        var maxNum: i32 = 0;
                        var maxT: i32 = 0;

                        for (var t: i32 = start; t < end; t++) {
                            if (!(scoreCache[t * recipeCount + i] == 0 || scoreCache[t * recipeCount + j] == 0 || scoreCache[t * recipeCount + k] == 0)) {
                                let num : i32 = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                if (num > maxNum) {
                                    maxNum = num;
                                    maxT = t;
                                }
                            }
                        }
                        tAdd = end;

                        if (maxNum > bestScores[ownChefTopK - 1]) {
                            for (var p: i32 = 0; p < ownChefTopK; p++) {
                                if (maxNum > bestScores[p]) {
                                    for (var shift: i32 = ownChefTopK - 1; shift > p; shift--) {
                                        bestScores[shift] = bestScores[shift - 1];
                                        bestIndices[shift] = bestIndices[shift - 1];
                                    }
                                    bestScores[p] = maxNum;
                                    bestIndices[p] = maxT;
                                    break;
                                }
                            }
                        }
                    }

                    for (var p: i32 = 0; p < ownChefTopK; p++) {
                        groupMaxScoreChefIndex[index + p] = bestIndices[p];
                        groupMaxScore[index + p] = bestScores[p];
                    }

                    for (var r1: i32 = 0; r1 < ownPresenceChefCount; r1++) {
                        var r : i32= r1 + ownChefCount;
                        var equipCount: i32 = chefEquipCount[r];
                        var start: i32 = tAdd;
                        var end: i32 = tAdd + equipCount + 1;
                        var maxNum: i32 = 0;
                        var maxT: i32 = 0;

                        for (var t: i32 = start; t < end; t++) {
                            if (!(scoreCache[t * recipeCount + i] == 0 || scoreCache[t * recipeCount + j] == 0 || scoreCache[t * recipeCount + k] == 0)) {
                                let num = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                if (num > maxNum) {
                                    maxNum = num;
                                    maxT = t;
                                }
                            }
                        }
                        tAdd = end;

                        let chefScoreIndex : i32 = index + ownChefTopK + r1;
                        groupMaxScoreChefIndex[chefScoreIndex] = maxT;
                        groupMaxScore[chefScoreIndex] = maxNum;
                    }
                }

`
            });

            // 创建计算管线
            const computePipeline = device.createComputePipeline({
                layout: "auto",
                compute: {
                    module: shaderModule,
                    entryPoint: "main"
                }
            });

            // 创建绑定组
            const bindGroup = device.createBindGroup({
                layout: computePipeline.getBindGroupLayout(0),
                entries: [
                    {binding: 0, resource: {buffer: scoreCacheBuffer}},
                    {binding: 1, resource: {buffer: chefEquipCountBuffer}},
                    {binding: 2, resource: {buffer: groupMaxScoreBuffer}},
                    {binding: 3, resource: {buffer: groupMaxScoreChefIndexBuffer}}

                ]
            });

            // 计算 dispatch 大小

            // Calculate total threads based on shader logic
            const totalThreads = recipeCount ** 3;
            const workgroupSize = 256;
            const totalWorkgroups = Math.ceil(totalThreads / workgroupSize);
            const maxWorkgroupsPerDimension = 65535;

// Distribute workgroups across x and y dimensions
            let dispatchX = Math.min(totalWorkgroups, maxWorkgroupsPerDimension);
            let dispatchY = Math.ceil(totalWorkgroups / dispatchX);



            // 提交计算任务
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.dispatchWorkgroups(dispatchX, dispatchY);
            passEncoder.end();

            // 读取结果
            const resultBuffer1 = device.createBuffer({
                size: outputSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            const resultBuffer2 = device.createBuffer({
                size: outputSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });

            commandEncoder.copyBufferToBuffer(groupMaxScoreBuffer, 0, resultBuffer1, 0, outputSize);
            commandEncoder.copyBufferToBuffer(groupMaxScoreChefIndexBuffer, 0, resultBuffer2, 0, outputSize);
            // commandEncoder.copyBufferToBuffer(testData, 0, resultBuffer3, 0, outputSize);
            device.queue.submit([commandEncoder.finish()]);

            await resultBuffer1.mapAsync(GPUMapMode.READ);
            await resultBuffer2.mapAsync(GPUMapMode.READ);
            //  await resultBuffer3.mapAsync(GPUMapMode.READ);
            const groupMaxScore = new Int32Array(resultBuffer1.getMappedRange().slice());
            const groupMaxScoreChefIndex = new Int32Array(resultBuffer2.getMappedRange().slice());
            //const testDataResult = new Int32Array(resultBuffer3.getMappedRange().slice());
            resultBuffer1.unmap();
            resultBuffer2.unmap();


            //TODO 释放内存
            resultBuffer1.destroy();
            resultBuffer2.destroy();
            groupMaxScoreBuffer.destroy();
            groupMaxScoreChefIndexBuffer.destroy();
            paramsBuffer.destroy();
            chefEquipCountBuffer.destroy();
            scoreCacheBuffer.destroy();

            return {groupMaxScore, groupMaxScoreChefIndex};
        }finally {
            device.destroy();
        }


    }

     getIndex(i, j,k, recipeCount) {
        let c1 = this.calI(i, recipeCount - 2); // calI后边改成查表
        let c2 = this.calJ(i, j - 1, recipeCount); //这里计算
        let c3 = k - j - 1;
        return c1+c2+c3;
    }

     calI(i, N) {
        // Using regular numbers (JavaScript doesn't have a strict int type)
        // Division by integers like 6 and 2 will still work as expected
        const term1 = i * (i - 1) * (i - 3 * N - 2) / 6;
        const term2 = i * N * (N + 1) / 2;
        return term1 + term2;
    }

     calJ(i, j, N) {
        const count = j - i;
        const start = N - i - 2;
        const end = start - count + 1;
        return (start + end) * count / 2;
    }
}




//let chefAndRecipeThread = new ChefAndRecipeThread();
