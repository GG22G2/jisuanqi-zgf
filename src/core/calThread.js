
class ChefAndRecipeThread {
    constructor(start, limit) {
        this.playRecipes = null;
        this.playChefs = null;
        this.start = 0;
        this.scoreCache = null;
        this.scoreCacheNoEquipIndex = null;
        this.scoreAddCacheNoEquip = null;
        this.recipe2Change = null;
        this.start = start;
        this.limit = limit;
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
        console.log(1234)
        ChefAndRecipeThread.permute(needPermuation, [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0], 0);
        console.log(2234)
    }

    setBaseData(playRecipes, playChefs, recipe2Change, tempCalCache) {
        this.playRecipes = playRecipes;
        this.playChefs = playChefs;
        this.scoreCache = tempCalCache.scoreCacheNoEquip;
        this.scoreCacheNoEquipIndex = tempCalCache.scoreCacheNoEquipIndex;
        this.scoreAddCacheNoEquip = tempCalCache.scoreAddCacheNoEquip;
        this.recipe2Change = recipe2Change;
    }

    /**
     * @return {BigInt} 返回得分最高的tomNum个结果，结果是有序的，已经按照得分从高到底排序了
     */
    call() {
        let starttime = Date.now(), endtime = 0;

        let playChefs2 = new Array(this.playChefs.length);
        for (let i = 0; i < playChefs2.length; i++) {
            playChefs2[i] = this.playChefs[i][2];
            postMessage((i/playChefs2.length * 100)+"%")
        }

        let noCanUseScoreIndex = new Array(this.scoreAddCacheNoEquip.length).fill(false);
        //获取所有组合中最高的一组分数
        let maxGroupScore = 0;
        for (let i = 0; i < this.scoreAddCacheNoEquip.length; i++) {
            for (let s of this.scoreAddCacheNoEquip[i]) {
                if (s > maxGroupScore) {
                    maxGroupScore = s;
                }
            }
        }
        maxGroupScore = (0.35 * maxGroupScore);//将最高分的35%作为基准，低于这个的组和不做考虑

        for (let i = 0; i < this.scoreAddCacheNoEquip.length; i++) {
            let t = 0;
            let hasBigScore = false;
            for (let s of this.scoreAddCacheNoEquip[i]) {
                t += s;
                if (s > maxGroupScore) {
                    hasBigScore = true;
                }
            }
            noCanUseScoreIndex[i] = t === 0 || !hasBigScore;
        }

        console.log(maxGroupScore)

        let topKValueInt = 0, maxScore = 0, maxKey = BigInt(0);
        let score1Index, score2Index, score3Index;
        for (let i = this.start; i < this.limit; i++) {
            const precipes = this.playRecipes[i];
            let cal = 0;
            for (let k = 0; k < 1680; k++) {

                const ints = ChefAndRecipeThread.disordePermuation_$LI$()[k];
                score1Index = this.scoreCacheNoEquipIndex[precipes[ints[0]]][precipes[ints[1]]] + (precipes[ints[2]] - precipes[ints[1]] - 1);
                score2Index = this.scoreCacheNoEquipIndex[precipes[ints[3]]][precipes[ints[4]]] + (precipes[ints[5]] - precipes[ints[4]] - 1);
                score3Index = this.scoreCacheNoEquipIndex[precipes[ints[6]]][precipes[ints[7]]] + (precipes[ints[8]] - precipes[ints[7]] - 1);

                if (noCanUseScoreIndex[score1Index] || noCanUseScoreIndex[score2Index] || noCanUseScoreIndex[score3Index]) {
                    continue;
                }
                let chef3RecipeScore = this.scoreAddCacheNoEquip[score3Index];

                for (let j = 0, i9 = 0, score2 = 0, chef2Limit; j < this.recipe2Change.length; j++) {
                    chef2Limit = this.recipe2Change[j];
                    let playChef = this.playChefs[i9]; //获取一个厨师组合

                    let s1 = this.scoreAddCacheNoEquip[score1Index][playChef[0]];
                    if (s1 === 0) {
                        i9 = chef2Limit;
                        continue;
                    }
                    score2 = s1 + this.scoreAddCacheNoEquip[score2Index][playChef[1]]; //计算这个厨师组合中前两个厨师的得分
                    if (score2 === 0) {
                        i9 = chef2Limit;
                        continue;
                    }
                    for (let score3Limit = Math.max(topKValueInt - score2, 0); i9 < chef2Limit; i9++) {
                        cal = chef3RecipeScore[playChefs2[i9]];
                        if (cal > score3Limit) {
                            cal += score2;
                            if (cal > maxScore) {
                                maxScore = cal;
                                // i k ,i9   菜谱 i(0-2304)12位，  菜谱排列 k(0-1680)11位，  厨师组合 i2(0-795)12位
                                //将得分， 菜谱，菜谱排列，厨师组合索引组合成long保存， 得分(cal)在高位，这样新的cal可以用来排序
                                // 1符号位，20位得分，18位菜谱索引，11位菜谱排列，14位厨师索引
                                let bigCal = BigInt(cal);
                                maxKey = ((((bigCal << 18n | BigInt(i)) << 11n) | BigInt(k)) << 14n) | BigInt(i9);
                            }
                        }
                    }
                }
            }
        }

        endtime = /* currentTimeMillis */ Date.now();
        console.info((this.limit - this.start) + "全菜谱 全厨师 无厨具排列结果用时:" + (endtime - starttime) + "ms");
        return maxKey;
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


export {ChefAndRecipeThread}
