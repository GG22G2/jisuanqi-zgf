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
        this.groupRecipeIndex = null;
        this.groupMaxScore = null;
        this.groupMaxScoreChefIndex = null;

    }


    setBaseData({playRecipesArr, recipePL, amberPrice, scoreCache, recipeCount, chefCount}) {
        this.playRecipes = playRecipesArr;

        this.recipePL = recipePL

        let calAllCache1 = this.calAllCache(scoreCache, amberPrice, recipeCount, chefCount);
        this.groupMaxScore = calAllCache1.groupMaxScore
        this.groupMaxScoreChefIndex = calAllCache1.groupMaxScoreChefIndex
        this.groupRecipeIndex = calAllCache1.groupRecipeIndex
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
        let lastP = 0;

        let result = {
            maxScore: 0,
            maxScoreChefGroup: maxScoreChefGroup,
            recipes: null,
            permuation: null,
        }
        const playRecipes = this.playRecipes;
        const recipeCount = Math.sqrt(this.groupRecipeIndex.length);

        for (let i = start; i < limit; i++) {
            // let p = ((i - start) / (limit - start)) * 100 | 0;
            // if (p > lastP) {
            //     self.postMessage()
            //     lastP = p
            // }

            const pIndex = i * 9;
            let cal = 0;
            for (let k = 0; k < 1680; k++) {
                const ints = this.recipePL[k];
                score1Index = this.groupRecipeIndex[playRecipes[pIndex + ints[0]] * recipeCount + playRecipes[pIndex + ints[1]]] + (playRecipes[pIndex + ints[2]] - playRecipes[pIndex + ints[1]] - 1);
                score2Index = this.groupRecipeIndex[playRecipes[pIndex + ints[3]] * recipeCount + playRecipes[pIndex + ints[4]]] + (playRecipes[pIndex + ints[5]] - playRecipes[pIndex + ints[4]] - 1);
                score3Index = this.groupRecipeIndex[playRecipes[pIndex + ints[6]] * recipeCount + playRecipes[pIndex + ints[7]]] + (playRecipes[pIndex + ints[8]] - playRecipes[pIndex + ints[7]] - 1);

                score1Index = score1Index * 3;
                score2Index = score2Index * 3;
                score3Index = score3Index * 3;

                let score = this.groupMaxScore[score1Index] + this.groupMaxScore[score2Index] + this.groupMaxScore[score3Index];



                //当前菜谱组合的最大的分，这个分数可能存在厨师冲突，但这个分数都比maxScore小，剩下的肯定更小
                if (score > maxScore) {
                    //如果最大分数的厨师冲突，则遍历所有，确定最大分
                    let chef1 = this.groupMaxScoreChefIndex[score1Index]
                    let chef2 = this.groupMaxScoreChefIndex[score2Index]
                    let chef3 = this.groupMaxScoreChefIndex[score3Index]

                    if (chef1 !== chef2 && chef1 !== chef3 && chef2 !== chef3) {
                        maxScore = score;
                        result.maxScore = maxScore;
                        result.maxScoreChefGroup = [chef1, chef2, chef3];
                        result.recipes = playRecipes.slice(pIndex, pIndex + 9);
                        result.permuation = ints;
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
                                    if (score > maxScore) {
                                        //console.log("全遍历得到最大分")
                                        if (chef1 !== chef2 && chef1 !== chef3 && chef2 !== chef3) {
                                            maxScore = score;
                                            result.maxScore = maxScore;
                                            result.maxScoreChefGroup = [chef1, chef2, chef3];
                                            result.recipes = playRecipes.slice(pIndex, pIndex + 9);
                                            result.permuation = ints;
                                        }


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

    calAllCache(scoreCache, amberPrice, recipeCount, chefCount) {

        let maxIndex = 0;
        for (let i = 0; i < recipeCount; i++) {
            for (let j = i + 1; j < recipeCount; j++) {
                for (let k = j + 1; k < recipeCount; k++) {
                    maxIndex++;
                }
            }
        }
        console.log(`菜谱组合 ${maxIndex}`)


        const groupRecipeIndex = new Int32Array(recipeCount * recipeCount)
        const groupMaxScore = new Int32Array(maxIndex * 3);
        const groupMaxScoreChefIndex = new Int32Array(maxIndex * 3)

        let index = 0;

        console.time("计算菜谱组合最高3个得分")
        index = 0;
        for (let i = 0; i < recipeCount; i++) {
            for (let j = i + 1; j < recipeCount; j++) {
                groupRecipeIndex[i * recipeCount + j] = index / 3;
                for (let k = j + 1; k < recipeCount; k++) {
                    //每一组菜谱组合，计算得分最高的3个厨师
                    let a = 0, b = 0, c = 0, ai = 0, bi = 0, ci = 0;

                    /*
                    *
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

                    for (let t = 0; t < chefCount; t++) {
                        let num = 0;
                        //这里改成计算每组菜谱组合小的最大
                        if (!(scoreCache[t * recipeCount + i] === 0 || scoreCache[t * recipeCount + j] === 0 || scoreCache[t * recipeCount + k] === 0)) {
                            num = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                        }

                        if (num > a) {
                            c = b;
                            ci = bi;
                            b = a;
                            bi = ai;
                            a = num;
                            ai = t;
                        } else if (num > b) {
                            c = b;
                            ci = bi;
                            b = num;
                            bi = t;
                        } else if (num > c) {
                            c = num;
                            ci = t;
                        }

                    }

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
        console.timeEnd("计算菜谱组合最高3个得分")
        return {
            groupRecipeIndex, groupMaxScore, groupMaxScoreChefIndex
        }
    }
}

let chefAndRecipeThread = new ChefAndRecipeThread();
