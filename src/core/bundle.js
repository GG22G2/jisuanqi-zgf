/* Generated from Java with JSweet 3.0.0 - http://www.jsweet.org */
import {ChefAndRecipeThread} from "./calThread.js";

class CalConfig {
    /**
     * 计算配置，暂时只有加法额外追加的值
     * */
    constructor(addBaseValue) {
        this.addBaseValue = addBaseValue;
    }

}

class CacheKitchenGodCal {
    constructor(useAll, recipeReward, sexReward,decorationEffect) {
        this.base = 1 + ( decorationEffect?decorationEffect:0); //基础倍率和装饰的影响
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
        const tags = recipe.tags;
        add += (effect.usecreation * tags[0]) + (effect.usemeat * tags[1]) + (effect.usevegetable * tags[2]) + (effect.usefish * tags[3]);
        return add;
    }

    calSinglePrice(ownChef, ownRecipe,decorationEffect) {
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
                if (this.qualityAdd[rank[0]] >= qualityAddQ) {
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
    constructor(officialGameData, myGameData, recipeReward, sexReward, materials) {
        this.chefMinRaritySum = 14;
        this.deepLimit = [0, 6, 3, 3, 2, 2, 2, 2, 2, 2];
        this.ownChefs = null;
        this.ownRecipes = null;
        this.ownEquips = null;
        this.tempOwnRecipes = null;
        this.playRecipes = [];
        this.playChefs = null;
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
        GodInference.modifyChefValue(this.ownChefs, this.globalAddtion);
        this.buildRecipeTags();
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
        this.recipePermutation(1, [], new IngredientLimit(this.materials));
        console.info("有序菜谱组合数量" + this.playRecipes.length);
        const maps = new Map();
        let quchong = new Set();

        for (let i = 0; i < this.playRecipes.length; i++) {
            let recipesTemp = this.playRecipes[i];
            for (let j = 0; j < 9; j++) {
                let playRecipe = recipesTemp[j];
                const count = playRecipe.count;
                const recipeId = playRecipe.getRecipe().recipeId;
                const mapId = count << 14 | recipeId;
                let calRecipe = maps.get(mapId);
                if (calRecipe == null) {
                    let key = playRecipe.getRecipe().name + count;
                    if (!quchong.has(key)) {
                        calRecipe = new CalRecipe(playRecipe.getRecipe(), count);
                        maps.set(mapId, calRecipe);
                        quchong.add(key)
                    }
                }
            }
        }
        console.log("菜谱种类", maps.size)
        this.compressionAndMapping(maps);
        this.ownRecipes = new Array(maps.size)
        for (let [key, value] of maps.entries()) {
            this.ownRecipes[value.index] = value
        }

    }

    compressionAndMapping(maps) {
        let keys = maps.keys();
        let ints = new Array(maps.size);
        let index = 0;
        for (let key of keys) {
            ints[index++] = key;
        }
        SortUtils.quickSort(ints);
        for (let i = 0; i < ints.length; i++) {
            const calRecipe = maps.get(ints[i]);
            calRecipe.index = i;
        }
    }

    /**
     * 假设: 在没有厨具的情况下得分最高的，在带上厨具后仍然是最高的  虽然不一定，但很可能是一个比较优质的解
     */
    refer() {
        if (this.tempCalCache == null) {
            this.buildCache();
        }
        this.buildPermutation();
        let start = Date.now(), end;
        const playRecipes2 = new Array(this.playRecipes.length);
        for (let i = 0; i < playRecipes2.length; i++) {
            playRecipes2[i] = new Array(9).fill(0);
        }

        const idToIndex = new Map();
        for (let i = 0; i < this.ownRecipes.length; i++) {
            idToIndex.set(this.ownRecipes[i].recipeId, this.ownRecipes[i].index);
        }

        for (let i = 0; i < this.playRecipes.length; i++) {
            let playRecipes = this.playRecipes[i];
            for (let i2 = 0; i2 < 9; i2++) {
                playRecipes2[i][i2] = idToIndex.get(playRecipes[i2].getRecipe().recipeId);
            }
            SortUtils.quickSort(playRecipes2[i]);
        }

        let topPlayChefs = [];
        let total = this.playRecipes.length;
        let groupNum = 4; //线程数
        let maxScoreKey = BigInt(0);
        let works = []
        let that = this;
        let totalP = groupNum * 100;
        let curP = 0;
        let resultCount = 0;
        let segmentnums = total / groupNum;


        //  2*0.625  1*1.25  1*1.25  1*1.25
        //如果平均分配，第一个线程的计算时长是其他线程的两倍，剩余线程比较平均，
        let taskSE = []
        let calStart = 0, calEnd;
        for (let i = 0; i < groupNum; i++) {

            if (i === 0) {
                calStart = 0;
                calEnd = segmentnums * 0.4;
            } else if (i === groupNum - 1) {
                calStart = calEnd;
                calEnd = total;
            } else {
                calStart = calEnd;
                calEnd = calEnd + segmentnums * 1.4;
            }
            calEnd = calEnd | 0
            taskSE.push({
                start: calStart,
                end: calEnd
            })
        }

        console.log(taskSE)

        let data = JSON.stringify({
            playRecipes2,
            playChefs: this.playChefs,
            recipe2Change: GodInference.recipe2Change,
            tempCalCache: this.tempCalCache
        });


        //不同区段的实际计算量是不同的, 计算一般集中的前半部分


        return new Promise(resolve => {
            for (let i = 0; i < groupNum; i++) {
                let calWorker;
                calWorker = new Worker(new URL('./worker.js', import.meta.url))
                works.push(calWorker)
                calWorker.onmessage = function (event) {
                    if (event.data.type === 'p') {
                        curP += event.data.p;
                        postMessage(curP / totalP * 100)
                    } else {
                        const topScoreKey = event.data.maxK;
                        resultCount++;
                        if (topScoreKey > maxScoreKey) {
                            maxScoreKey = topScoreKey;
                        }
                        if (resultCount === groupNum) {
                            topPlayChefs = that.parseLong(playRecipes2, that.playChefs, maxScoreKey);
                            end = Date.now();
                            console.info("全菜谱 全厨师 无厨具排列结果用时::" + (end - start) + "ms");
                            postMessage(100)
                            for (let work of works) {
                                work.terminate();
                            }

                            //生成autoxjs 可用的脚本，自动摆放厨师,但是需要考虑排放顺序


                            resolve(that.calSecondStage(topPlayChefs));

                        }
                    }
                };
                console.time("start")
                let se = taskSE[i];
                calWorker.postMessage({
                    start: se.start,
                    end: se.end,
                    data: data
                })

                //calWorker.postMessage(data)
                console.timeEnd("start")
            }

        });
    }


    /**
     * 保存得分 菜谱，菜谱排列，厨师组合索引   1符号位，20位得分，18位菜谱索引，11位菜谱排列，14位厨师索引
     * cal = ((((cal << 18 | i) << 11) | k) << 14) | i2;
     * @param {int[][]} playRecipes
     * @param {int[][]} playChefs
     * @param {BigInt} socres
     * @return {TopResult[]}
     */
    parseLong(playRecipes, playChefs, scoreKey) {
        const disordePermuation = ChefAndRecipeThread.disordePermuation_$LI$();
        const topResults = ([]);
        let recipeIndex = 0;
        let permuteIndex = 0;
        let chefIndex = 0;
        let score = 0;

        recipeIndex = (scoreKey >> 25n & 262143n);
        permuteIndex = (scoreKey >> 14n & 2047n);
        chefIndex = (scoreKey & 16383n);
        score = ((scoreKey & -17592186044416n) >> 43n);
        const precipes = playRecipes[recipeIndex];
        const ints = disordePermuation[permuteIndex];
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
        const chefs = playChefs[chefIndex];
        const topResult = new TopResult(chefs, recipes, score);
        /* add */

        return topResult;
    }

    /**
     * 第二阶段的计算
     * @param {TopResult} topPlayChef
     */
    calSecondStage(topPlayChef) {
        console.log(topPlayChef.score)
        let chefIds = topPlayChef.chefs;
        let recipeIds = topPlayChef.recepeids;
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

    buildPermutation() {
        this.playChefs = null;
        this.playChefs = this.chefsPermutation();
        console.info("厨师组合数" + this.playChefs.length);
    }

    chefsPermutation() {
        const index2 = [];
        const length = this.ownChefs.length;
        if (length < 3) {
            return null;
        }

        const result = [];
        for (let i = 0; i < length; i++) {
            for (let j = i + 1; j < length; j++) {
                for (let k = j + 1; k < length; k++) {
                    if (this.ownChefs[i].rarity + this.ownChefs[j].rarity + this.ownChefs[k].rarity >= this.chefMinRaritySum) {
                        const s = [0, 0, 0];
                        s[0] = this.ownChefs[i].index;
                        s[1] = this.ownChefs[j].index;
                        s[2] = this.ownChefs[k].index;
                        result.push(s);
                    }
                }
                if (index2.length === 0 || result.length !== index2[ /* size */index2.length - 1]) {
                    index2.push(result.length);
                }
            }
        }

        GodInference.recipe2Change = new Array(index2.length + 1).fill(0);
        for (let i = 0; i < index2.length; i++) {
            GodInference.recipe2Change[i + 1] = index2[i];
        }
        return result;
    }

    recipePermutation(index, play, ingredientLimit) {
        if (index === 10) {
            this.playRecipes.push(play);
            return;
        }
        const limit = this.deepLimit[index];
        const finalMaterialCount = ingredientLimit.getFinalMaterialCount();
        const integerIntegerMap = this.calQuantity(finalMaterialCount);
        this.sortOfPrice(integerIntegerMap, this.tempOwnRecipes);
        const removes = [];
        for (let i = 0; i < limit; i++) {
            const selectRecipe = this.tempOwnRecipes.shift();
            removes.push(selectRecipe);
            const quantity = integerIntegerMap[selectRecipe.recipeId];
            const newplay = [];

            ((l1, l2) => l1.push.apply(l1, l2))(newplay, play);
            ingredientLimit.cookingQuantit(selectRecipe, quantity);
            const clone = ingredientLimit.getFinalMaterialCount();
            const p = new PlayRecipe(selectRecipe, quantity);

            newplay.push(p);
            this.recipePermutation(index + 1, newplay, ingredientLimit);
            ingredientLimit.setMaterialCount(clone);
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
        const maxequiplimit = this.globalAddtion.maxequiplimit;
        const length = this.tempOwnRecipes.length;
        let ownRecipe;
        for (let i = 0; i < length; i++) {
            ownRecipe = this.tempOwnRecipes[i];
            const count = IngredientLimit.cookingQuantit(ownRecipe.materials2, ownRecipe.limit + maxequiplimit[ownRecipe.rarity], materialCount);
            this.counts[ownRecipe.recipeId] = count;
        }
        return this.counts;
    }

    sortOfPrice(quantity, recipes) {
        for (let index132 = 0; index132 < recipes.length; index132++) {
            let ownRecipe = recipes[index132];
            const rew = this.recipeReward[ownRecipe.recipeId];
            this.prices[ownRecipe.recipeId] = (Math.ceil(ownRecipe.price * (1 + rew) * quantity[ownRecipe.recipeId]) | 0);
        }
        recipes.sort((r1, r2) => {
            return this.prices[r2.recipeId] - this.prices[r1.recipeId];
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
            return chef.rarity >= 2;
        }).sort((chef, chef2) => {
            return chef.chefId - chef2.chefId;
        });

        this.tempOwnRecipes = this.myGameData.recipes;
        for (let tempOwnRecipe of this.tempOwnRecipes) {
            tempOwnRecipe.materials2 = tempOwnRecipe.materials
        }

        for (const ownChef of this.ownChefs) {
            buildChefSkillEffect(this.officialGameData, ownChef);
        }


    }
}

GodInference.recipe2Change = null;
GodInference.equip2Change = null;


class IngredientLimit {
    constructor(ingredientNum) {
        if (typeof ingredientNum === 'number') {
            this.materialCount = new Array(47).fill(0)
            this.extraLimit = [0, 0, 0, 0, 0, 0];
            this.materialCount.fill(ingredientNum);
        } else {
            this.materialCount = new Array(47).fill(0)
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

    cookingQuantit(recipe, expected) {
        const limit = recipe.limit + this.extraLimit[recipe.rarity];
        expected = expected < limit ? expected : limit;
        return IngredientLimit.cookingQuantitiyAndReduce(((a1, a2) => {
            if (a1.length >= a2.length) {
                a1.length = 0;
                a1.push.apply(a1, a2);
                return a1;
            } else {
                return a2.slice(0);
            }
        })([], recipe.materials), expected, this.materialCount);
    }

    static cookingQuantit(materials, expected, materialCount) {
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

    static cookingQuantitiyAndReduce(materials, expected, materialCount) {
        let max = expected;
        let t;
        const length = materials.length;
        for (let i = 0; i < length; i++) {
            const material = materials[i];
            t = materialCount[material.material] / material.quantity;
            t = t | 0;
            max = t < max ? t : max;
            materialCount[material.material] -= material.quantity * max;
        }
        return max;
    }

    getFinalMaterialCount() {
        return /* clone */ this.materialCount.slice(0);
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
        this.usebake = 0;
        this.useboil = 0;
        this.usestirfry = 0;
        this.useknife = 0;
        this.usefry = 0;
        this.usesteam = 0;
        this.usefish = 0;
        this.usecreation = 0;
        this.usemeat = 0;
        this.usevegetable = 0;
        this.goldgain = 0;
        this.tempAddtion = null;

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
                    console.log('基础售价类技能还没有生效')
                    break;
                case 'CookbookPrice':
                    if (effect.cal === 'Percent') {
                        if (effect.conditionType === 'CookbookRarity') {
                            console.log(skill)
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
            console.log('下一位上场厨师类技能还没有生效')
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
        this.groupScoreCache = null;
        this.groupScoreCacheNoIndex = null;

        this.chefCount = chefIndexMax;
        this.recipeCount = recipeIndexMax;

        this.scoreCache = new Array(chefIndexMax);
        for (let i = 0; i < chefIndexMax; i++) {
            this.scoreCache[i] = new Array(recipeIndexMax).fill(0)
        }

        this.groupScoreCacheNoIndex = new Array(this.recipeCount);
        for (let i = 0; i < this.recipeCount; i++) {
            this.groupScoreCacheNoIndex[i] = new Array(this.recipeCount).fill(0)
        }
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
        this.kitchenGodCal = new CacheKitchenGodCal(globalAddtion.useall, recipeReward, sexReward);
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
        const scoreCache = this.tempCalCache.scoreCache;
        //各个品质对应的加成
        for (let i = 0; i < this.ownChefs.length; i++) {
            const ownChef = this.ownChefs[i];
            for (let t = 0; t < this.ownRecipes.length; t++) {
                const ownRecipe = this.ownRecipes[t];
                const index = ownRecipe.index;
                const singlePrice = this.kitchenGodCal.calSinglePrice(ownChef, ownRecipe);
                scoreCache[i][index] = singlePrice * ownRecipe.count;
            }
        }

        let indexs = 0;
        const length = this.tempCalCache.recipeCount;
        for (let i = 0; i < length; i++) {
            for (let j = i + 1; j < length; j++) {
                for (let k = j + 1; k < length; k++) {
                    indexs++;
                }
            }
        }
        this.tempCalCache.groupScoreCache = new Array(indexs);

        for (let i = 0; i < indexs; i++) {
            this.tempCalCache.groupScoreCache[i] = new Array(this.tempCalCache.chefCount).fill(0)
        }

        const groupScoreCache = this.tempCalCache.groupScoreCache;
        const groupScoreCacheNoIndex = this.tempCalCache.groupScoreCacheNoIndex;
        for (let t = 0; t < this.tempCalCache.chefCount; t++) {
            let index = 0;
            for (let i = 0; i < length; i++) {
                for (let j = i + 1; j < length; j++) {
                    groupScoreCacheNoIndex[i][j] = index;
                    for (let k = j + 1; k < length; k++) {
                        if (scoreCache[t][i] === 0 || scoreCache[t][j] === 0 || scoreCache[t][k] === 0) {
                            groupScoreCache[index++][t] = 0;
                        } else {
                            groupScoreCache[index++][t] = scoreCache[t][i] + scoreCache[t][j] + scoreCache[t][k];
                        }
                    }
                }
            }
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
        this.recepeids = null;
        this.id = 0;
        this.score = 0;
        this.update(playChefs, recipeIndex, score);
    }

    update(playChefs, recipeIndex, score) {
        this.chefs = playChefs;
        this.recepeids = recipeIndex;
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
        this.id = count << 14 | this.recipeId;
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
        this.equipHashMap = new Map();
        this.skillHashMap = new Map();
        this.chefHashMap = new Map();
        this.recipeHashMap = new Map();
        this.amberHashMap = new Map();
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
    }

    getSkill(id) {
        return this.skillHashMap.get(id);
    }
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

export {GodInference, OfficialGameData, MyGameData, CalConfig,CacheKitchenGodCal}
