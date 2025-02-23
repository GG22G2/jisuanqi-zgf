/* Generated from Java with JSweet 3.0.0 - http://www.jsweet.org */
import {ChefAndRecipeThread} from './calThread.js'
import {PlayChef,PlayRecipe, SkillEffect,TempAddition,TopResult,CalRecipe,Chef,Effect,Recipe,Skill} from './ObjectDesc.js'
import {GlobalAddition } from './globalAddition.js'
import { Calculator } from './calculator.js'
import {IngredientLimit} from "./ingredientLimit.js";


class GodInference {
    constructor(officialGameData, myGameData, recipeReward, sexReward, materials, calConfig) {
        this.useEquip = false;

        if (calConfig != null) {
            this.chefMinRarity = calConfig.chefMinRarity;
            this.deepLimit = calConfig.deepLimit;
            this.recipeLimit = calConfig.recipeLimit;
            this.filterScoreRate = calConfig.filterScoreRate;
            this.useEquip = calConfig.useEquip;
            this.mustChefs = calConfig.mustChefs;
        }

        //拥有的厨师，菜谱，厨具
        this.ownChefs = null;
        this.ownRecipes = null;
        this.ownEquips = null;

        this.tempOwnRecipes = null;

        this.playChefs = []; //上场厨师
        this.playRecipeGroup = []; //上场菜谱组合(每一个都是9个菜谱)
        this.playRecipes = []; //上场菜谱(菜谱和数量)
        this.playEquips = []; //上场厨具

        this.tempCalCache = null;
        this.materialTag = ["留空",
            "肉", "鱼", "肉", "肉", "肉", "菜", "肉", "肉", "肉", "菜",
            "面", "肉", "菜", "菜", "菜", "菜", "菜", "菜", "菜", "面",
            "面", "菜", "菜", "鱼", "菜", "肉", "肉", "肉", "面", "菜",
            "菜", "鱼", "菜", "面", "面", "菜", "鱼", "肉", "肉", "肉",
            "鱼", "鱼", "肉", "肉", "菜", "菜"];
        this.recipeReward = recipeReward;
        this.materials = materials ? materials : new Array(50).fill(10000);
        this.sexReward = sexReward;
        this.officialGameData = officialGameData;
        this.myGameData = myGameData;
        this.globalAddtion = new GlobalAddition(myGameData.chefs, officialGameData.skills);
        //this.kitchenGodCal = new Calculator(this.globalAddtion.useall, recipeReward, sexReward);

        this.initOwn();

        //将全局技法加成 追加到厨师技法上
        GodInference.modifyChefValue(this.ownChefs, this.globalAddtion);

        this.buildRecipeTags();

    }



    /**
     * 假设: 在没有厨具的情况下得分最高的，在带上厨具后仍然是最高的  虽然不一定，但很可能是一个比较优质的解
     */
    refer() {
        //this.refer2()
        let start = Date.now(), end;

        if (this.tempCalCache == null) {
            console.time('构建缓存')
            this.buildCache();
            console.timeEnd('构建缓存')
        }


        const playRecipesArr = new Int32Array(this.playRecipeGroup.length * 9);

        for (let i = 0; i < this.playRecipeGroup.length; i++) {
            let playRecipes = this.playRecipeGroup[i];
            for (let j = 0; j < 9; j++) {
                playRecipesArr[i * 9 + j] = playRecipes[j].index    //idToIndex.get(playRecipes[j].getRecipe().recipeId)
            }
            //让新放入的9个值从小打到排列
            this.sortArraySegment(playRecipesArr, i * 9, i * 9 + 8)
        }

        let topPlayChefs = [];
        let total = this.playRecipeGroup.length;
        let groupNum = 1; //线程数
        let maxScoreKey = BigInt(0);
        let maxScoreResult;
        let works = []
        let that = this;

        let curP = 0;

        const recipePL = ChefAndRecipeThread.disordePermuation_$LI$();

        //console.log(playRecipesArr)
        let data = {
            playRecipesArr,
            recipePL,
            scoreCache: this.tempCalCache.scoreCache,
            amberPrice: this.tempCalCache.amberPrice,
            recipeCount: this.tempCalCache.recipeCount,
            playChefCount: this.tempCalCache.playChefs.length,
            ownChefCount: this.ownChefs.length,
            chefEquipCount: this.tempCalCache.chefEquipCount
        }
        //debugger

        //不同区段的实际计算量是不同的, 计算一般集中的前半部分
        let startIndex = 0, limit = Math.min(300000, total);
        let sendCount = Math.ceil(total / limit);
        let resultCount = 0;

        let totalP = sendCount * 100;

        return new Promise(resolve => {
            for (let i = 0; i < groupNum; i++) {
                let calWorker;
                calWorker = new Worker(new URL('./worker.js', import.meta.url))
                works.push(calWorker)
                calWorker.onmessage = function (event) {

                    if (event.data.type === 'p') {

                        curP = event.data.p;
                        //console.log(curP)
                        postMessage(curP * 100)
                    } else {
                        //console.log(event.data)
                        //计算完成，安排下一个任务
                        const topScoreKey = event.data.result.maxScore;


                        resultCount++;
                        if (topScoreKey > maxScoreKey) {
                            maxScoreKey = topScoreKey;
                            maxScoreResult = event.data.result;
                        }

                        if (startIndex < total) {
                            //再安排一组
                            this.postMessage({start: startIndex, limit: limit})
                            startIndex = limit;
                            limit = Math.min(limit + 300, total)
                        }

                        if (startIndex >= total && resultCount === sendCount) {
                            topPlayChefs = that.parseLong(playRecipesArr, maxScoreResult);
                            end = Date.now();
                            console.info("总用时 " + (end - start) + "ms");
                            postMessage(100)
                            for (let work of works) {
                                work.terminate();
                            }
                            resolve(that.calSecondStage(topPlayChefs));

                            //that.fenxiTest(maxScoreResult)
                        }
                    }
                };

                calWorker.postMessage({data: data, start: startIndex, limit: limit})

                startIndex = limit;
                limit = Math.min(limit + 300, total)
            }
        });
    }


    /**
     * @param {Chef[]} chefs         厨师数组
     * @param {GlobalAddition} globalAddition 全体加成
     */
    static modifyChefValue(chefs, globalAddition) {
        for (let i = 0; i < chefs.length; i++) {
            let chef = chefs[i];
            chef.bake += globalAddition.bake;
            chef.boil += globalAddition.boil;
            chef.stirfry += globalAddition.stirfry;
            chef.steam += globalAddition.steam;
            chef.fry += globalAddition.fry;
            chef.knife += globalAddition.knife;
            const tags = chef.tags;
            if (tags != null && 0 < tags.length) {
                for (let j = 0; j < tags.length; j++) {
                    let tag = tags[j];
                    let value = 0;
                    if (tag === Chef.SEX_MAN) {
                        value = globalAddition.manfill;
                    } else if (tag === Chef.SEX_WOMAN) {
                        value = globalAddition.womanfill;
                    }
                    chef.bake += value;
                    chef.boil += value;
                    chef.stirfry += value;
                    chef.steam += value;
                    chef.fry += value;
                    chef.knife += value;
                }
            }
        }
    }

    buildCache() {
        this.buildPlayRecipe();
        const builder = new TempCalCacheBuilder();
        this.tempCalCache = builder.build(this.ownChefs, this.playRecipes, this.useEquip ? this.playEquips : [], this.officialGameData
            , this.globalAddtion, this.recipeReward, this.sexReward);
        this.playChefs = this.tempCalCache.playChefs
    }


    /**
     * 有的菜谱id过于大，正常id小于1000，后厨的普遍5000多，如果用一维数组存菜谱id，则有很多空间浪费
     * 这里做一重排，用从0开始的连续数字代替id
     */
    buildPlayRecipe() {
        console.time('排列菜谱')

        /*
        * 目前来看 菜谱都集中在前几十道菜上
        * */
        const ingredientLimit = new IngredientLimit(this.materials)
        const finalMaterialCount = ingredientLimit.getFinalMaterialCount();

        let recipeCounts = new Int32Array(2000)
        this.calQuantity(recipeCounts, finalMaterialCount);

        //this.sortOfPrice(recipeCounts, this.tempOwnRecipes);
        this.estimatedPriceAndSort(recipeCounts, this.tempOwnRecipes);
        this.tempOwnRecipes = this.tempOwnRecipes.slice(0, Math.min(this.recipeLimit, this.tempOwnRecipes.length));
        this.recipePermutation(1, [], ingredientLimit);

        let maxScore = 0;
        for (let i = this.playRecipeGroup.length - 1; i >= 0; i--) {
            let temp = this.playRecipeGroup[i];
            let score = 0;
            for (let j = 0; j < 9; j++) {
                let count = temp[j].count
                let ownRecipe = temp[j].recipe
                const reward = this.recipeReward[ownRecipe.recipeId];
                score += ((ownRecipe.price * (1 + reward) * count) | 0);
            }
            if (maxScore < score) {
                maxScore = score;
            }
        }
        const filterScoreRate = this.filterScoreRate;

        for (let i = this.playRecipeGroup.length - 1; i >= 0; i--) {
            let temp = this.playRecipeGroup[i];
            let score = 0;
            for (let j = 0; j < 9; j++) {
                let count = temp[j].count
                let ownRecipe = temp[j].recipe
                const reward = this.recipeReward[ownRecipe.recipeId];
                score += ((ownRecipe.price * (1 + reward) * count) | 0);
            }

            if (score < (maxScore * filterScoreRate)) {
                this.playRecipeGroup.splice(i, 1); // 删除元素，i不变，因为从后向前遍历
            }
        }

        console.timeEnd('排列菜谱')
        console.info("候选菜谱组合列表" + this.playRecipeGroup.length);


        const maps = new Map();
        let index = 0;
        for (let i = 0; i < this.playRecipeGroup.length; i++) {
            let recipesTemp = this.playRecipeGroup[i];
            for (let j = 0; j < 9; j++) {
                let playRecipe = recipesTemp[j];
                const count = playRecipe.count;
                const recipeId = playRecipe.getRecipe().recipeId;
                const mapId = count << 14 | recipeId;

                let calRecipe = maps.get(mapId);
                if (calRecipe == null) {
                    calRecipe = new CalRecipe(playRecipe.getRecipe(), count);
                    calRecipe.index = index;
                    playRecipe.index = index;
                    maps.set(mapId, calRecipe);
                    index++;
                } else {
                    playRecipe.index = calRecipe.index;
                }
            }
        }
        console.log("菜谱种类", maps.size)
        this.playRecipes = new Array(maps.size)
        for (let [key, value] of maps.entries()) {
            this.playRecipes[value.index] = value
        }
    }

    estimatedPriceAndSort(quantity, recipes, limit) {
        let prices = new Array(2000).fill(0);
        for (let i = 0; i < recipes.length; i++) {
            let ownRecipe = recipes[i];
            const reward = this.recipeReward[ownRecipe.recipeId];

            //单技法要求按照500来看，双技法要求按照400来估算，评估一个技法值
            const t2 = this.estimatedChefAdd(ownRecipe);

            prices[ownRecipe.recipeId] = ((ownRecipe.price * (1 + reward + t2) * quantity[ownRecipe.recipeId]) | 0);
        }

        //返回每个菜对应的索引位置
        recipes.sort((r1, r2) => {
            return prices[r2.recipeId] - prices[r1.recipeId];
        });
    }

    estimatedChefAdd(recipe) {
        const abc = [-1, 0, 0.1, 0.3, 0.5, 1.0];
        const v1 = 500, v2 = 400;

        // 收集所有非零技法值
        const skills = [];
        for (const key of ['bake', 'boil', 'stirfry', 'knife', 'fry', 'steam']) {
            const value = recipe[key];
            skills.push(value);
        }
        skills.sort((a, b) => b - a); // 降序排列

        const t = skills.length;

        let a = Math.min(v1 / skills[0], 5) | 0; // 最高技法与v1比较
        let b = Math.min(v2 / skills[1], 5) | 0; // 次高技法与v2比较
        return Math.min(abc[a], abc[b]);
    }

    sortArraySegment(arr, start, end) {
        // 确保 start 和 end 在数组范围内
        if (start < 0 || end >= arr.length || start > end) {
            throw new Error("Invalid start or end position");
        }

        // 取出开始和结束位置之间的数组片段并排序
        const sortedSegment = arr.slice(start, end + 1).sort((a, b) => a - b);

        // 将排序后的片段放回原数组
        for (let i = start; i <= end; i++) {
            arr[i] = sortedSegment[i - start];
        }

        return arr;
    }

    /**
     * 保存得分 菜谱，菜谱排列，厨师组合索引   1符号位，20位得分，18位菜谱索引，11位菜谱排列，14位厨师索引
     * cal = ((((cal << 18 | i) << 11) | k) << 14) | i2;
     * @param {int[]} playRecipes
     * @param {BigInt} socres
     * @return {TopResult[]}
     */
    parseLong(playRecipes, maxScoreResult) {

        let score = 0;
        score = maxScoreResult.maxScore;
        const precipes = maxScoreResult.recipes;
        const ints = maxScoreResult.permuation;
        const recipes = [0, 0, 0, 0, 0, 0, 0, 0, 0];

        recipes[0] = precipes[ints[0]];
        recipes[1] = precipes[ints[1]];
        recipes[2] = precipes[ints[2]];
        recipes[3] = precipes[ints[3]];
        recipes[4] = precipes[ints[4]];
        recipes[5] = precipes[ints[5]];
        recipes[6] = precipes[ints[6]];
        recipes[7] = precipes[ints[7]];
        recipes[8] = precipes[ints[8]];

        const chefs = maxScoreResult.maxScoreChefGroup;

        const topResult = new TopResult(chefs, recipes, score);

        /* add */

        return topResult;
    }

    /**
     * 第二阶段的计算
     * @param {TopResult} topPlayChef
     */
    calSecondStage(topPlayChef) {
        // debugger
        let chefIds = topPlayChef.chefs;
        let recipeIds = topPlayChef.recipeids;
        let result = []
        let chefs = [];
        for (let i = 0; i < 3; i++) {
            let ownChef = this.playChefs[chefIds[i]];
            let name1 = this.playRecipes[recipeIds[(i * 3)]].name;
            let count1 = this.playRecipes[recipeIds[(i * 3)]].count;
            let name2 = this.playRecipes[recipeIds[(i * 3) + 1]].name;
            let count2 = this.playRecipes[recipeIds[(i * 3) + 1]].count;
            let name3 = this.playRecipes[recipeIds[(i * 3) + 2]].name;
            let count3 = this.playRecipes[recipeIds[(i * 3) + 2]].count;
            chefs.push({
                chef: ownChef.name,
                equip: ownChef.remark ? ownChef.remark : '',
                recipes: [
                    {recipe: name1, count: count1}
                    , {recipe: name2, count: count2}
                    , {recipe: name3, count: count3}
                ]
            })

        }

        result = {
            chefs,
            score: topPlayChef.score
        }

        return [result]
    }



    /**
     * 生成候选的菜谱序列 9个菜谱
     *
     * @param index 菜谱序号1-9 代表1到9号位
     * @param play 9个菜谱的集合
     * @param ingredientLimit 剩余食材
     *
     * */
    recipePermutation(index, play, ingredientLimit) {
        if (index === 10) {
            this.playRecipeGroup.push(play);
            return;
        }

        const limit = this.deepLimit[index];

        //拷贝食材数量
        const finalMaterialCount = ingredientLimit.getFinalMaterialCount();
        let recipeCounts = new Int32Array(2000)
        //计算奖励倍数加持下,根据剩余食材计算各个菜最多做多少份
        this.calQuantity(recipeCounts, finalMaterialCount);


        const removes = [];
        for (let i = 0; i < limit; i++) {
            //根据份数计算得分，并降序排列返回
            this.sortOfPrice(recipeCounts, this.tempOwnRecipes);
            const selectRecipe = this.tempOwnRecipes.shift();
            removes.push(selectRecipe);
            const quantity = recipeCounts[selectRecipe.recipeId];
            if (quantity === 0) {
                continue;
            }

            const newPlayRecipes = new Array(9);

            for (let j = 0; j < index - 1; j++) {
                newPlayRecipes[j] = play[j];
            }

            //修改食材库存
            ingredientLimit.cookingQuantity(selectRecipe, quantity);

            newPlayRecipes[index - 1] = new PlayRecipe(selectRecipe, quantity);
            this.recipePermutation(index + 1, newPlayRecipes, ingredientLimit);
            ingredientLimit.setMaterialCount(finalMaterialCount);
        }

        for (let it = 0; it < removes.length; it++) {
            this.tempOwnRecipes.push(removes[it]);
        }
    }

    /**
     * @param  materialCount 各种食材的剩余数量,数组下标对应食材的id
     * @return
     */
    calQuantity(counts, materialCount) {
        const maxEquipLimit = this.globalAddtion.maxequiplimit;
        const length = this.tempOwnRecipes.length;
        for (let i = 0; i < length; i++) {
            let ownRecipe = this.tempOwnRecipes[i];
            const count = IngredientLimit.cookingQuantity(ownRecipe.materials2, ownRecipe.limit + maxEquipLimit[ownRecipe.rarity], materialCount);
            counts[ownRecipe.recipeId] = count;
        }
        return counts;
    }

    sortOfPrice(quantity, recipes, limit) {
        for (let i = 0; i < recipes.length; i++) {
            let ownRecipe = recipes[i];
            const reward = this.recipeReward[ownRecipe.recipeId];
            ownRecipe.computedPrice = ownRecipe.price * (1 + reward) * quantity[ownRecipe.recipeId];
        }

        //返回每个菜对应的索引位置
        recipes.sort((r1, r2) => {
            return r2.computedPrice - r1.computedPrice;
        });
    }

    buildRecipeTags() {
        for (let i = 0; i < this.tempOwnRecipes.length; i++) {
            let ownRecipe = this.tempOwnRecipes[i];
            const materials = ownRecipe.materials;
            const tags = [0, 0, 0, 0];
            for (let j = 0; j < materials.length; j++) {
                let material = materials[j];
                switch (this.materialTag[material.material]) {
                    case "面":
                        tags[0] = 1;
                        break;
                    case "肉":
                        tags[1] = 1;
                        break;
                    case "菜":
                        tags[2] = 1;
                        break;
                    case "鱼":
                        tags[3] = 1;
                        break;
                    default:
                        break;
                }
            }
            ownRecipe.tags = tags;
        }
    }

    initOwn() {
        const chefs = [];
        this.ownChefs = this.myGameData.chefs.filter((chef) => {
            return this.mustChefs.indexOf(chef.name)!==-1 || chef.rarity >= this.chefMinRarity;
        }).sort((chef, chef2) => {
            return chef.chefId - chef2.chefId;
        });

        this.tempOwnRecipes = this.myGameData.recipes;
        for (let tempOwnRecipe of this.tempOwnRecipes) {
            tempOwnRecipe.materials2 = tempOwnRecipe.materials
        }
        let equips = []


        //将每个厨师生成带各个出具的版本

        //获取所有3星出局

        let skillHashMap = this.officialGameData.skillHashMap;


        //这里改成按照厨具效果过滤
        /*
        * 只要3星厨具，只要各种售价类，减少技法的一律不考虑
        *
        * 技能的Type是以 Use 开头的都算作跟售价相关
        *
        *  六种技法 ['Bake','Steam','Boil','Fry','Knife','Stirfry']
        *
        * value不能小于0
        *
        *
        * 只使用3星厨具， 出局效果必须能做用于厨师，
        *
        * [基础售价的，6种口味的，6种技法，6种售价加成]
        * //或者更简单的，厨师带上出局，对前200到菜能起到价钱效果的厨具都可以保留。保留前60名厨具
        *
        *
        * */

        equips = this.officialGameData.equips;
        let equipTemp = []
        for (let i = 0; i < equips.length; i++) {
            let equip = equips[i];
            if (equip.rarity !== 3) {
                continue;
            }
            equipTemp.push(equip)
        }

        this.ownEquips = equipTemp;
        this.playEquips = equipTemp;

        for (const ownChef of this.ownChefs) {
            buildChefSkillEffect(this.officialGameData, ownChef);
        }


    }


}





class TempCalCache {
    constructor(chefIndexMax, recipeIndexMax) {
        this.scoreCache = null;
        this.groupMaxScore = null;
        this.groupMaxScoreChefIndex = null;
        this.groupRecipeIndex = null; //一维数组，   一组菜谱3个，这个是前两个菜谱的索引,

        this.chefCount = chefIndexMax;
        this.recipeCount = recipeIndexMax;

        this.scoreCache = null;
        this.amberPrice = new Int32Array(recipeIndexMax * 17);
        this.groupRecipeIndex = null;


        this.playChefs = null;
        this.playEquipChefs = null;
        this.chefEquipCount = new Int32Array(chefIndexMax);
    }
}


class TempCalCacheBuilder {
    constructor() {
        if (this.tempCalCache === undefined) {
            this.tempCalCache = null;
        }
        this.recipeReward = null;
        this.sexReward = null;
        this.officialGameData = null;
        this.kitchenGodCal = null;
        this.ownChefs = null;
        this.playRecipes = null;
    }

    build(ownChefs, playRecipes, playEquips, officialGameData, globalAddition, recipeReward, sexReward) {
        this.officialGameData = officialGameData;
        this.globalAddtion = globalAddition;
        this.kitchenGodCal = new Calculator(globalAddition.useall, recipeReward, sexReward);
        this.ownChefs = ownChefs;
        this.updateId();
        this.playChefs = [...ownChefs];
        this.playRecipes = playRecipes;
        this.recipeReward = recipeReward;
        this.sexReward = sexReward;
        this.playEquips = playEquips;
        this.tempCalCache = new TempCalCache(ownChefs.length, playRecipes.length);

        this.createCalCache();

        return this.tempCalCache;
    }

    updateId() {
        for (let i = 0; i < this.ownChefs.length; i++) {
            const ownChef = this.ownChefs[i];
            ownChef.index = i;
        }
    }

    createCalCache() {
        let playRecipes = this.playRecipes;
        //这里用来修改ownChefs
        let chefEquipCount = new Int32Array(this.ownChefs.length);

        let playChefs = [...this.ownChefs]
        let playEquipChefs = [];
        if (this.playEquips.length > 0) {
            console.log("使用厨具")
            //使用厨具，将厨师扩展一下
            let equips = this.playEquips;
            //每个厨师，带上所有种类厨具，和ownRecipes中菜谱计算价格

            //可能使用的厨具应该是能提供可靠收益的，也就是带上厨具后做ownRecipes中菜谱能增加售价，并且增加幅度应该不低


            for (let i = 0; i < this.ownChefs.length; i++) {
                let ownChef = this.ownChefs[i];

                let playRecipeCount = playRecipes.length;
                let rawScores = new Int32Array(playRecipes.length);
                playEquipChefs.push(ownChef)
                for (let t = 0; t < playRecipeCount; t++) {
                    const calRecipe = playRecipes[t];
                    rawScores[t] = this.kitchenGodCal.calSinglePrice(ownChef, calRecipe) * calRecipe.count;
                }

                let equipCount = 0;
                //let equipSet = new Set();
                //这里给厨师分配厨具的时候， 口味都可，四种啥都可，  技法类需要和厨师适配
                for (const equip of equips) {
                    let newPlayChef = cloneChef(ownChef);
                    newPlayChef.selfEquipSkillIds = equip.skill
                    buildChefSkillEffect(this.officialGameData, newPlayChef);
                    let equipScores = new Int32Array(playRecipes.length);

                    for (let t = 0; t < playRecipeCount; t++) {
                        const calRecipe = playRecipes[t];
                        equipScores[t] = this.kitchenGodCal.calSinglePrice(newPlayChef, calRecipe) * calRecipe.count;
                    }

                    let sum = 0;
                    //一个厨具应该能让三个菜的总分
                    for (let k = 0; k < playRecipeCount; k++) {
                        sum = sum + (equipScores[k] - rawScores[k]);
                    }

                    if (sum > 0) {
                        equipCount++;
                        newPlayChef.remark = equip.name
                        playEquipChefs.push(newPlayChef)
                    }
                }
                chefEquipCount[i] = equipCount
            }
            playChefs = playEquipChefs
        }


        this.tempCalCache.playChefs = playChefs;
        this.tempCalCache.playEquipChefs = playEquipChefs;
        this.tempCalCache.chefCount = playChefs.length;
        this.tempCalCache.scoreCache = new Int32Array(playChefs.length * this.tempCalCache.recipeCount);
        this.tempCalCache.chefEquipCount = chefEquipCount;

        console.log('上场菜谱', playRecipes)
        console.log('上场厨师', playChefs)


        let recipeCount = this.tempCalCache.recipeCount
        let scoreCache = this.tempCalCache.scoreCache;

        //各个品质对应的加成
        for (let i = 0; i <  playChefs.length; i++) {
            const ownChef = playChefs[i];
            for (let t = 0; t < playRecipes.length; t++) {
                const playRecipe = playRecipes[t];
                const index = playRecipe.index;
                const singlePrice = this.kitchenGodCal.calSinglePrice(ownChef, playRecipe);
                scoreCache[i * recipeCount + index] = singlePrice * playRecipe.count;
            }
        }

        //todo 如果考虑遗玉，那么只考虑作用于菜谱的遗玉,一个厨师3个遗玉默认都应该是相同的，所以用三个5星同种遗玉  也就是39%的各种加成
        //在计算得分阶段就 生成17中effect 各个品质对应的加成
        if (false) {
            //计算遗玉
            let useList = ['usebake', 'useboil', 'usestirfry', 'useknife', 'usefry', 'usesteam'
                , 'useTasty', 'useSalty', 'useSpicy', 'useSweet', 'useBitter', 'useSour']

            let effects = [];
            for (const effectItem of useList) {
                let skillEffect = new SkillEffect();

                skillEffect[effectItem] = 0.24;
                effects.push(skillEffect);

            }

            for (let i = 1; i <= 5; i++) {
                //1,2,3,4,5星料理售价加成
                let skillEffect = new SkillEffect();
                skillEffect.rarity[i] = 0.26
                effects.push(skillEffect);
            }


            let amberPrice = this.tempCalCache.amberPrice
            for (let t = 0; t < playRecipes.length; t++) {
                //17种 6技法 6调料 5星级
                const ownRecipe = playRecipes[t];
                let startIndex = t * 17;
                for (let i = 0; i < 17; i++) {
                    const effect = effects[i];
                    const extraPrice = (this.kitchenGodCal.calAmberPrice(ownRecipe, effect) * ownRecipe.count) | 0;
                    amberPrice[startIndex + i] = extraPrice;
                }
            }

            //每个菜的加成已经算出来了，再算一下组合的加成

            // console.log(amberPrice)
        }

    }
}

class MyGameData {
    constructor() {
        this.chefsMap = {};
        this.recipesMap = {};
        this.equipsMap = {};
        this.chefs = [];
        this.equips = [];
        this.recipes = [];
    }
}

class OfficialGameData {
    constructor() {
        this.recipes = null;
        this.materials = null;
        this.chefs = null;
        this.equips = null;
        this.skills = null;
        this.ambers = null;
        this.buffs = null;
        this.intents = null;
        this.equipHashMap = new Map();
        this.skillHashMap = new Map();
        this.chefHashMap = new Map();
        this.recipeHashMap = new Map();
        this.amberHashMap = new Map();
        this.buffHashMap = new Map();
        this.intentHashMap = new Map();
    }

    buildMap() {
        for (let i = 0; i < this.recipes.length; i++) {
            let x = this.recipes[i];
            this.recipeHashMap.set(x.recipeId, x);
        }
        for (let i = 0; i < this.equips.length; i++) {
            let x = this.equips[i];
            this.equipHashMap.set(x.equipId, x);
        }
        for (let i = 0; i < this.skills.length; i++) {
            let x = this.skills[i];
            this.skillHashMap.set(x.skillId, x);
        }
        for (let i = 0; i < this.chefs.length; i++) {
            let x = this.chefs[i];
            this.chefHashMap.set(x.chefId, x);
        }
        for (let i = 0; i < this.ambers.length; i++) {
            let x = this.ambers[i];
            this.amberHashMap.set(x.amberId, x);
        }
        for (let i = 0; i < this.buffs.length; i++) {
            let x = this.buffs[i];
            this.buffHashMap.set(x.buffId, x);
        }
        for (let i = 0; i < this.intents.length; i++) {
            let x = this.intents[i];
            this.intentHashMap.set(x.intentId, x);
        }
    }

    getSkill(id) {
        return this.skillHashMap.get(id);
    }


    buildMaterialFeature() {
        for (const recipe of this.recipes) {
            let materialFeature = BigInt(0n);
            let materials = recipe.materials;
            for (const material of materials) {
                materialFeature = setBit(materialFeature, material.material);
            }
            recipe.materialFeature = materialFeature;
        }
    }


}

class CalConfig {
    /**
     * 计算配置，暂时只有加法额外追加的值
     * */
    constructor(deepLimit, recipeLimit, chefMinRarity, filterScoreRate, useEquip, useAll,mustChefs) {

        this.deepLimit = deepLimit;   //生成菜谱时候的遍历深度
        this.recipeLimit = recipeLimit;//菜谱限制，根据厨神规则排序菜谱，只是用前recipeLimit个菜
        this.chefMinRarity = chefMinRarity;    //上场3个厨师的星级和
        this.filterScoreRate = filterScoreRate;//使用厨具  带实现
        this.useEquip = useEquip;//使用厨具  待实现
        this.useAll = useAll;//拥有全厨师全修炼，全菜谱全专精
        this.mustChefs = ['二郎神'] //不收recipeLimit影响，参与计算的厨师

    }

}

function setBit(m, pos) {
    return m | BigInt(1) << BigInt(pos);
}

function buildChefSkillEffect(officialGameData, chef) {
    const skillEffect = new SkillEffect();
    let skill = officialGameData.getSkill(chef.skill);
    let effect = skill.effect;
    for (let i = 0; i < effect.length; i++) {
        skillEffect.effect(effect[i], skill,chef);
    }

    //如果没修炼，已经把修炼技能删除掉了
    if (chef.ult) {
        const ultimateId = chef.ultimateSkill;
        skill = officialGameData.getSkill(ultimateId);
        if (skill != null) {
            effect = skill.effect;
            for (let i = 0; i < effect.length; i++) {
                skillEffect.effect(effect[i], skill,chef);
            }
        }
    }

    const selfEquipSkillIds = chef.selfEquipSkillIds
    if (selfEquipSkillIds) {
        for (let i = 0; i < selfEquipSkillIds.length; i++) {
            skill = officialGameData.getSkill(selfEquipSkillIds[i])
            if (skill != null) {
                effect = skill.effect;
                for (let i = 0; i < effect.length; i++) {
                    skillEffect.effect(effect[i], skill,chef);
                }
            }
        }
    }

    const amberSkillIds = chef.amberSkillIds
    if (amberSkillIds) {
        for (let i = 0; i < amberSkillIds.length; i++) {
            skill = officialGameData.getSkill(amberSkillIds[i])
            if (skill != null) {
                effect = skill.effect;
                for (let i = 0; i < effect.length; i++) {
                    skillEffect.effect(effect[i], skill,chef);
                }
            }
        }
    }


    chef.skillEffect = skillEffect;
    // if (chef.name == '二郎神'){
    //     debugger
    // }
    // if (chef.name == '兰飞鸿'){
    //     debugger
    // }
    return skillEffect;
}

function cloneChef(chef) {
    let chef1 = Object.create(chef);
    for (let p in chef) {
        if (chef.hasOwnProperty(p))
            chef1[p] = chef[p];
    }
    return chef1;
}

export {GodInference, OfficialGameData, MyGameData, CalConfig, Calculator}
