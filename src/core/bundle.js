/* Generated from Java with JSweet 3.0.0 - http://www.jsweet.org */
import {ChefAndRecipeThread} from './calThread.js'

class CalConfig {
    /**
     * 计算配置，暂时只有加法额外追加的值
     * */
    constructor(deepLimit,recipeLimit, chefMinRarity, useEquip, useAll) {

        this.deepLimit = deepLimit;   //生成菜谱时候的遍历深度
        this.chefMinRarity = chefMinRarity;    //上场3个厨师的星级和
        this.useEquip = useEquip;//使用厨具  带实现
        this.useAll = useAll;//拥有全厨师全修炼，全菜谱全专精
        this.recipeLimit = recipeLimit;//菜谱限制，根据厨神规则排序菜谱，只是用前recipeLimit个菜
    }

}


class Calculator {
    constructor(useAll, recipeReward, sexReward, decorationEffect) {
        this.base = 1 + (decorationEffect ? decorationEffect : 0); //基础倍率和装饰的影响
        this.recipeReward = recipeReward ? recipeReward : new Array(7000).fill(0);
        this.sexReward = sexReward ? sexReward : [0, 0];
        this.useAll = useAll;
        this.qualityAdd = [-1, 0, 0.1, 0.3, 0.5, 1.0];
        this.quality = new Array(2000);
        for (let i = 0; i < 2000; i++) {
            this.quality[i] = new Array(400).fill(0);
        }
        this.initDivisionResult();
    }

    /*private*/
    initDivisionResult() {
        const one = this.quality.length;
        const two = this.quality[0].length;
        for (let i = 1; i < one; i++) {
            for (let i2 = 1; i2 < two; i2++) {
                this.quality[i][i2] = (i / i2 | 0);
            }
        }
        for (let i = 1; i < one; i++) {
            this.quality[i][0] = -1;
        }
    }

    /**
     * 用于计算在没有厨具的情况下，一个菜可以达到的品质
     * <p>
     * @param {Chef} chef
     * @param {SkillEffect} effect
     * @param {CalRecipe} recipe
     * @return {double}
     */
    qualityAddNoEquip(chef, effect, recipe) {
        let ratio = 5, t, s;
        if (recipe.bake !== 0) {
            s = (chef.bake + effect.bake) * (1 + effect.bakePercent);
            s = Math.max(0, s);
            t = this.quality[(s | 0)][recipe.bake];
            ratio = t < ratio ? t : ratio;
        }
        if (recipe.boil !== 0) {
            s = (chef.boil + effect.boil) * (1 + effect.boilPercent);
            s = Math.max(0, s);
            t = this.quality[(s | 0)][recipe.boil];
            ratio = t < ratio ? t : ratio;
        }
        if (recipe.stirfry !== 0) {
            s = (chef.stirfry + effect.stirfry) * (1 + effect.stirfryPercent);
            s = Math.max(0, s);
            t = this.quality[(s | 0)][recipe.stirfry];
            ratio = t < ratio ? t : ratio;
        }
        if (recipe.knife !== 0) {
            s = (chef.knife + effect.knife) * (1 + effect.knifePercent);
            s = Math.max(0, s);
            t = this.quality[(s | 0)][recipe.knife];
            ratio = t < ratio ? t : ratio;
        }
        if (recipe.fry !== 0) {
            s = (chef.fry + effect.fry) * (1 + effect.fryPercent);
            s = Math.max(0, s);
            t = this.quality[(s | 0)][recipe.fry];
            ratio = t < ratio ? t : ratio;
        }
        if (recipe.steam !== 0) {
            s = (chef.steam + effect.steam) * (1 + effect.steamPercent);
            s = Math.max(0, s);
            t = this.quality[(s | 0)][recipe.steam];
            ratio = t < ratio ? t : ratio;
        }
        return this.qualityAdd[(ratio | 0)];
    }

    skillAdd(effect, recipe) {
        let add = 0;
        if (recipe.bake !== 0) {
            add += (effect.usebake);
        }
        if (recipe.boil !== 0) {
            add += (effect.useboil);
        }
        if (recipe.stirfry !== 0) {
            add += (effect.usestirfry);
        }
        if (recipe.knife !== 0) {
            add += (effect.useknife);
        }
        if (recipe.fry !== 0) {
            add += (effect.usefry);
        }
        if (recipe.steam !== 0) {
            add += (effect.usesteam);
        }


        if (recipe.Tasty) {
            add += (effect.useTasty);
        }
        if (recipe.Salty) {
            add += (effect.useSalty);
        }
        if (recipe.Spicy) {
            add += (effect.useSpicy);
        }
        if (recipe.Sweet) {
            add += (effect.useSweet);
        }
        if (recipe.Bitter) {
            add += (effect.useBitter);
        }
        if (recipe.Sour) {
            add += (effect.useSour);
        }


        //console.log(recipe)
        const tags = recipe.tags;
        add += (effect.usecreation * tags[0]) + (effect.usemeat * tags[1]) + (effect.usevegetable * tags[2]) + (effect.usefish * tags[3]);
        return add;
    }

    /**
     * 计算遗玉能带来的加成
     * */
    calAmberPrice(ownRecipe, effect) {
        let price = ownRecipe.price;

        return price * this.skillAdd(effect, ownRecipe);


    }

    calSinglePrice(ownChef, ownRecipe, decorationEffect) {
        let qualityAddS = 0;  //技法加成
        let skillEffect = ownChef.skillEffect;
        const rarity = skillEffect.rarity;
        let qualityAddQ = this.qualityAddNoEquip(ownChef, skillEffect, ownRecipe); //品质加成
        if (qualityAddQ < 0) {
            return 0;
        }

        let sexAdd = 0;

        let tags = ownChef.tags;
        if (tags != null && tags.length > 0) {
            for (const sexTag of tags) {
                if (sexTag <= 2) {
                    sexAdd += this.sexReward[sexTag - 1];
                }
            }
        }


        //根据品质生效的技能
        if (skillEffect.excessRank.length > 0) {
            let excessRank = skillEffect.excessRank;
            for (let j = 0; j < excessRank.length; j++) {
                let rank = excessRank[j];
                if (this.qualityAdd[rank[0]] <= qualityAddQ) {
                    qualityAddS += rank[1];
                }
            }
        }

        //根据份数生效的技能
        //todo 这个不确定是不是加在这里
        if (skillEffect.excessCookbookNum.length > 0) {
            let excessCookbookNumArr = skillEffect.excessCookbookNum;
            for (let j = 0; j < excessCookbookNumArr.length; j++) {
                let excessCookbookNum = excessCookbookNumArr[j];
                let count = excessCookbookNum[0];
                let value = excessCookbookNum[1];
                if (count >= ownRecipe.count) {
                    qualityAddS += value;
                }
            }
        }

        if (skillEffect.fewerCookbookNum.length > 0) {
            let fewerCookbookNumArr = skillEffect.fewerCookbookNum;
            for (let j = 0; j < fewerCookbookNumArr.length; j++) {
                let fewerCookbookNum = fewerCookbookNumArr[j];
                let count = fewerCookbookNum[0];
                let value = fewerCookbookNum[1];
                if (count <= ownRecipe.count) {
                    qualityAddS += value;
                }
            }
        }

        qualityAddS += this.skillAdd(skillEffect, ownRecipe);
        let price = ownRecipe.price;
        return Math.ceil(price * (this.base + this.recipeReward[ownRecipe.recipeId] + sexAdd + qualityAddQ + qualityAddS + this.useAll[ownRecipe.rarity] + rarity[ownRecipe.rarity])) | 0;
    }


    calSkillPrice(ownRecipe, skillEffect) {

        const rarity = skillEffect.rarity;


        let qualityAddS = this.skillAdd(skillEffect, ownRecipe);
        let price = ownRecipe.price;


        return Math.ceil(price * (qualityAddS)) | 0;
    }
}


class GlobalAddition {
    constructor(chefs, skills) {
        this.bake = 0;
        this.boil = 0;
        this.stirfry = 0;
        this.knife = 0;
        this.fry = 0;
        this.steam = 0;
        this.manfill = 0;
        this.womanfill = 0;
        this.price = 0;
        //各个星级菜谱的售价加成
        this.useall = [0, 0, 0, 0, 0, 0];
        this.maxequiplimit = [0, 0, 0, 0, 0, 0];
        this.init(chefs, skills)
    }

    init(chefs, skills1) {
        const skills = new Map();
        for (let i = 0; i < skills1.length; i++) {
            let skill = skills1[i];
            skills.set(skill.skillId, skill);
        }
        for (let i = 0; i < chefs.length; i++) {
            let chef = chefs[i];
            if (this.hasXiuLian(chef)) {
                const skill = skills.get(chef.ultimateSkill);
                if (skill == null) {
                    continue;
                }
                for (let j = 0; j < skill.effect.length; j++) {
                    let effect = skill.effect[j];
                    this.parseEffect(effect);
                }
            }

            //记不清为啥要拿技能走一遍了，3星技能也有全局加成吗?
            const skill = skills.get(chef.skill);
            if (skill == null) {
                continue;
            }
            for (let j = 0; j < skill.effect.length; j++) {
                let effect = skill.effect[j];
                this.parseEffect(effect);
            }

        }
        for (let i = 0; i < this.useall.length; i++) {
            this.useall[i] = this.useall[i] / 100;
        }
        this.manfill = Math.floor(this.manfill / 6);
        this.womanfill = Math.floor(this.womanfill / 6)

    }

    parseEffect(effect) {
        const type = effect.type;
        if (effect.condition === ("Global")) {
            if (effect.tag != null) {
                //男女技法区分
                if (effect.tag === 1) {
                    this.manfill = this.manfill + effect.value;
                } else if (effect.tag === 2) {
                    this.womanfill = this.womanfill + effect.value;
                }
            } else {
                switch ((type)) {
                    case "Bake":
                        this.bake = this.bake + effect.value;
                        break;
                    case "Steam":
                        this.steam = this.steam + effect.value;
                        break;
                    case "Boil":
                        this.boil = this.boil + effect.value;
                        break;
                    case "Fry":
                        this.fry = this.fry + effect.value;
                        break;
                    case "Knife":
                        this.knife = this.knife + effect.value;
                        break;
                    case "Stirfry":
                        this.stirfry = this.stirfry + effect.value;
                        break;
                    case "MaxEquipLimit":
                        this.maxequiplimit[effect.rarity] += effect.value;
                        break;
                    case "UseAll":
                        //菜谱售价
                        this.useall[effect.rarity] += effect.value;
                        break;
                    default:
                        break;
                }
            }
        }
    }

    hasXiuLian(chef) {
        return chef.ult;
    }
}

class PlayRecipe {
    constructor(recipe, count) {
        this.id = 0;
        this.singeprice = 0;
        this.totalprice = 0;
        this.recipe = recipe;
        this.count = count;
        this.id = recipe.recipeId;
    }

    /**
     * @return {PlayRecipe}
     */
    clone() {
        let old = Object.create(this);
        for (let p in this) {
            if (this.hasOwnProperty(p))
                old[p] = this[p];
        }
        return old;
    }

    getRecipe() {
        return this.recipe;
    }


    /**
     *
     * @return {string}
     */
    toString() {
        return "{\"recipe\" : \"" + this.recipe.name + "\", \"count\" :" + this.count + '}';
    }
}

class GodInference {
    constructor(officialGameData, myGameData, recipeReward, sexReward, materials, calConfig) {
        this.useEquip = false;

        if (calConfig != null) {
            this.chefMinRarity = calConfig.chefMinRarity;
            this.deepLimit = calConfig.deepLimit;
            this.recipeLimit = calConfig.recipeLimit;
            this.useEquip = calConfig.useEquip;
        }


        this.ownChefs = null;
        this.ownRecipes = null;
        this.ownEquips = null;
        this.tempOwnRecipes = null;
        this.playRecipes = []; //上场菜谱
        this.playEquips = []; //上场厨具
        this.tempCalCache = null;
        this.counts = new Array(7000).fill(0);
        this.prices = new Array(7000).fill(0);
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
        this.initOwn();

        //将全局技法加成
        GodInference.modifyChefValue(this.ownChefs, this.globalAddtion);

        this.buildRecipeTags();


        if (this.useEquip) {
            //todo 带实现，如果使用厨具，则把厨师按照出局数量，扩充计算

        }

    }

    /**
     * @param {Chef[]} chefs         厨师数组
     * @param {GlobalAddition} globalAddtion 全体加成
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
        this.buildIndex();
        const builder = new TempCalCache.builder();
        builder.init(this.ownChefs, this.ownRecipes, this.ownEquips, this.officialGameData, this.globalAddtion, this.recipeReward, this.sexReward);
        this.tempCalCache = builder.build();
    }


    /**
     * 有的菜谱id过于大，正常id小于1000，后厨的普遍5000多，如果用一维数组存菜谱id，则有很多空间浪费
     * 这里做一重排，用从0开始的连续数字代替id
     */
    buildIndex() {
        console.time('排列菜谱')

        /*
        * 目前来看 菜谱都集中在前几十道菜上
        *
        * */
        const ingredientLimit = new IngredientLimit(this.materials)
        const finalMaterialCount = ingredientLimit.getFinalMaterialCount();
        const recipeCounts = this.calQuantity(finalMaterialCount);
        this.sortOfPrice(recipeCounts, this.tempOwnRecipes);
        this.tempOwnRecipes = this.tempOwnRecipes.slice(0, Math.min(this.recipeLimit, this.tempOwnRecipes.length));

        this.recipePermutation(1, [], ingredientLimit);
        console.timeEnd('排列菜谱')
        console.info("候选菜谱列表" + this.playRecipes.length);


        // this.tempTest();
        const maps = new Map();
        let index= 0;
        for (let i = 0; i < this.playRecipes.length; i++) {
            let recipesTemp = this.playRecipes[i];
            for (let j = 0; j < 9; j++) {
                let playRecipe = recipesTemp[j];
                const count = playRecipe.count;
                const recipeId = playRecipe.getRecipe().recipeId;
                const mapId = count << 14 | recipeId;
                let calRecipe = maps.get(mapId);
                if (calRecipe == null) {
                    calRecipe = new CalRecipe(playRecipe.getRecipe(), count);
                    calRecipe.index=index;
                    playRecipe.index=index;
                    maps.set(mapId, calRecipe);
                    index++;
                }else {
                    playRecipe.index=calRecipe.index;
                }
            }
        }
        console.log("菜谱种类", maps.size)

        this.ownRecipes = new Array(maps.size)
        for (let [key, value] of maps.entries()) {
            this.ownRecipes[value.index] = value
        }
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

        const playRecipesArr = new Int32Array(this.playRecipes.length * 9);

        for (let i = 0; i < this.playRecipes.length; i++) {
            let playRecipes = this.playRecipes[i];
            for (let j = 0; j < 9; j++) {
                playRecipesArr[i * 9 + j] = playRecipes[j].index    //idToIndex.get(playRecipes[j].getRecipe().recipeId)
            }
            //让新放入的9个值从小打到排列
            this.sortArraySegment(playRecipesArr, i * 9, i * 9 + 8)
        }

        let topPlayChefs = [];
        let total = this.playRecipes.length;
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
            chefCount: this.tempCalCache.chefCount,
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
            let ownChef = this.ownChefs[chefIds[i]];
            let name1 = this.ownRecipes[recipeIds[(i * 3)]].name;
            let count1 = this.ownRecipes[recipeIds[(i * 3)]].count;
            let name2 = this.ownRecipes[recipeIds[(i * 3) + 1]].name;
            let count2 = this.ownRecipes[recipeIds[(i * 3) + 1]].count;
            let name3 = this.ownRecipes[recipeIds[(i * 3) + 2]].name;
            let count3 = this.ownRecipes[recipeIds[(i * 3) + 2]].count;
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
            this.playRecipes.push(play);
            return;
        }

        const limit = this.deepLimit[index];

        //拷贝食材数量
        const finalMaterialCount = ingredientLimit.getFinalMaterialCount();

        //计算奖励倍数加持下,根据剩余食材计算各个菜最多做多少份
        let recipeCounts = this.calQuantity(finalMaterialCount);


        const removes = [];
        for (let i = 0; i < limit; i++) {
            //根据份数计算得分，并降序排列返回
            this.sortOfPrice(recipeCounts, this.tempOwnRecipes);
            const selectRecipe = this.tempOwnRecipes.shift();
            removes.push(selectRecipe);
            const quantity = recipeCounts[selectRecipe.recipeId];
            if (quantity===0){
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
     * @param {int[]} materialCount 各种食材的剩余数量,数组下标对应食材的id
     * @return {int[]}
     */
    calQuantity(materialCount) {
        let counts = new Array(7000).fill(0)
        const maxequiplimit = this.globalAddtion.maxequiplimit;
        const length = this.tempOwnRecipes.length;
        for (let i = 0; i < length; i++) {
            let ownRecipe = this.tempOwnRecipes[i];
            const count = IngredientLimit.cookingQuantity(ownRecipe.materials2, ownRecipe.limit + maxequiplimit[ownRecipe.rarity], materialCount);
            counts[ownRecipe.recipeId] = count;
        }
        return counts;
    }

    sortOfPrice(quantity, recipes, limit) {
        let prices = new Array(7000).fill(0);
        for (let i = 0; i < recipes.length; i++) {
            let ownRecipe = recipes[i];
            const reward = this.recipeReward[ownRecipe.recipeId];
            prices[ownRecipe.recipeId] = ((ownRecipe.price * (1 + reward) * quantity[ownRecipe.recipeId]) | 0);
        }

        //返回每个菜对应的索引位置

        recipes.sort((r1, r2) => {
            return prices[r2.recipeId] - prices[r1.recipeId];
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
            return chef.rarity >= this.chefMinRarity;
        }).sort((chef, chef2) => {
            return chef.chefId - chef2.chefId;
        });

        this.tempOwnRecipes = this.myGameData.recipes;
        for (let tempOwnRecipe of this.tempOwnRecipes) {
            tempOwnRecipe.materials2 = tempOwnRecipe.materials
        }
        let equips = []
        if (this.useEquip) {
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
            * */


            equips = this.officialGameData.equips;
            let equipTemp = []
            for (let i = 0; i < equips.length; i++) {
                let equip = equips[i];
                //console.log(equip)
                if (equip.rarity !== 3) {
                    continue;
                }

                let equipSkillIds = equip.skill;

                let reduce = false;   //是否有减少技法相关
                let price = false; //是否有售价相关技法


                let useTotal = 0; //理论上最高售价加成

                for (let skillId of equipSkillIds) {
                    let skill = skillHashMap.get(skillId)
                    for (const effect of skill.effect) {
                        if (effect.type.startsWith('Use')) {
                            //console.log(effect.value)
                            if (effect.value > 0) {
                                price = true;
                                useTotal += effect.value;
                            }
                        }

                        if (['Bake', 'Steam', 'Boil', 'Fry', 'Knife', 'Stirfry'].includes(effect.type)) {
                            if (effect.value < 0) {
                                reduce = true;
                                break;
                            }
                        }
                    }
                }

                if (!reduce && price && useTotal >= 20) {
                    //console.log(equip)
                    equipTemp.push(equip)
                }

            }
            equips = equipTemp;
            this.playEquips = equips;

            //重新生成 this.ownChefs
            console.log('候选厨具数量 ' + equips.length)
            let newOwnChefs = []

            for (const ownChef of this.ownChefs) {

                //这里给厨师分配厨具的时候， 口味都可，四种啥都可，  技法类需要和厨师适配
                for (const equip of equips) {
                    let newOwnChef = this.cloneChef(ownChef);
                    newOwnChef.selfEquipSkillIds = equip.skill
                    newOwnChef.remark = equip.name
                    newOwnChefs.push(newOwnChef)
                }
            }
            this.ownChefs = newOwnChefs;
        }


        for (const ownChef of this.ownChefs) {

            buildChefSkillEffect(this.officialGameData, ownChef);

            // if (ownChef.name==='羽十六'){
            //     //console.log(ownChef.bake)
            //   //  debugger
            // }

        }


    }

    cloneChef(chef) {
        let chef1 = Object.create(chef);
        for (let p in chef) {
            if (chef.hasOwnProperty(p))
                chef1[p] = chef[p];
        }
        return chef1;
    }
}


class IngredientLimit {
    constructor(ingredientNum) {
        if (typeof ingredientNum === 'number') {
            this.materialCount = new Int32Array(47)
            this.extraLimit = [0, 0, 0, 0, 0, 0];
            this.materialCount.fill(ingredientNum);
        } else {
            this.materialCount = new Int32Array(47)
            this.extraLimit = [0, 0, 0, 0, 0, 0];
            if (ingredientNum.length >= 47) {
                this.materialCount = ingredientNum;
            } else {
                this.materialCount.fill(50);
            }
        }
    }

    static __static_initialize() {
        if (!IngredientLimit.__static_initialized) {
            IngredientLimit.__static_initialized = true;
            IngredientLimit.__static_initializer_0();
        }
    }

    static cacheResult_$LI$() {
        IngredientLimit.__static_initialize();
        if (IngredientLimit.cacheResult == null) {
            IngredientLimit.cacheResult = new Array(1000);
            for (let i = 0; i < 1680; i++) {
                IngredientLimit.cacheResult[i] = new Array(50).fill(0);
            }
        }
        return IngredientLimit.cacheResult;
    }

    static __static_initializer_0() {
        for (let i = 0; i < IngredientLimit.cacheResult_$LI$().length; i++) {
            for (let j = 1; j < IngredientLimit.cacheResult_$LI$()[i].length; j++) {
                IngredientLimit.cacheResult_$LI$()[i][j] = (i / j | 0);
            }
        }
    }

    cookingQuantity(recipe, count) {
        //const limit = recipe.limit + this.extraLimit[recipe.rarity];
        //expected = expected < limit ? expected : limit;
        // return IngredientLimit.cookingQuantityAndReduce(((a1, a2) => {
        //     if (a1.length >= a2.length) {
        //         a1.length = 0;
        //         a1.push.apply(a1, a2);
        //         return a1;
        //     } else {
        //         return a2.slice(0);
        //     }
        // })([], recipe.materials), expected, this.materialCount);
        IngredientLimit.cookingQuantityAndReduce(recipe.materials, count, this.materialCount);
    }

    static cookingQuantity(materials, expected, materialCount) {
        let max = expected, t;
        const length = materials.length;
        for (let i = 0; i < length; i++) {
            const material = materials[i];
            t = materialCount[material.material] / material.quantity;
            t = t | 0;
            max = Math.min(t, max);
        }
        return max;
    }

    static cookingQuantityAndReduce(materials, count, materialCount) {
        let maxCount = count;
        let t;
        const length = materials.length;
        for (let i = 0; i < length; i++) {
            const material = materials[i];
            t = materialCount[material.material] / material.quantity;
            t = t | 0;
            maxCount = t < maxCount ? t : maxCount;
            materialCount[material.material] -= material.quantity * maxCount;
        }
    }

    getFinalMaterialCount() {
        let destinationArray = new Int32Array(47);
        destinationArray.set(this.materialCount);
        return destinationArray;
    }

    setMaterialCount(materialCount) {
        this.materialCount = materialCount;
    }
}

IngredientLimit.__static_initialized = false;

class PlayChef {
    constructor(chef) {
        this.id = 0;
        this.chef = null;
        this.equip = null;
        this.effect = null;
        this.effectCache = null;
        this.recipes = null;
    }

    setChef(chef) {
        this.chef = /* clone */ /* clone */ ((o) => {
            if (o.clone != undefined) {
                return o.clone();
            } else {
                let clone = Object.create(o);
                for (let p in o) {
                    if (o.hasOwnProperty(p))
                        clone[p] = o[p];
                }
                return clone;
            }
        })(chef);
    }

    setRecipes(recipes) {
        this.recipes = recipes;
    }

    setEquip(equip) {
        this.equip = equip;
    }

    /**
     *
     * @return {PlayChef}
     */
    clone() {
        let old = null;
        try {
            old = ((o) => {
                let clone = Object.create(o);
                for (let p in o) {
                    if (o.hasOwnProperty(p))
                        clone[p] = o[p];
                }
                return clone;
            })(this);
        } catch (e) {
            console.error(e.message, e);
        }
        return old;
    }

    /**
     *
     * @return {string}
     */
    toString() {
        if (this.equip != null) {
            return "{\"chef\": \"" + this.chef.name + "\", \"recipes\":" + this.recipes.toString() + "\", \"equip\": \"" + this.equip.name + "\"" + '}';
        }
        return "{\"chef\": \"" + this.chef.name + "\", \"recipes\":" + this.recipes.toString() + "\", \"equip\": \"\"" + '}';
    }
}


class SkillEffect {
    constructor() {
        this.canCal = true;
        this.bake = 0;
        this.boil = 0;
        this.stirfry = 0;
        this.knife = 0;
        this.fry = 0;
        this.steam = 0;
        this.bakePercent = 0;
        this.boilPercent = 0;
        this.stirfryPercent = 0;
        this.knifePercent = 0;
        this.fryPercent = 0;
        this.steamPercent = 0;

        this.usefish = 0;
        this.usecreation = 0;
        this.usemeat = 0;
        this.usevegetable = 0;

        this.goldgain = 0;
        this.tempAddtion = null;

        this.usebake = 0;
        this.useboil = 0;
        this.usestirfry = 0;
        this.useknife = 0;
        this.usefry = 0;
        this.usesteam = 0;

        //酸甜苦辣咸苦
        this.useTasty = 0;
        this.useSalty = 0;  //
        this.useSpicy = 0; //辣
        this.useSweet = 0;
        this.useBitter = 0;
        this.useSour = 0;

        //1,2,3,4,5星料理售价加成
        this.rarity = [0, 0, 0, 0, 0, 0]


        // !!!大于等于!!!  某个份数生效
        this.excessCookbookNum = []

        //  !!!小于等于!!!   某个份数生效
        this.fewerCookbookNum = []

        //品质  !!!大于等于!!!  某个级别生效
        this.excessRank = []

    }

    /**
     *
     * @return {SkillEffect}
     */
    clone() {
        let o = this;
        let clone = Object.create(o);
        for (let p in o) {
            if (o.hasOwnProperty(p))
                clone[p] = o[p];
        }
        return clone;
    }

    effect(effect, skill) {
        if ("Partial" === effect.condition) {
            if (this.tempAddtion == null) {
                this.tempAddtion = new TempAddition();
            }
            switch ((effect.type)) {
                case "Bake":
                    this.tempAddtion.bake += effect.value;
                    break;
                case "Steam":
                    this.tempAddtion.steam += effect.value;
                    break;
                case "Boil":
                    this.tempAddtion.boil += effect.value;
                    break;
                case "Fry":
                    this.tempAddtion.fry += effect.value;
                    break;
                case "Knife":
                    this.tempAddtion.knife += effect.value;
                    break;
                case "Stirfry":
                    this.tempAddtion.stirfry += effect.value;
                    break;
                default:
                    break;
            }
        } else if ("Self" === effect.condition) {
            switch (effect.type) {
                case "Bake":
                    if (effect.cal === ("Abs")) {
                        this.bake += effect.value;
                    } else if (effect.cal === ("Percent")) {
                        this.bakePercent += /* doubleValue */ effect.value / 100;
                    }
                    break;
                case "Steam":
                    if (effect.cal === ("Abs")) {
                        this.steam += effect.value;
                    } else if (effect.cal === ("Percent")) {
                        this.steamPercent += /* doubleValue */ effect.value / 100;
                    }
                    break;
                case "Boil":
                    if (effect.cal === ("Abs")) {
                        this.boil += effect.value;
                    } else if (effect.cal === ("Percent")) {
                        this.boilPercent += ( /* doubleValue */effect.value / 100);
                    }
                    break;
                case "Fry":
                    if (effect.cal === ("Abs")) {
                        this.fry += effect.value;
                    } else if (effect.cal === ("Percent")) {
                        this.fryPercent += ( /* doubleValue */effect.value / 100);
                    }
                    break;
                case "Knife":
                    if (effect.cal === ("Abs")) {
                        this.knife += effect.value;
                    } else if (effect.cal === ("Percent")) {
                        this.knifePercent += effect.value / 100;
                    }
                    break;
                case "Stirfry":
                    if (effect.cal === ("Abs")) {
                        this.stirfry += effect.value;
                    } else if (effect.cal === ("Percent")) {
                        this.stirfryPercent += effect.value / 100;
                    }
                    break;
                case "UseBake":
                    this.usebake += effect.value / 100;
                    break;
                case "UseSteam":
                    this.usesteam += effect.value / 100;
                    break;
                case "UseBoil":
                    this.useboil += effect.value / 100;
                    break;
                case "UseFry":
                    this.usefry += effect.value / 100;
                    break;
                case "UseKnife":
                    this.useknife += effect.value / 100;
                    break;
                case "UseStirfry":
                    this.usestirfry += effect.value / 100;
                    break;
                case "UseFish":
                    this.usefish += effect.value / 100;
                    break;
                case "UseCreation":
                    this.usecreation += effect.value / 100;
                    break;
                case "UseMeat":
                    this.usemeat += effect.value / 100;
                    break;
                case "UseVegetable":
                    this.usevegetable += effect.value / 100;
                    break;
                case "Gold_Gain":
                    this.goldgain += effect.value / 100;
                    break;
                case "UseTasty":
                    this.useTasty += effect.value / 100;
                    break;
                case "UseSalty":
                    this.useSalty += effect.value / 100;
                    break;
                case "UseSpicy":
                    this.useSpicy += effect.value / 100;
                    break;
                case "UseSweet":
                    this.useSweet += effect.value / 100;
                    break;
                case "UseBitter":
                    this.useBitter += effect.value / 100;
                    break;
                case "UseSour":
                    this.useSour += effect.value / 100;
                    break;
                case 'MutiEquipmentSkill':
                    //厨具效果翻倍,目前来看都是用在贵客率上了，先不管
                    break;
                case 'BasicPrice':
                    //todo 我还没有这一类的厨师，没法判断计算规则，
                    // console.log('基础售价类技能还没有生效')
                    break;
                case 'CookbookPrice':
                    if (effect.cal === 'Percent') {
                        if (effect.conditionType === 'CookbookRarity') {
                            //console.log(skill)
                            //星级售价加成
                            let conditionValueList = effect.conditionValueList;
                            for (let i = 0; i < conditionValueList.length; i++) {
                                this.rarity[conditionValueList[i]] += effect.value / 100
                            }
                        } else if (effect.conditionType === 'ExcessCookbookNum') {
                            //大于等于多少份才技能生效
                            this.excessCookbookNum.push([effect.conditionValue, effect.value / 100])
                        } else if (effect.conditionType === 'FewerCookbookNum') {
                            //小于等于多少份生效
                            this.fewerCookbookNum.push([effect.conditionValue, effect.value / 100])
                        } else if (effect.conditionType === 'Rank') {
                            //制作的品质大于等于某个级别时，增加售价  1可 2优 3特 4神 5传
                            this.excessRank.push([effect.conditionValue, effect.value / 100])
                        } else {
                            console.log('出现了没考虑到的参数')
                            console.log(skill, effect)
                        }
                    } else {
                        console.log('出现了没考虑到的参数')
                        console.log(skill, effect)
                    }
                    break


                case  "GuestApearRate":
                case  "GuestAntiqueDropRate":

                case  "InvitationApearRate":
                case  "SpecialInvitationRate":

                case   "Vegetable":
                case   "Meat":
                case   "Fish":
                case   "Creation":
                case   "Material_Gain":
                case   "Material_Creation":
                case   "Material_Fish":
                case   "Material_Vegetable":
                case   "Material_Meat":

                case   "Rejuvenation":
                case   "GuestDropCount":


                case   "ExploreTime":
                //酸甜技法加成只影响采集，忽略
                case   "Sour":
                case   "Sweet":
                case   "Bitter":
                case   "Salty":
                case   "Spicy":
                case   "Tasty":

                    break
                default:
                    console.log('effect的type没有被考虑到,需要处理', skill, effect)
                    break;
            }
        } else if (effect.condition === 'Next') {
            //todo 影响下一位上场厨师
            // console.log('下一位上场厨师类技能还没有生效')
        } else if (effect.condition !== 'Global') {
            console.warn('新类型的effect,需要处理', skill, effect)

        }
    }

}


class TempAddition {
    constructor() {
        this.bake = 0;
        this.boil = 0;
        this.stirfry = 0;
        this.knife = 0;
        this.fry = 0;
        this.steam = 0;
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

        this.scoreCache = new Int32Array(chefIndexMax * recipeIndexMax);
        this.amberPrice = new Int32Array(recipeIndexMax * 17);
        this.groupRecipeIndex = null;


    }
}

class builder {
    constructor() {
        if (this.tempCalCache === undefined) {
            this.tempCalCache = null;
        }
        this.recipeReward = null;
        this.sexReward = null;
        this.officialGameData = null;
        this.globalAddtion = null;
        this.kitchenGodCal = null;
        this.ownChefs = null;
        this.ownRecipes = null;
        this.tempEffect = new SkillEffect();
    }

    init(ownChefs, ownRecipes, ownEquips, officialGameData, globalAddtion, recipeReward, sexReward) {
        this.officialGameData = officialGameData;
        this.globalAddtion = globalAddtion;
        this.kitchenGodCal = new Calculator(globalAddtion.useall, recipeReward, sexReward);
        this.ownChefs = ownChefs;
        this.ownRecipes = ownRecipes;
        this.recipeReward = recipeReward;
        this.sexReward = sexReward;

        this.tempCalCache = new TempCalCache(ownChefs.length, ownRecipes.length);
    }

    updateIdAndAddEffect() {
        //this.validEffectParseIsOk();
        for (let i = 0; i < this.ownChefs.length; i++) {
            const ownChef = this.ownChefs[i];
            ownChef.index = i;
        }
    }

    build() {
        this.updateIdAndAddEffect();
        this.initCache();
        return this.tempCalCache;
    }

    initCache() {
        const recipeCount = this.tempCalCache.recipeCount
        const chefCount = this.tempCalCache.chefCount
        const scoreCache = this.tempCalCache.scoreCache;
        //各个品质对应的加成
        for (let i = 0; i < this.ownChefs.length; i++) {
            const ownChef = this.ownChefs[i];
            for (let t = 0; t < this.ownRecipes.length; t++) {
                const ownRecipe = this.ownRecipes[t];
                const index = ownRecipe.index;
                const singlePrice = this.kitchenGodCal.calSinglePrice(ownChef, ownRecipe);
                scoreCache[i * recipeCount + index] = singlePrice * ownRecipe.count;
            }
        }

        //todo 如果考虑遗玉，那么只考虑作用于菜谱的遗玉,一个厨师3个遗玉默认都应该是相同的，所以用三个5星同种遗玉  也就是39%的各种加成
        //并且在计算得分阶段就


        //各个品质对应的加成
        //生成17中effect

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
            for (let t = 0; t < this.ownRecipes.length; t++) {
                //17种 6技法 6调料 5星级
                const ownRecipe = this.ownRecipes[t];
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


    validEffectParseIsOk() {
        //验证一遍所有数据的技能效果是否都被考虑到了

        let equips = this.officialGameData.equips;

        for (let i = 0; i < equips.length; i++) {
            const skillEffect2 = new SkillEffect();
            let equip = equips[i];
            let skillIds = equip.skill
            for (let i = 0; i < skillIds.length; i++) {
                let skill = this.officialGameData.getSkill(skillIds[i])
                if (skill != null) {
                    let effect = skill.effect;
                    for (let i = 0; i < effect.length; i++) {
                        skillEffect2.effect(effect[i], skill);
                    }
                }
            }
        }

        let chefs = this.officialGameData.chefs;
        for (let i = 0; i < chefs.length; i++) {
            const skillEffect2 = new SkillEffect();
            let chef = chefs[i];
            let skillId = chef.skill
            let skill = this.officialGameData.getSkill(skillId)
            let effect = skill.effect;
            for (let i = 0; i < effect.length; i++) {
                skillEffect2.effect(effect[i], skill);
            }
            skill = this.officialGameData.getSkill(chef.ultimateSkill);
            if (skill != null) {
                effect = skill.effect;
                for (let i = 0; i < effect.length; i++) {
                    skillEffect2.effect(effect[i], skill);
                }
            }

        }
    }
}


TempCalCache.builder = builder;


function buildChefSkillEffect(officialGameData, chef) {
    const skillEffect = new SkillEffect();
    let skill = officialGameData.getSkill(chef.skill);
    let effect = skill.effect;
    for (let i = 0; i < effect.length; i++) {
        skillEffect.effect(effect[i], skill);
    }
    //如果没修炼，已经把修炼技能删除掉了
    if (chef.ult) {
        const ultimateId = chef.ultimateSkill;
        skill = officialGameData.getSkill(ultimateId);
        if (skill != null) {
            effect = skill.effect;
            for (let i = 0; i < effect.length; i++) {
                skillEffect.effect(effect[i], skill);
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
                    skillEffect.effect(effect[i], skill);
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
                    skillEffect.effect(effect[i], skill);
                }
            }
        }
    }


    chef.skillEffect = skillEffect;
    return skillEffect;
}


class TopResult {
    constructor(playChefs, recipeIndex, score) {
        this.chefs = null;
        this.recipeids = null;
        this.id = 0;
        this.score = 0;
        this.update(playChefs, recipeIndex, score);
    }

    update(playChefs, recipeIndex, score) {
        this.chefs = playChefs;
        this.recipeids = recipeIndex;
        this.score = score;
    }
}


class CalRecipe {
    constructor(recipe, count) {
        this.index = 0;
        this.id = 0;
        this.attributeTags = null;
        this.count = count;
        this.recipeId = recipe.recipeId;
        this.name = recipe.name;
        this.stirfry = recipe.stirfry;
        this.boil = recipe.boil;
        this.knife = recipe.knife;
        this.fry = recipe.fry;
        this.bake = recipe.bake;
        this.steam = recipe.steam;
        this.price = recipe.price;
        this.exPrice = recipe.exPrice;
        this.rarity = recipe.rarity;
        this.tags = recipe.tags;


        this.Tasty = false;
        this.Salty = false;
        this.Spicy = false;
        this.Sweet = false;
        this.Bitter = false;
        this.Sour = false;


        this[recipe.condiment] = true;

        this.id = count << 14 | this.recipeId;
        this.recipe =recipe;
    }


    /**
     * @return {string}
     */
    toString() {
        let str = {
            recipe: this.name,
            count: this.count
        }
        return JSON.stringify(str);
    }
}


class Chef {
    constructor() {
        this.index = 0;
        this.chefId = 0;
        this.galleryId = null;
        this.name = null;
        this.origin = null;
        this.rarity = 0;
        this.bake = 0;
        this.boil = 0;
        this.stirfry = 0;
        this.knife = 0;
        this.fry = 0;
        this.steam = 0;
        this.creation = 0;
        this.fish = 0;
        this.meat = 0;
        this.condiment = null; //调料口味
        this.skill = null;
        this.ultimateGoal = null;
        this.ultimateSkill = null;
        this.ult = false;
        this.tags = null;
        this.equip = null;
        this.skillEffect = null;
    }

    /**
     * @return {Chef}
     */
    clone() {
        let chef1 = Object.create(this);
        for (let p in this) {
            if (this.hasOwnProperty(p))
                chef1[p] = this[p];
        }
        return chef1;
    }
}

Chef.SEX_MAN = 1;
Chef.SEX_WOMAN = 2;


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

function setBit(m, pos) {
    return m | BigInt(1) << BigInt(pos);
}

class SortUtils {

    static quickSort(array) {
        const stack = new Array(array.length * 2).fill(0)
        let top = 0;
        let low = 0;
        let high = array.length - 1;
        let par = SortUtils.partion(array, low, high);
        if (par > low + 1) {
            stack[top++] = low;
            stack[top++] = par - 1;
        }
        if (par < high - 1) {
            stack[top++] = par + 1;
            stack[top++] = high;
        }
        while ((top > 0)) {
            high = stack[--top];
            low = stack[--top];
            par = SortUtils.partion(array, low, high);
            if (par > low + 1) {
                stack[top++] = low;
                stack[top++] = par - 1;
            }
            if (par < high - 1) {
                stack[top++] = par + 1;
                stack[top++] = high;
            }
        }
    }

    /*private*/
    static partion(array, low, high) {
        const temp = array[low];
        while ((low < high)) {
            while (((low < high) && temp <= array[high])) {
                high--;
            }
            if (low >= high) {
                break;
            } else {
                array[low] = array[high];
            }
            while (((low < high) && array[low] <= temp)) {
                low++;
            }
            if (low === high) {
                break;
            } else {
                array[high] = array[low];
            }
        }
        array[low] = temp;
        return low;
    }

    static sort(arr) {
        for (let i = 1; i < arr.length; i++) {
            for (let j = 0; j < arr.length - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    const temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }
}


IngredientLimit.cacheResult_$LI$();
IngredientLimit.__static_initialize();


//这些用不到，但是可以当作参考，知道都有那些字段


class Effect {
    constructor() {
        this.type = null;
        this.value = null;
        this.condition = null;
        this.cal = null;
        this.rarity = null;
        this.tag = null;
        this.conditionType = null;
        this.conditionValue = null;
        this.conditionValueList = null;
    }
}

class GlobalDate {
    constructor() {
        this.ownChefs = null;
        this.ownRecipes = null;
        this.ownEquips = null;
        this.tempCalCache = null;
    }
}

class Ingredient {
    constructor() {
        this.materialId = 0;
        this.name = null;
        this.origin = null;
    }
}

class Material {
    constructor() {
        this.material = 0;
        this.quantity = 0;
    }
}


class Recipe {
    constructor() {
        this.index = 0;
        this.recipeId = 0;
        this.galleryId = null;
        this.name = null;
        this.rarity = 0;
        this.unlock = null;
        this.stirfry = 0;
        this.boil = 0;
        this.knife = 0;
        this.fry = 0;
        this.bake = 0;
        this.steam = 0;
        this.materials = null;
        this.materials2 = null;
        this.materialFeature = 0;
        this.price = 0;
        this.exPrice = 0;
        this.time = 0;
        this.limit = 0;
        this.origin = null;
        this.gift = null;
        this.sortPrice = 0;
        this.materialRatio = 0;
        this.tags = [0, 0, 0, 0];
    }
}

class Skill {
    constructor() {
        this.skillId = 0;
        this.desc = null;
        this.effect = null;
        this.skillEffect = null;
    }
}

export {GodInference, OfficialGameData, MyGameData, CalConfig, Calculator}
