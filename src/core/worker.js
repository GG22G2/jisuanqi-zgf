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
                    amberPrice,
                    scoreCache,
                    recipeCount,
                    playChefCount,
                    ownChefCount,
                    chefEquipCount
                }) {
        this.playRecipes = playRecipesArr;

        this.recipePL = recipePL

        let calAllCache1 = this.calAllCache(scoreCache, amberPrice, recipeCount, playChefCount, ownChefCount, chefEquipCount);
        this.groupMaxScore = calAllCache1.groupMaxScore
        this.groupMaxScoreChefIndex = calAllCache1.groupMaxScoreChefIndex
        this.chefRealIndex = calAllCache1.chefRealIndex
        this.recipeCount = recipeCount;
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

            score1Index = score1Index * 3;
            score2Index = score2Index * 3;
            score3Index = score3Index * 3;

            let score = this.groupMaxScore[score1Index] + this.groupMaxScore[score2Index] + this.groupMaxScore[score3Index];

            if (score > maxScore) {
                //如果最大分数的厨师冲突，则遍历所有，确定最大分
                let chef1 = this.groupMaxScoreChefIndex[score1Index]
                let chef2 = this.groupMaxScoreChefIndex[score2Index]
                let chef3 = this.groupMaxScoreChefIndex[score3Index]

                let realChef1 = chefRealIndex[chef1];
                let realChef2 = chefRealIndex[chef2];
                let realChef3 = chefRealIndex[chef3];

                //给每个厨师生成一个条件码，这里判断如果符合条件，则进入光环技能判断流程。

                //比如刘昂星如果有 兰飞鸿的技能，则兰飞鸿必须在场，特殊技能的厨师生成一个特殊的标识，这里做一次匹配

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
                if (realChef1 !== realChef2 && realChef1 !== realChef3 && realChef2 !== realChef3) {

                    maxScore = score;
                    result.maxScore = maxScore;
                    result.maxScoreChefGroup = [chef1, chef2, chef3];
                    result.recipes = playRecipes.slice(t, t + 9);

                } else {
                    //有某个厨师重复出现，则便利所有可能
                    for (let c1 = 0; c1 < 3; c1++) {
                        for (let c2 = 0; c2 < 3; c2++) {
                            for (let c3 = 0; c3 < 3; c3++) {
                                score = this.groupMaxScore[score1Index + c1] + this.groupMaxScore[score2Index + c2] + this.groupMaxScore[score3Index + c3];
                                //如果最大分数冲突，则遍历所有确定最大分
                                chef1 = this.groupMaxScoreChefIndex[score1Index + c1]
                                chef2 = this.groupMaxScoreChefIndex[score2Index + c2]
                                chef3 = this.groupMaxScoreChefIndex[score3Index + c3]

                                realChef1 = chefRealIndex[chef1];
                                realChef2 = chefRealIndex[chef2];
                                realChef3 = chefRealIndex[chef3];

                                if (score > maxScore) {
                                    //console.log("全遍历得到最大分")
                                    if (realChef1 !== realChef2 && realChef1 !== realChef3 && realChef2 !== realChef3) {
                                        maxScore = score;
                                        result.maxScore = maxScore;
                                        result.maxScoreChefGroup = [chef1, chef2, chef3];
                                        result.recipes = playRecipes.slice(t, t + 9);
                                    }
                                }
                            }
                        }
                    }

                }
            }
        }


        endTime = Date.now();
        console.info((limit - start) + "组数据计算用时:" + (endTime - startTime) + "ms");

        return result;
    }

    calAllCache(scoreCache, amberPrice, recipeCount, playChefCount, ownChefCount, chefEquipCount) {
        //console.log(chefEquipCount)
        let maxIndex = recipeCount * recipeCount * recipeCount;

        //console.log(`菜谱组合 ${maxIndex}`)

        const groupMaxScore = new Int32Array(maxIndex * 3);
        const groupMaxScoreChefIndex = new Int32Array(maxIndex * 3)
        const chefRealIndex = new Int32Array(playChefCount)

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
                    index = index * 3;
                    //每一组菜谱组合，计算得分最高的3个厨师
                    let a = 0, b = 0, c = 0, ai = 0, bi = 0, ci = 0;
                    /*
                    * 如果是厨师搭配厨具
                    *
                    * 不应该使用全厨具,
                    * 对于每一组菜来说，可以单独看待厨师和厨具
                    *
                    * 单独计算每组菜谱得分最高的3个厨师，
                    * 单独计算每组菜谱得分最高的5个厨具，（保存厨具可以带来的增量分数）
                    *
                    * 以20%价格增加为基准，如果最终价格达不到，则不适用这个厨具
                    *
                    * */
                    let tAdd = 0;
                    for (let r = 0; r < ownChefCount; r++) {
                        let equipCount = chefEquipCount[r];
                        let start = tAdd, end = tAdd + equipCount + 1;
                        let maxNum = 0;
                        let maxT = 0;
                        for (let t = start; t < end; t++) {
                            //这里改成计算每组菜谱组合小的最大
                            if (!(scoreCache[t * recipeCount + i] === 0 || scoreCache[t * recipeCount + j] === 0 || scoreCache[t * recipeCount + k] === 0)) {
                                const num = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                if (num > maxNum) {
                                    maxNum = num;
                                    maxT = t;
                                }
                            }
                        }
                        tAdd = end;

                        //如果是厨师带厨具，应该是这个厨师的所有可能里先算一个最高分，其他厨师算

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

                    //前三个排名的厨师 不能带有全局加成技法。 从第四个开始才能带。

                    //todo 这里 a b c可能是同一个厨师带不同厨具

                    groupMaxScoreChefIndex[index] = ai;
                    groupMaxScoreChefIndex[index + 1] = bi;
                    groupMaxScoreChefIndex[index + 2] = ci;

                    groupMaxScore[index] = a
                    groupMaxScore[index + 1] = b
                    groupMaxScore[index + 2] = c

                    index = index + 3;
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
