let inited = false;

self.onmessage = (e) => {
    let data = e.data;

    chefAndRecipeThread.setBaseData(data.data);


    let result = chefAndRecipeThread.call(data.start, data.limit);
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


    setBaseData({
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
                    chefMatchMasks
                }) {
        this.playRecipes = playRecipesArr;

        this.recipePL = recipePL

        let calAllCache1 = this.calAllCache(scoreCache, amberPrice, recipeCount
            , playChefCount + playPresenceChefCount, ownChefCount, presenceChefCount, chefEquipCount);


        this.groupMaxScore = calAllCache1.groupMaxScore
        this.groupMaxScoreChefIndex = calAllCache1.groupMaxScoreChefIndex
        this.chefRealIndex = calAllCache1.chefRealIndex
        this.recipeCount = recipeCount;
        this.chefMasks = chefMasks;
        this.chefMatchMasks = chefMatchMasks;
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

            score1Index = playRecipes[t + 0] * r2 + playRecipes[t + 1] * recipeCount + playRecipes[t + 2];
            score2Index = playRecipes[t + 3] * r2 + playRecipes[t + 4] * recipeCount + playRecipes[t + 5];
            score3Index = playRecipes[t + 6] * r2 + playRecipes[t + 7] * recipeCount + playRecipes[t + 8];

            score1Index = score1Index * 6;
            score2Index = score2Index * 6;
            score3Index = score3Index * 6;

            //给每个厨师生成一个条件码，这里判断如果符合条件，则进入光环技能判断流程。
            //比如刘昂星如果有 兰飞鸿的技能，则兰飞鸿必须在场，特殊技能的厨师生成一个特殊的标识，这里做一次匹配

            //有某个厨师重复出现，则便利所有可能
            for (let c1 = 0; c1 < 6; c1++) {
                for (let c2 = 0; c2 < 6; c2++) {
                    for (let c3 = 0; c3 < 6; c3++) {
                        let score = this.groupMaxScore[score1Index + c1] + this.groupMaxScore[score2Index + c2] + this.groupMaxScore[score3Index + c3];
                        //如果最大分数冲突，则遍历所有确定最大分
                        let chef1 = this.groupMaxScoreChefIndex[score1Index + c1]
                        let chef2 = this.groupMaxScoreChefIndex[score2Index + c2]
                        let chef3 = this.groupMaxScoreChefIndex[score3Index + c3]

                        let realChef1 = chefRealIndex[chef1];
                        let realChef2 = chefRealIndex[chef2];
                        let realChef3 = chefRealIndex[chef3];

                        if (score > maxScore) {
                            //console.log("全遍历得到最大分")
                            if (realChef1 !== realChef2 && realChef1 !== realChef3 && realChef2 !== realChef3) {

                                // if (c1>2||c2>2||c3>2){
                                //     debugger
                                // }
                                //特征比较
                                let mm1 = chefMatchMasks[realChef1];
                                let mm2 = chefMatchMasks[realChef2];
                                let mm3 = chefMatchMasks[realChef3];

                                // if (realChef2===116){
                                //     debugger
                                // }
                                if ((mm1 + mm2 + mm3) !== 0) {
                                    //有特殊要求，需要具体计算
                                    let m1 = chefMasks[realChef1];
                                    let m2 = chefMasks[realChef2];
                                    let m3 = chefMasks[realChef3];
                                    let p1 = mm1 & (m2 | m3)
                                    let p2 = mm2 & (m1 | m3)
                                    let p3 = mm3 & (m1 | m2)

                                    if (p1!==mm1||p2!==mm2||p3!==mm2 ){
                                        continue
                                    }

                                }

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
             *
             *
             *
             *
             * 特征用bigint保存
             * 比如无光环技能的值未0b1
             * 有兰飞鸿技能的未0b01;
             * 有南飞技能的为 0b10;
             * 同时有兰飞鸿和南飞的为 0b11;
             *
             *
             * 厨师b和c的特征做与运算 结果为 p1
             * p1和 0b11做与运算，如果结果不为0b11则认为不满足条件，不往下继续进行。
             *
             *
             * 厨师在场就生效的
             * 厨师不仅要在场，还要满足其他条件的，
             *
             *
             * */
        }

        endTime = Date.now();
        console.info((limit - start) + "组数据计算用时:" + (endTime - startTime) + "ms");

        return result;
    }

    calAllCache(scoreCache, amberPrice, recipeCount, totalChefCount, ownChefCount, ownPresenceChefCount, chefEquipCount) {
        let maxIndex = recipeCount * recipeCount * recipeCount;

        const groupMaxScore = new Int32Array(maxIndex * (3+ownPresenceChefCount));
        const groupMaxScoreChefIndex = new Int32Array(maxIndex *  (3+ownPresenceChefCount))
        const chefRealIndex = new Int32Array(totalChefCount)

        console.time("计算每三道菜最高得分的厨师")

        let tAdd = 0;
        for (let r = 0; r < ownChefCount; r++) {
            let equipCount = chefEquipCount[r];
            let start = tAdd, end = tAdd + equipCount + 1;
            for (let t = start; t < end; t++) {
                chefRealIndex[t] = r;
            }
            tAdd = end;
        }
        const r2 = recipeCount * recipeCount;
        let index = 0;
        for (let i = 0; i < recipeCount; i++) {
            for (let j = i + 1; j < recipeCount; j++) {
                for (let k = j + 1; k < recipeCount; k++) {
                    index = i * r2 + j * recipeCount + k;
                    index = index *  (3 + ownPresenceChefCount);
                    //debugger
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


                    //groupMaxScoreChefIndex中必须包含所有上场技能类车厨师，也必须包含所有能享受到效果的厨师

                    //如果开启了在场技能， 则结果集中必须包含厨师本身，此技能夹持下最好的哪一个厨师，

                    //比如启用了今珏[场上厨师制作5火料理基础售价+20%]技能，那么groupMaxScoreChefIndex中除了正常的前三结果外，第四个必须是今珏的得分，第五个是享受今珏技能效果下，做的最好的哪一个非今珏的厨师

                    groupMaxScoreChefIndex[index] = ai;
                    groupMaxScoreChefIndex[index + 1] = bi;
                    groupMaxScoreChefIndex[index + 2] = ci;

                    groupMaxScore[index] = a
                    groupMaxScore[index + 1] = b
                    groupMaxScore[index + 2] = c

                   // debugger
                    //todo 遍历在场生效厨师 ，生产对应结果

                    for (let r1 = 0; r1 < ownPresenceChefCount; r1++) {
                        //debugger
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
                       // debugger
                        let chefScoreIndex = index + 3 + r1;
                        groupMaxScoreChefIndex[chefScoreIndex] = maxT;
                        groupMaxScore[chefScoreIndex] = maxNum
                    }
                    //index = index + 3 + ownPresenceChefCount;
                }
            }
            postMessage({type: 'p', p: index / (maxIndex * 3)})
        }

        console.timeEnd("计算每三道菜最高得分的厨师")

        return {
            groupMaxScore, groupMaxScoreChefIndex, chefRealIndex
        }
    }
}

let chefAndRecipeThread = new ChefAndRecipeThread();
