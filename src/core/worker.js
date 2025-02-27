let inited = false;

self.onmessage = async (e) => {
    let data = e.data;

    await chefAndRecipeThread.setBaseData(data.data);


    let result = chefAndRecipeThread.call(data.start, data.limit);
    console.log(result)
    self.postMessage({type: 'r', result: result});

};


class ChefAndRecipeThread {

    constructor() {
        this.playRecipes = null;
        this.start = 0;
        this.groupMaxScore = null;
        this.groupMaxScoreChefIndex = null;
        this.chefRealIndex = null;
        this.recipeCount = 0;

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
                          chefRealIndex
                      }) {
        this.playRecipes = playRecipesArr;

        this.recipePL = recipePL
        let  i=3,j = 7,k = 8;

        /**
         *
         *  1 2 3-100   98
         *  1 3 4-100   97
         *  1 4 5-100   96
         *
         *
         *  1 96  97-100 5
         *  1 97  97-100 3
         *  1 98  97-100 2
         *  1 99  100-100 1
         *
         *  第一个数是1时的，总数为 1+2+3+4+5+ ... 96+97+98
         *
         *  2 3 4-100     97
         *  2 4 5-100     96
         *  2 98 99-100   2
         *  2 99 100-100  1
         *
         *  第一个数是2时的，总数为 1+2+3+4+5+ ... 96+97
         *
         *  1+2+3+4+5+ ... 96+97+98
         *  1+2+3+4+5+ ... 96+97
         *  1+2+3+4+5+ ... 96
         *  1+2+3+4+5+ ... 68
         *
         * i=1 fun =  (1+2+3+4+5+ ... 96+97+98)
         * i=2 fun =  (1+2+3+4+5+ ... 96+97+98 ) + (1+2+3+4+5+ ... 96+97)
         * i=3 fun =  (1+2+3+4+5+ ... 96+97+98 ) + (1+2+3+4+5+ ... 96+97)+ (1+2+3+4+5+ ... 96)
         * i=4 fun =  (1+2+3+4+5+ ... 96+97+98 ) + (1+2+3+4+5+ ... 96+97)+ (1+2+3+4+5+ ... 96)+ (1+2+3+4+5+ ... 95)
         *
         *
         *  i = 32,j=45,k=47
         *
         *  96 97 98-100   3
         *  96 98 99-100   2
         *  96 99 100-100  1
         *
         *  第一个数是96时的，总数为 1+2+3
         *
         *
         *  97 98 99-100   2
         *  98 99 100-100  1
         *
         *  第一个数是97时的，总数为 1+2
         *
         *  98 99 100-100  1
         *
         *  第一个数是98时的，总数为 1
         *
         *
         *
         *
         * 51  52  53-100  48
         *     53  54-100  47
         *     54  55-100  46
         *
         *
         * 55  56  57-100  44
         *     57  58-100  43
         *     58  59-100  42
         *
         *
         *
         * 定位索引
         * */



         // let result2 = this.calAllCache(scoreCache, recipeCount
         //     , playChefCount + playPresenceChefCount, ownChefCount, presenceChefCount, chefEquipCount);

        // console.log(calAllCache1.groupMaxScoreChefIndex)

        console.time('计算每三道菜最高得分的厨师')
        let result2 = await computeWithWebGPU(scoreCache, recipeCount
            , playChefCount + playPresenceChefCount, ownChefCount, presenceChefCount, chefEquipCount);
        console.timeEnd('计算每三道菜最高得分的厨师')

        //验证结果
        // for (let i = 0; i < result2.groupMaxScore.length; i++) {
        //     if (result2.groupMaxScore[i]!==result2.groupMaxScore[i]){
        //         console.log("结果不正确")
        //     }
        // }
        //
        // for (let i = 0; i < result2.groupMaxScore.length; i++) {
        //     if (result2.groupMaxScoreChefIndex[i]!==result2.groupMaxScoreChefIndex[i]){
        //         console.log("结果不正确")
        //     }
        // }

        //  console.log(result2.groupMaxScoreChefIndex)

        this.groupMaxScore = result2.groupMaxScore
        this.groupMaxScoreChefIndex = result2.groupMaxScoreChefIndex
        this.chefRealIndex = chefRealIndex

        this.recipeCount = recipeCount;
        this.chefMasks = chefMasks;
        this.chefMatchMasks = chefMatchMasks;
        this.presenceChefCount = presenceChefCount;
        //console.log(calAllCache1)

    }


    /**
     * @return {} 返回得分最高的tomNum个结果，结果是有序的，已经按照得分从高到底排序了
     */
    call(start, limit) {
        let startTime = Date.now(), endTime = 0;

        let maxScore = 0, maxKey = 0;
        let score1Index, score2Index, score3Index;
        let maxScoreChefGroup = new Array(3), maxI, maxK;
        let chefMasks = this.chefMasks;
        let chefMatchMasks = this.chefMatchMasks;

        let result = {
            maxScore: 0,
            maxScoreChefGroup: maxScoreChefGroup,
            recipes: null
        }

        const recipeCount = this.recipeCount;
        let chefRealIndex = this.chefRealIndex;

        const temp = this.playRecipes;
        const chefT = this.presenceChefCount + 3;
        let playRecipes = new Int32Array(temp.length * 1680);
        for (let i = start; i < limit; i++) {
            const index = i * 9;
            for (let k = 0; k < 1680; k++) {
                const ints = this.recipePL[k];
                for (let j = 0; j < 9; j++) {
                    playRecipes[i * 1680 * 9 + k * 9 + j] = temp[index + ints[j]]
                }
            }
        }

        const r2 = recipeCount * recipeCount;
        for (let t = 0; t < playRecipes.length; t += 9) {
            //这里等于是根据三个菜谱的id 判断出来三个菜组合得分的索引位置


            score1Index = getIndex(playRecipes[t + 0],playRecipes[t + 1],playRecipes[t + 2],recipeCount);
            score2Index = getIndex(playRecipes[t + 3],playRecipes[t + 4],playRecipes[t + 5],recipeCount);
            score3Index = getIndex(playRecipes[t + 6],playRecipes[t + 7],playRecipes[t + 8],recipeCount);


            // score1Index = playRecipes[t + 0] * r2 + playRecipes[t + 1] * recipeCount + playRecipes[t + 2];
            // score2Index = playRecipes[t + 3] * r2 + playRecipes[t + 4] * recipeCount + playRecipes[t + 5];
            // score3Index = playRecipes[t + 6] * r2 + playRecipes[t + 7] * recipeCount + playRecipes[t + 8];

            score1Index = score1Index * chefT;
            score2Index = score2Index * chefT;
            score3Index = score3Index * chefT;

            //给每个厨师生成一个条件码，这里判断如果符合条件，则进入光环技能判断流程。
            //比如刘昂星如果有 兰飞鸿的技能，则兰飞鸿必须在场，特殊技能的厨师生成一个特殊的标识，这里做一次匹配

            //有某个厨师重复出现，则便利所有可能

            for (let c1 = 0; c1 < chefT; c1++) {
                for (let c2 = 0; c2 < chefT; c2++) {
                    for (let c3 = 0; c3 < chefT; c3++) {
                        let score = this.groupMaxScore[score1Index + c1] + this.groupMaxScore[score2Index + c2] + this.groupMaxScore[score3Index + c3];
                        if (score > maxScore) {
                            //如果最大分数冲突，则遍历所有确定最大分
                            let chef1 = this.groupMaxScoreChefIndex[score1Index + c1]
                            let chef2 = this.groupMaxScoreChefIndex[score2Index + c2]
                            let chef3 = this.groupMaxScoreChefIndex[score3Index + c3]

                            let realChef1 = chefRealIndex[chef1];
                            let realChef2 = chefRealIndex[chef2];
                            let realChef3 = chefRealIndex[chef3];

                            if (realChef1 !== realChef2 && realChef1 !== realChef3 && realChef2 !== realChef3) {

                                //特征比较
                                let mm1 = chefMatchMasks[realChef1];
                                let mm2 = chefMatchMasks[realChef2];
                                let mm3 = chefMatchMasks[realChef3];
                                if ((mm1 | mm2 | mm3) !== 0) {
                                    //有特殊要求，需要具体计算
                                    let m1 = chefMasks[realChef1];
                                    let m2 = chefMasks[realChef2];
                                    let m3 = chefMasks[realChef3];
                                    let p1 = mm1 & (m2 | m3)
                                    let p2 = mm2 & (m1 | m3)
                                    let p3 = mm3 & (m1 | m2)

                                    if (p1 !== mm1 || p2 !== mm2 || p3 !== mm2) {
                                        // console.log("忽略结果")
                                        continue
                                    }
                                    //console.log("符合结果")
                                }
                               // console.log(chef1, chef2, chef3)
                               // console.log(realChef1, realChef2, realChef3)

                                maxScore = score;
                                result.maxScore = maxScore;
                                result.maxScoreChefGroup = [chef1, chef2, chef3];
                                result.recipes = playRecipes.slice(t, t + 9);
                            }
                        }
                    }
                }
            }

            /**
             * 特征用bigint保存
             * 比如无光环技能的值未0b1
             * 有兰飞鸿技能的未0b01;
             * 有南飞技能的为 0b10;
             * 同时有兰飞鸿和南飞的为 0b11;
             * 厨师b和c的特征做与运算 结果为 p1
             * p1和 0b11做与运算，如果结果不为0b11则认为不满足条件，不往下继续进行。
             *
             * 厨师在场就生效的
             * 厨师不仅要在场，还要满足其他条件的，
             * */
        }

        endTime = Date.now();
        console.info((limit - start) + "组数据计算用时:" + (endTime - startTime) + "ms");

        return result;
    }

    calAllCache(scoreCache, recipeCount, totalChefCount, ownChefCount, ownPresenceChefCount, chefEquipCount) {
        let maxIndex = calI(recipeCount - 2, recipeCount - 2);
        console.log(maxIndex,recipeCount*recipeCount*recipeCount)
        const groupMaxScore = new Int32Array(maxIndex * (3 + ownPresenceChefCount));
        const groupMaxScoreChefIndex = new Int32Array(maxIndex * (3 + ownPresenceChefCount))

        console.time("计算每三道菜最高得分的厨师")

        let index = 0;
        const r2 = recipeCount * recipeCount;
        for (let i = 0; i < recipeCount; i++) {
            for (let j = i + 1; j < recipeCount; j++) {
                for (let k = j + 1; k < recipeCount; k++) {
                    index = getIndex(i,j,k,recipeCount);
                    index = index * (3 + ownPresenceChefCount);
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
                        let chefScoreIndex = index + 3 + r1;
                        groupMaxScoreChefIndex[chefScoreIndex] = maxT;
                        groupMaxScore[chefScoreIndex] = maxNum
                    }
                }
            }
            postMessage({type: 'p', p: index / (maxIndex * (3 + ownPresenceChefCount))})
        }

        console.timeEnd("计算每三道菜最高得分的厨师")
        return {
            groupMaxScore, groupMaxScoreChefIndex
        }
    }


}


async function initWebGPU() {
    if (!navigator.gpu) throw new Error("WebGPU not supported");
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice({
        requiredLimits: {
            maxBufferSize:2147483644,
            maxStorageBufferBindingSize: 2147483644 // 或adapter.limits.maxStorageBufferBindingSize
        }
    });
    // device.popErrorScope().then((error) => {
    //     if (error) {
    //         // There was an error creating the sampler, so discard it.
    //
    //         console.error(`An error occurred while creating sampler: ${error.message}`);
    //     }
    // });
    return device;
}

async function computeWithWebGPU(
    scoreCache, recipeCount, totalChefCount, ownChefCount, ownPresenceChefCount, chefEquipCount
) {
    const device = await this.initWebGPU();

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


    // 创建输出缓冲区
    const maxIndex =  calI(recipeCount - 2, recipeCount - 2);
    const outputSize = maxIndex * (3 + ownPresenceChefCount) * 4; // Int32Array 的字节大小
    const groupMaxScoreBuffer = device.createBuffer({
        size: outputSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
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
    let i_f32 = f32(i);
    let N_f32 = f32(N);
    let term1 = i_f32 * (i_f32 - 1.0) * (i_f32 - 3.0 * N_f32 - 2.0) / 6.0;
    let term2 = i_f32 * N_f32 * (N_f32 + 1.0) / 2.0;
    return i32(term1 + term2);
}

// Function to calculate calJ (translated from JS)
fn calJ(i: i32, j: i32, N: i32) -> i32 {
    let count = f32(j - i);
    let start = f32(N - i - 2);
    let end = start - count + 1.0;
    return i32((start + end) * count / 2.0);
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
                             let queueDeep : i32 = ${(3 + ownPresenceChefCount)};
                             
                    let maxIndex : i32 = recipeCount * recipeCount * recipeCount;
                    let r2 : i32 = recipeCount * recipeCount;

                    var rawIndex : i32 = i32(globalIndex.x);
                    if (rawIndex >= maxIndex * (3 + ownPresenceChefCount)) {
                        return;
                    }

                    let i : i32 = rawIndex / r2;
                    let j : i32  = (rawIndex % r2) / recipeCount;
                    let k : i32 = rawIndex % recipeCount;

                    if ( i >= j || j >= k ){
                        return;
                    }
                    
                    let index = getIndex(i,j,k,recipeCount) * queueDeep;
                    var a: i32 = 0;
                    var b: i32 = 0;
                    var c: i32 = 0;
                    var ai: i32 = 0;
                    var bi: i32 = 0;
                    var ci: i32 = 0;

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

                    groupMaxScore[index] = a;
                    groupMaxScore[index + 1] = b;
                    groupMaxScore[index + 2] = c;

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

                        let chefScoreIndex : i32 = index + 3 + r1;
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

    const workgroupSize = 256;
    const dispatchCount = Math.ceil(maxIndex / workgroupSize);

    // 提交计算任务
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(dispatchCount);
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
    device.destroy();
    //console.log(testDataResult)
    return {groupMaxScore, groupMaxScoreChefIndex};
}

function getIndex(i, j,k, recipeCount) {
    let c1 = calI(i, recipeCount - 2); // calI后边改成查表
    let c2 = calJ(i, j - 1, recipeCount); //这里计算
    let c3 = k - j - 1;
    return c1+c2+c3;
}

function calI(i, N) {
    // Using regular numbers (JavaScript doesn't have a strict int type)
    // Division by integers like 6 and 2 will still work as expected
    const term1 = i * (i - 1) * (i - 3 * N - 2) / 6;
    const term2 = i * N * (N + 1) / 2;
    return term1 + term2;
}

function calJ(i, j, N) {
    const count = j - i;
    const start = N - i - 2;
    const end = start - count + 1;
    return (start + end) * count / 2;
}

let chefAndRecipeThread = new ChefAndRecipeThread();
