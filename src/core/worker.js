let inited = false;

self.onmessage = (e) => {
    let data = e.data;
    if (!inited) {
        let temp = data.data
        //console.log(temp)
        chefAndRecipeThread.setBaseData(temp.playRecipes2, temp.tempCalCache);
        inited = true;
    } else {
        let result = chefAndRecipeThread.call(data.start, data.limit);
        self.postMessage({type: 'r', result: result});
    }
};


class ChefAndRecipeThread {

    constructor() {
        this.playRecipes = null;
        this.start = 0;
        this.groupScoreCacheNoIndex = null;
        this.groupMaxScore = null;
        this.groupMaxScoreChefIndex = null;

    }

    static __static_initialize() {
        if (!ChefAndRecipeThread.__static_initialized) {
            ChefAndRecipeThread.__static_initialized = true;
            ChefAndRecipeThread.__static_initializer_0();
        }
    }

    static disordePermuation_$LI$() {
        ChefAndRecipeThread.__static_initialize();
        if (ChefAndRecipeThread.disordePermuation == null) {
            ChefAndRecipeThread.disordePermuation = new Array(1680);
            for (let i = 0; i < 1680; i++) {
                ChefAndRecipeThread.disordePermuation[i] = new Array(9).fill(0);
            }
        }
        return ChefAndRecipeThread.disordePermuation;
    }

    static __static_initializer_0() {
        const needPermuation = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        ChefAndRecipeThread.permute(needPermuation, [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0], 0);
    }

    setBaseData(playRecipes, tempCalCache) {
        this.playRecipes = playRecipes;
        this.groupScoreCacheNoIndex = tempCalCache.groupScoreCacheNoIndex;
        this.groupMaxScore = tempCalCache.groupMaxScore;
        this.groupMaxScoreChefIndex = tempCalCache.groupMaxScoreChefIndex;
        //console.log(tempCalCache)
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


        for (let i = start; i < limit; i++) {
            let p = ((i - start) / (limit - start)) * 100 | 0;
            if (p > lastP) {
                self.postMessage({type: 'p', p: (p - lastP)})
                lastP = p
            }
            const precipes = this.playRecipes[i];
            let cal = 0;
            for (let k = 0; k < 1680; k++) {

                const ints = ChefAndRecipeThread.disordePermuation_$LI$()[k];
                score1Index = this.groupScoreCacheNoIndex[precipes[ints[0]]][precipes[ints[1]]] + (precipes[ints[2]] - precipes[ints[1]] - 1);
                score2Index = this.groupScoreCacheNoIndex[precipes[ints[3]]][precipes[ints[4]]] + (precipes[ints[5]] - precipes[ints[4]] - 1);
                score3Index = this.groupScoreCacheNoIndex[precipes[ints[6]]][precipes[ints[7]]] + (precipes[ints[8]] - precipes[ints[7]] - 1);

                score1Index  =score1Index *3;
                score2Index  =score2Index *3;
                score3Index  =score3Index *3;

                let score = this.groupMaxScore[score1Index] + this.groupMaxScore[score2Index] + this.groupMaxScore[score3Index];


                if (score > maxScore) {
                    //如果最大分数冲突，则遍历所有，确定最大分
                    let chef1 = this.groupMaxScoreChefIndex[score1Index]
                    let chef2 = this.groupMaxScoreChefIndex[score2Index]
                    let chef3 = this.groupMaxScoreChefIndex[score3Index]

                    if (chef1 !== chef2 && chef1 !== chef3 && chef2 !== chef3) {
                        maxScore = score;
                        result.maxScore = maxScore;
                        result.maxScoreChefGroup = [chef1, chef2, chef3];
                        result.recipes = precipes;
                        result.permuation = ints;
                    } else {
                        //有某个厨师重复出现，则便利所有可能
                        for (let j = 0; j < 3; j++) {
                            for (let l = 0; l < 3; l++) {
                                for (let m = 0; m < 3; m++) {
                                    score = this.groupMaxScore[score1Index+j] + this.groupMaxScore[score2Index+l] + this.groupMaxScore[score3Index+m];
                                    //如果最大分数冲突，则遍历所有确定最大分
                                    chef1 = this.groupMaxScoreChefIndex[score1Index+j]
                                    chef2 = this.groupMaxScoreChefIndex[score2Index+l]
                                    chef3 = this.groupMaxScoreChefIndex[score3Index+m]
                                    if (score > maxScore) {
                                        //console.log("全遍历得到最大分")
                                        if (chef1 !== chef2 && chef1 !== chef3 && chef2 !== chef3) {
                                            maxScore = score;
                                            result.maxScore = maxScore;
                                            result.maxScoreChefGroup = [chef1, chef2, chef3];
                                            result.recipes = precipes;
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

        endTime =  Date.now();
        console.info((limit - start) + "组数据计算用时:" + (endTime - startTime) + "ms");

        return result;
    }


    static permute(need, tmp, count, start) {
        if ((count[0] + count[1] + count[2]) === 9) {
            for (let i = 0; i < 9; i++) {
                ChefAndRecipeThread.disordePermuation_$LI$()[ChefAndRecipeThread.index][i] = tmp[i];
            }
            ChefAndRecipeThread.index++;
            return;
        }
        for (let j = 0; j < 3; j++) {
            if (count[j] === 3) {
                continue;
            }
            tmp[(j * 3) + count[j]] = need[start];
            count[j]++;
            ChefAndRecipeThread.permute(need, tmp, count, start + 1);
            count[j]--;
        }
    }


}

ChefAndRecipeThread.__static_initialized = false;

/**
 * 将一组有序的菜谱排列，  生成其所有的无序排列情况
 * 这里的排序可以理解为，有三个桶，每个桶中可以放三个元素（桶中元素不考虑顺序）， 计算有多少种放置方法
 *
 * @param playress 有序的菜谱排列
 * @param start    当前排列的元素（0-8）
 * @param count    记录一组无序排列情况中，排列元素个数
 */
ChefAndRecipeThread.index = 0;

ChefAndRecipeThread.disordePermuation_$LI$();
ChefAndRecipeThread.__static_initialize();


let chefAndRecipeThread = new ChefAndRecipeThread();
