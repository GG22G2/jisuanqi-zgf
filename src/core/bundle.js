/* Generated from Java with JSweet 3.0.0 - http://www.jsweet.org */

class App {
    static main(officialGameData, myGameData, rewardAndCount) {
        return new Promise(resolve => {
            let result = getMaterialAndRewardFromJson(rewardAndCount)
            let TopResult = App.defaultTask(officialGameData, myGameData, result);
            // let TopResult = App.testTask(officialGameData, myGameData);
            resolve(TopResult)
        });
        //App.testTask(officialGameData, myGameData);
    }

    static defaultTask(officialGameData, myGameData, rewardAndCount) {
        const reward = rewardAndCount.reward;
        const materialCount = rewardAndCount.materialCount;
        let sexReward = new Array(2).fill(0);
        //todo 性别加成还没有考虑
        //sexReward = [0, 0.5]
        const inference = new GodInference(reward, sexReward, materialCount, officialGameData, myGameData);
        return inference.refer();
    }

    static testTask(officialGameData, myGameData) {
        const reward = new Array(10000).fill(1);
        const materialCount = new Array(47).fill(50);
        let sexReward = new Array(2).fill(0);
        sexReward = [0, 0.5]
        const inference = new GodInference(reward, sexReward, materialCount, officialGameData, myGameData);
        inference.refer();
    }
}

class CacheKitchenGodCal {
    constructor() {
        this.qualityAdd = [-1, 0, 0.1, 0.3, 0.5, 1.0];
        this.quality = (function (dims) {
            let allocate = function (dims) {
                if (dims.length === 0) {
                    return 0;
                } else {
                    let array = [];
                    for (let i = 0; i < dims[0]; i++) {
                        array.push(allocate(dims.slice(1)));
                    }
                    return array;
                }
            };
            return allocate(dims);
        })([2000, 400]);
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
     * 虽然没有厨具，但考虑厨师可能会有一些技法加成，让本身不能做的菜谱，但如果这个菜得分很高
     * 厨师带着加上100技法的厨具就可以做，则判定为品质加成为0，
     * 如果菜谱需要两项技法，而且厨师两项技法都不达标，则直接判定为不能做
     * @param {Chef} chef
     * @param {SkillEffect} effect
     * @param {CalRecipe} recipe
     * @return {double}
     */
    qualityAddNoEquip(chef, effect, recipe) {
        let ratio = 5;
        let t;
        let hasFailOnce = false;
        let s;
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
}

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
            ChefAndRecipeThread.disordePermuation = (function (dims) {
                let allocate = function (dims) {
                    if (dims.length === 0) {
                        return 0;
                    } else {
                        let array = [];
                        for (let i = 0; i < dims[0]; i++) {
                            array.push(allocate(dims.slice(1)));
                        }
                        return array;
                    }
                };
                return allocate(dims);
            })([1680, 9]);
        }
        return ChefAndRecipeThread.disordePermuation;
    }

    static __static_initializer_0() {
        const needPermuation = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        ChefAndRecipeThread.permute(needPermuation, [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0], 0);
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
ChefAndRecipeThread.tomNum = 200000;
/**
 * 将一组有序的菜谱排列，  生成其所有的无序排列情况
 * 这里的排序可以理解为，有三个桶，每个桶中可以放三个元素（桶中元素不考虑顺序）， 计算有多少种放置方法
 *
 * @param playress 有序的菜谱排列
 * @param start    当前排列的元素（0-8）
 * @param count    记录一组无序排列情况中，排列元素个数
 */
ChefAndRecipeThread.index = 0;

class GlobalAddtion {
    constructor(chefs, skills1) {
        if (((chefs != null && chefs instanceof Array) || chefs === null) && ((skills1 != null && (skills1 instanceof Array)) || skills1 === null)) {
            this.bake = 0;
            this.boil = 0;
            this.stirfry = 0;
            this.knife = 0;
            this.fry = 0;
            this.steam = 0;
            this.manfill = 0;
            this.womanfill = 0;
            this.price = 0;
            this.useall = [0, 0, 0, 0, 0, 0];
            this.maxequiplimit = [0, 0, 0, 0, 0, 0];
            const chefs1 = new Array(chefs.length)
            for (let i = 0; i < chefs1.length; i++) {
                chefs1[i] = chefs[i];
            }
            this.init$com_example_entity_Chef_A$java_util_List(chefs1, skills1);
        } else if (((chefs != null && chefs instanceof OfficialGameData) || chefs === null) && skills1 === undefined) {
            let __args = arguments;
            let officialGameData = __args[0];
            this.bake = 0;
            this.boil = 0;
            this.stirfry = 0;
            this.knife = 0;
            this.fry = 0;
            this.steam = 0;
            this.manfill = 0;
            this.womanfill = 0;
            this.price = 0;
            this.useall = [0, 0, 0, 0, 0, 0];
            this.maxequiplimit = [0, 0, 0, 0, 0, 0];
            this.init$com_example_entity_OfficialGameData(officialGameData);
        } else
            throw new Error('invalid overload');
    }

    init$com_example_entity_Chef_A$java_util_List(chefs, skills1) {
        const skills = (new Map());
        for (let index122 = 0; index122 < skills1.length; index122++) {
            let skill = skills1[index122];
            skills.set(skill.skillId, skill);
        }
        for (let index123 = 0; index123 < chefs.length; index123++) {
            let chef = chefs[index123];

            if (this.hasXiuLian(chef)) {
                const skill = skills.get(chef.ultimateSkill);
                if (skill == null) {
                    continue;
                }
                for (let index124 = 0; index124 < skill.effect.length; index124++) {
                    let effect = skill.effect[index124];
                    this.parseEffect(effect);
                }
            }
            const skill = skills.get(chef.skill);
            if (skill == null) {
                continue;
            }
            for (let index125 = 0; index125 < skill.effect.length; index125++) {
                let effect = skill.effect[index125];
                this.parseEffect(effect);
            }

        }
        for (let i = 0; i < this.useall.length; i++) {
            this.useall[i] = this.useall[i] / 100;
        }
        this.manfill = (n => n < 0 ? Math.ceil(n) : Math.floor(n))(this.manfill / 6);
        this.womanfill = (n => n < 0 ? Math.ceil(n) : Math.floor(n))(this.womanfill / 6);
    }

    init(chefs, skills1) {
        if (((chefs != null && chefs instanceof Array && (chefs.length == 0 || chefs[0] == null || (chefs[0] != null && chefs[0] instanceof Chef))) || chefs === null) && ((skills1 != null && (skills1 instanceof Array)) || skills1 === null)) {
            return this.init$com_example_entity_Chef_A$java_util_List(chefs, skills1);
        } else if (((chefs != null && chefs instanceof OfficialGameData) || chefs === null) && skills1 === undefined) {
            return this.init$com_example_entity_OfficialGameData(chefs);
        } else
            throw new Error('invalid overload');
    }

    parseEffect(effect) {
        const type = effect.type;
        if (effect.condition === ("Global")) {
            if (effect.tag != null) {
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
                        this.useall[effect.rarity] += effect.value;
                        break;
                    default:
                        break;
                }
            }
        }
    }

    init$com_example_entity_OfficialGameData(officialGameData) {
        const skills1 = officialGameData.skills;
        const chefs = officialGameData.chefs;
        this.init$com_example_entity_Chef_A$java_util_List(/* toArray */ chefs.slice(0), skills1);
    }

    hasXiuLian(chef) {
        return chef.ultimateSkill != null;

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
     *
     * @return {PlayRecipe}
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
    constructor(rewardlsit, sexReward, materials, officialGameData, myGameData) {
        this.segmentnums = 300;
        this.chefMinRaritySum = 14;
        this.deepLimit = [0, 6, 3, 3, 2, 2, 2, 2, 2, 2];
        this.ownChefs = null;
        this.ownRecipes = null;
        this.ownEquips = null;
        this.tempOwnRecipes = null;
        this.playRecipes = new Array();
        if (this.playChefs === undefined) {
            this.playChefs = null;
        }
        if (this.playEquips === undefined) {
            this.playEquips = null;
        }
        if (this.tempCalCache === undefined) {
            this.tempCalCache = null;
        }
        this.counts = new Array(7000).fill(0);
        this.prices = new Array(7000).fill(0);
        this.materialTag = ["留空",
            "肉", "鱼", "肉", "肉", "肉", "菜", "肉", "肉", "肉", "菜",
            "面", "肉", "菜", "菜", "菜", "菜", "菜", "菜", "菜", "面",
            "面", "菜", "菜", "鱼", "菜", "肉", "肉", "肉", "面", "菜",
            "菜", "鱼", "菜", "面", "面", "菜", "鱼", "肉", "肉", "肉",
            "鱼", "鱼", "肉", "肉", "菜", "菜"];
        this.reward = rewardlsit;
        this.materials = materials;
        this.sexReward = sexReward;
        this.officialGameData = officialGameData;
        this.myGameData = myGameData;
        this.globalAddtion = new GlobalAddtion(myGameData.chefs, officialGameData.skills);
        this.initOwn();
        GodInference.modifyChefValue(this.ownChefs, this.globalAddtion);
        this.buildRecipeTags();
    }

    /**
     * @param {Chef[]} chefs         厨师数组
     * @param {GlobalAddtion} globalAddtion 全体加成
     */
    static modifyChefValue(chefs, globalAddtion) {
        for (let index126 = 0; index126 < chefs.length; index126++) {
            let chef = chefs[index126];
            {
                chef.bake += globalAddtion.bake;
                chef.boil += globalAddtion.boil;
                chef.stirfry += globalAddtion.stirfry;
                chef.steam += globalAddtion.steam;
                chef.fry += globalAddtion.fry;
                chef.knife += globalAddtion.knife;
                const tags = chef.tags;
                if (tags != null && 0 < /* size */ tags.length) {
                    for (let index127 = 0; index127 < tags.length; index127++) {
                        let tag = tags[index127];
                        {
                            let value = 0;
                            if (tag === Chef.SEX_MAN) {
                                value = globalAddtion.manfill;
                            } else if (tag === Chef.SEX_WOMAN) {
                                value = globalAddtion.womanfill;
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
        }
    }

    buildCache() {
        this.buildIndex();
        const builder = new TempCalCache.builder();
        builder.init(this.ownChefs, this.ownRecipes, this.ownEquips, this.officialGameData, this.globalAddtion, this.reward, this.sexReward);
        this.tempCalCache = builder.build();
    }

    /**
     * 有的菜谱id过于大，正常id小于1000，后厨的普遍5000多，如果用一维数组存菜谱id，则有很多空间浪费
     * 这里做一重排，用从0开始的连续数字代替id
     */
    buildIndex() {
        this.recipePermutation(1, ([]), new IngredientLimit(this.materials));
        //this.playRecipes = this.playRecipes.slice(0, 60);
        console.info("有序菜谱组合数量" + this.playRecipes.length);

        const maps = new Map();

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
                    maps.set(mapId, calRecipe);
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
        let start;
        let end;
        start = Date.now();
        const total = this.playRecipes.length;
        const t1 = total * 1.0 / this.segmentnums;
        let groupnum = (((t1 | 0) < t1 ? t1 + 1 : t1) | 0);
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

        let topPlayChers = [];
        let scores = new Array(500000)
        let scoreIndex = 0;
        groupnum = 1;
        let maxScoreKey = BigInt(0);
        for (let i = 0; i < groupnum; i++) {
            let chefAndRecipeThread;
            if (i === groupnum - 1) {
                chefAndRecipeThread = new ChefAndRecipeThread(i * this.segmentnums, total);
            } else {
                chefAndRecipeThread = new ChefAndRecipeThread(i * this.segmentnums, (i + 1) * this.segmentnums);
            }
            chefAndRecipeThread.setBaseData(playRecipes2, this.playChefs, GodInference.recipe2Change, this.tempCalCache);
            const topScoreKey = chefAndRecipeThread.call();
            if (topScoreKey > maxScoreKey) {
                maxScoreKey = topScoreKey;
            }

        }

        topPlayChers = this.parseLong(playRecipes2, this.playChefs, maxScoreKey);
        console.log(topPlayChers)
        end = Date.now();
        console.info("全菜谱 全厨师 无厨具排列结果用时::" + (end - start) + "ms");
        return this.calSecondStage(topPlayChers);


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
     * @param {TopResult[]} topPlayChers
     */
    calSecondStage(topPlayCher) {
        console.log(topPlayCher.score)
        let chefIds = topPlayCher.chefs;
        let recipeIds = topPlayCher.recepeids;
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
                equip: "",
                recipes: [
                    {
                        recipe: name1,
                        count: count1
                    }, {
                        recipe: name2,
                        count: count2
                    },
                    {
                        recipe: name3,
                        count: count3
                    }
                ]
            })

        }

        result = {
            chefs,
            score: topPlayCher.score
        }

        return [result]
    }

    buildPermutation() {
        this.playChefs = null;
        this.playEquips = null;
        this.playChefs = this.chefsPermutation();
        console.info("厨师组合数" + this.playChefs.length);
        this.playEquips = [];
    }

    chefsPermutation() {
        const index2 = ([]);
        const length = this.ownChefs.length;
        if (length < 3) {
            return null;
        }
        let result;
        const temp = ([]);
        for (let i = 0; i < length; i++) {
            for (let j = i + 1; j < length; j++) {
                for (let k = j + 1; k < length; k++) {
                    if (this.ownChefs[i].rarity + this.ownChefs[j].rarity + this.ownChefs[k].rarity >= this.chefMinRaritySum) {
                        const s = [0, 0, 0];
                        s[0] = this.ownChefs[i].index;
                        s[1] = this.ownChefs[j].index;
                        s[2] = this.ownChefs[k].index;
                        temp.push(s);
                    }
                }
                if (index2.length === 0 || temp.length !== index2[ /* size */index2.length - 1]) {
                    index2.push(temp.length);
                }
            }
        }
        result = ((a1, a2) => {
            if (a1.length >= a2.length) {
                a1.length = 0;
                a1.push.apply(a1, a2);
                return a1;
            } else {
                return a2.slice(0);
            }
        })((function (dims) {
            let allocate = function (dims) {
                if (dims.length === 0) {
                    return 0;
                } else {
                    let array = [];
                    for (let i = 0; i < dims[0]; i++) {
                        array.push(allocate(dims.slice(1)));
                    }
                    return array;
                }
            };
            return allocate(dims);
        })([0, 0]), temp);

        GodInference.recipe2Change = new Array(index2.length + 1).fill(0);
        for (let i = 0; i < index2.length; i++) {
            {
                GodInference.recipe2Change[i + 1] = /* get */ index2[i];
            }
        }
        return result;
    }

    equipspermute() {
        const index2 = ([]);
        const length = this.ownEquips.length;
        if (length < 3) {
            return [];
        }
        const totalLength = (MathExtend.A(length, 3) | 0);
        const roots = ([]);

        const result = new Array(totalLength);
        for (let i = 0; i < totalLength; i++) {
            result[i] = new Array(3);
        }

        let position = 0;
        for (let i = 0; i < length; ++i) {

            const root = new EquipTree();
            root.index = this.ownEquips[i].index;
            if (i > 0 && this.ownEquips[i].index === this.ownEquips[i - 1].index) {
                continue;
            }
            const roots2 = [];
            for (let i2 = 0; i2 < length; i2++) {
                if (i2 === i) {
                    continue;
                }
                const root2 = new EquipTree();
                root2.index = this.ownEquips[i2].index;
                roots2.push(root2);
                const root3 = [];
                for (let i3 = 0; i3 < length; i3++) {
                    if (i3 === i || i3 === i2) {
                        continue;
                    }
                    if (i3 > 0 && this.ownEquips[i3].index !== this.ownEquips[i3 - 1].index) {
                        result[position][0] = this.ownEquips[i].index;
                        result[position][1] = this.ownEquips[i2].index;
                        result[position++][2] = this.ownEquips[i3].index;
                        root3.push(this.ownEquips[i3].index)
                    }
                }
                root2.leaves = root3;
                if (index2.length === 0 || position !== index2[index2.length - 1]) {
                    index2.push(position)
                }
            }
            root.children = roots2.slice(0);
            if (root.children != null) {
                roots.push(root);
            }

        }
        const result2 = roots.slice(0);
        GodInference.equip2Change = (s => {
            let a = [];
            while (s-- > 0)
                a.push(0);
            return a;
        })(index2.length);
        for (let i7 = 0; i7 < GodInference.equip2Change.length; i7++) {
            GodInference.equip2Change[i7] = index2[i7];
        }
        return result2;
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
        const removes = ([]);
        for (let i = 0; i < limit; i++) {
            const selectRecipe = this.tempOwnRecipes.shift();
            removes.push(selectRecipe);
            const quantity = integerIntegerMap[selectRecipe.recipeId];
            const newplay = [];
            /* addAll */
            ((l1, l2) => l1.push.apply(l1, l2))(newplay, play);
            ingredientLimit.cookingQuantit(selectRecipe, quantity);
            const clone = ingredientLimit.getFinalMaterialCount();
            const p = new PlayRecipe(selectRecipe, quantity);
            /* add */
            newplay.push(p);
            this.recipePermutation(index + 1, newplay, ingredientLimit);
            ingredientLimit.setMaterialCount(clone);
        }
        for (let it = 0; it < /* size */ removes.length; it++) {
            this.tempOwnRecipes.push(/* get */ removes[it]);
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
            const rew = this.reward[ownRecipe.recipeId];
            this.prices[ownRecipe.recipeId] = (Math.ceil(ownRecipe.price * (1 + rew) * quantity[ownRecipe.recipeId]) | 0);
        }
        recipes.sort((r1, r2) => {
            return this.prices[r2.recipeId] - this.prices[r1.recipeId];
        });
    }

    buildRecipeTags() {
        for (let index133 = 0; index133 < this.tempOwnRecipes.length; index133++) {
            let ownRecipe = this.tempOwnRecipes[index133];
            {
                const materials = ownRecipe.materials;
                const tags = [0, 0, 0, 0];
                for (let index134 = 0; index134 < materials.length; index134++) {
                    let material = materials[index134];
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
    }

    initOwn() {
        const chefs = [];
        const sort = this.myGameData.chefs.filter((chef) => {
            return chef.rarity >= 2;
        }).sort((chef, chef2) => {
            return chef.chefId - chef2.chefId;
        });
        this.ownChefs = []
        sort.forEach((chef) => {
            this.ownChefs.push(chef);
        });

        const recipes = this.myGameData.recipes;
        const recipes1 = new Array(this.myGameData.recipes.length).fill(null)
        for (let i = 0; i < recipes1.length; i++) {
            recipes1[i] = recipes[i];
        }

        this.tempOwnRecipes = this.myGameData.recipes;

        for (let tempOwnRecipe of this.tempOwnRecipes) {
            tempOwnRecipe.materials2 = tempOwnRecipe.materials
        }
    }
}

GodInference.recipe2Change = null;
GodInference.equip2Change = null;


class IngredientLimit {
    constructor(m) {
        if (((m != null && m instanceof Array && (m.length == 0 || m[0] == null || (typeof m[0] === 'number'))) || m === null)) {
            let __args = arguments;
            this.materialCount = new Array(47).fill(0)
            this.extraLimit = [0, 0, 0, 0, 0, 0];
            if (m.length >= 47) {
                this.materialCount = m;
            } else {
                this.materialCount.fill(50);
            }
        } else if (((typeof m === 'number') || m === null)) {
            let ingredientNum = arguments[0];
            this.materialCount = new Array(47).fill(0)
            this.extraLimit = [0, 0, 0, 0, 0, 0];
            this.materialCount.fill(ingredientNum);
        } else if (m === undefined) {
            this.materialCount = new Array(47).fill(0)
            this.extraLimit = [0, 0, 0, 0, 0, 0];
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
            IngredientLimit.cacheResult = (function (dims) {
                let allocate = function (dims) {
                    if (dims.length === 0) {
                        return 0;
                    } else {
                        let array = [];
                        for (let i = 0; i < dims[0]; i++) {
                            array.push(allocate(dims.slice(1)));
                        }
                        return array;
                    }
                };
                return allocate(dims);
            })([1000, 50]);
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
        return IngredientLimit.cookingQuanttiyAndReduce(/* toArray */((a1, a2) => {
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

    static cookingQuanttiyAndReduce(materials, expected, materialCount) {
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

class builder1 {
    constructor() {
        this.officialGameData = null;
        this.chefname = null;
        this.equipname = null;
        this.recipenames = null;
        this.cookingQuantity = null;
    }

    setPlay(chefname, equipname, ...params) {
        this.chefname = chefname;
        this.equipname = equipname;
        this.recipenames = params;
        return this;
    }

    setQuantity(...params) {
        this.cookingQuantity = params;
        return this;
    }

    setGameData(officialGameData) {
        this.officialGameData = officialGameData;
        return this;
    }

    build() {
        const playChef = new PlayChef();
        const recipes = this.officialGameData.recipes;
        const chefs = this.officialGameData.chefs;
        const equips = this.officialGameData.equips;
        const playRecipes = (s => {
            let a = [];
            while (s-- > 0)
                a.push(null);
            return a;
        })(this.recipenames.length);
        for (let i = 0, index = 0; i < this.recipenames.length; i++) {
            const recipename = this.recipenames[i];
            for (let index137 = 0; index137 < recipes.length; index137++) {
                let recipe = recipes[index137];

                if (recipe.name === recipename) {
                    const playRecipe = new PlayRecipe(recipe, this.cookingQuantity[i]);
                    playRecipes[index++] = playRecipe;
                    break;
                }
            }
        }
        playChef.setRecipes(playRecipes);
        for (let index138 = 0; index138 < chefs.length; index138++) {
            let chef = chefs[index138];
            {
                if (chef.name === this.chefname) {
                    playChef.setChef(chef);
                    break;
                }
            }
        }
        for (let index139 = 0; index139 < equips.length; index139++) {
            let equip = equips[index139];
            {
                if (equip.name === this.equipname) {
                    playChef.setEquip(equip);
                    break;
                }
            }
        }
        return playChef;
    }
}

PlayChef.builder = builder1;


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
    }

    /**
     *
     * @return {SkillEffect}
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

    effect(effect) {
        if ("Partial" === effect.condition) {
            if (this.tempAddtion == null) {
                this.tempAddtion = new TempAddtion();
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
            switch ((effect.type)) {
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
                        this.knifePercent += /* doubleValue */ effect.value / 100;
                    }
                    break;
                case "Stirfry":
                    if (effect.cal === ("Abs")) {
                        this.stirfry += effect.value;
                    } else if (effect.cal === ("Percent")) {
                        this.stirfryPercent += /* doubleValue */ effect.value / 100;
                    }
                    break;
                case "UseBake":
                    this.usebake += /* doubleValue */ effect.value / 100;
                    break;
                case "UseSteam":
                    this.usesteam += /* doubleValue */ effect.value / 100;
                    break;
                case "UseBoil":
                    this.useboil += /* doubleValue */ effect.value / 100;
                    break;
                case "UseFry":
                    this.usefry += /* doubleValue */ effect.value / 100;
                    break;
                case "UseKnife":
                    this.useknife += /* doubleValue */ effect.value / 100;
                    break;
                case "UseStirfry":
                    this.usestirfry += /* doubleValue */ effect.value / 100;
                    break;
                case "UseFish":
                    this.usefish += /* doubleValue */ effect.value / 100;
                    break;
                case "UseCreation":
                    this.usecreation += /* doubleValue */ effect.value / 100;
                    break;
                case "UseMeat":
                    this.usemeat += /* doubleValue */ effect.value / 100;
                    break;
                case "UseVegetable":
                    this.usevegetable += /* doubleValue */ effect.value / 100;
                    break;
                case "Gold_Gain":
                    this.goldgain += /* doubleValue */ effect.value / 100;
                    break;
                default:
                    break;
            }
        }
    }

    globalEffect(globalAddtion) {
        this.bake += globalAddtion.bake;
        this.boil += globalAddtion.boil;
        this.stirfry += globalAddtion.stirfry;
        this.knife += globalAddtion.knife;
        this.fry += globalAddtion.fry;
        this.steam += globalAddtion.steam;
    }

    templeEffect(tempAddtion) {
        this.bake += tempAddtion.bake;
        this.boil += tempAddtion.boil;
        this.stirfry += tempAddtion.stirfry;
        this.knife += tempAddtion.knife;
        this.fry += tempAddtion.fry;
        this.steam += tempAddtion.steam;
    }

    calSkill() {
        if (this.canCal) {
        }
        this.canCal = false;
    }

    addEffect(effect) {
        this.usesteam += effect.usesteam;
        this.useboil += effect.useboil;
        this.usefry += effect.usefry;
        this.useknife += effect.useknife;
        this.usestirfry += effect.usestirfry;
        this.usebake += effect.usebake;
        this.usefish += effect.usefish;
        this.usecreation += effect.usecreation;
        this.usemeat += effect.usemeat;
        this.usevegetable += effect.usevegetable;
        this.goldgain += effect.goldgain;
        this.bake += effect.bake;
        this.boil += effect.boil;
        this.stirfry += effect.stirfry;
        this.knife += effect.knife;
        this.fry += effect.fry;
        this.steam += effect.steam;
        this.bakePercent += effect.bakePercent;
        this.boilPercent += effect.boilPercent;
        this.stirfryPercent += effect.stirfryPercent;
        this.knifePercent += effect.knifePercent;
        this.fryPercent += effect.fryPercent;
        this.steamPercent += effect.steamPercent;
        if (effect.tempAddtion != null) {
            if (this.tempAddtion == null) {
                this.tempAddtion = new TempAddtion();
            }
            this.tempAddtion.bake += effect.tempAddtion.bake;
            this.tempAddtion.boil += effect.tempAddtion.boil;
            this.tempAddtion.stirfry += effect.tempAddtion.stirfry;
            this.tempAddtion.knife += effect.tempAddtion.knife;
            this.tempAddtion.fry += effect.tempAddtion.fry;
            this.tempAddtion.steam += effect.tempAddtion.steam;
        }
    }

    reset() {
        this.usesteam = 0;
        this.useboil = 0;
        this.usefry = 0;
        this.useknife = 0;
        this.usestirfry = 0;
        this.usebake = 0;
        this.usefish = 0;
        this.usecreation = 0;
        this.usemeat = 0;
        this.usevegetable = 0;
        this.goldgain = 0;
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
        if (this.tempAddtion != null) {
            this.tempAddtion.bake = 0;
            this.tempAddtion.boil = 0;
            this.tempAddtion.stirfry = 0;
            this.tempAddtion.knife = 0;
            this.tempAddtion.fry = 0;
            this.tempAddtion.steam = 0;
        }
    }
}


class TempAddtion {
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
        this.scoreCacheNoEquip = null;
        this.scoreAddCacheNoEquip = null;
        this.scoreCacheNoEquipIndex = null;

        this.chefCount = chefIndexMax;
        this.recipeCount = recipeIndexMax;

        this.scoreCache = new Array(chefIndexMax);
        for (let i = 0; i < chefIndexMax; i++) {
            this.scoreCache[i] = new Array(recipeIndexMax).fill(0)
        }

        this.scoreCacheNoEquip = new Array(chefIndexMax);
        for (let i = 0; i < chefIndexMax; i++) {
            this.scoreCacheNoEquip[i] = new Array(recipeIndexMax).fill(0)
        }

        this.scoreCacheNoEquipIndex = new Array(this.recipeCount);
        for (let i = 0; i < this.recipeCount; i++) {
            this.scoreCacheNoEquipIndex[i] = new Array(this.recipeCount).fill(0)
        }
    }
}

class builder {
    constructor() {
        if (this.tempCalCache === undefined) {
            this.tempCalCache = null;
        }
        this.reward = null;
        this.sexReward = null;
        this.officialGameData = null;
        this.globalAddtion = null;
        this.kitchenGodCal = null;
        this.ownChefs = null;
        this.ownRecipes = null;
        this.tempEffect = new SkillEffect();
    }

    init(ownChefs, ownRecipes, ownEquips, officialGameData, globalAddtion, reward, sexReward) {
        this.officialGameData = officialGameData;
        this.globalAddtion = globalAddtion;
        this.kitchenGodCal = new CacheKitchenGodCal();
        this.ownChefs = ownChefs;
        this.ownRecipes = ownRecipes;
        this.ownEquips = ownEquips;
        this.reward = reward;
        this.sexReward = sexReward;
        this.tempCalCache = new TempCalCache(ownChefs.length, ownRecipes.length);
    }

    updateIdAndAddEffect() {
        for (let i = 0; i < this.ownChefs.length; i++) {
            const ownChef = this.ownChefs[i];
            ownChef.index = i;
            this.buildEffect$com_example_entity_Chef(ownChef);
        }
    }

    build() {
        this.updateIdAndAddEffect();
        this.initCache();
        return this.tempCalCache;
    }

    initCache() {
        const scoreCache = this.tempCalCache.scoreCache;
        const scoreCacheNoEquip = this.tempCalCache.scoreCacheNoEquip;

        let skillEffect;
        let qualityAddQ;
        let qualityAddS;
        let price;
        let singleprice;

        const useall = this.globalAddtion.useall;
        for (let i = 0; i < this.ownChefs.length; i++) {
            const ownChef = this.ownChefs[i];
            skillEffect = ownChef.skillEffect;
            for (let i3 = 0; i3 < this.ownRecipes.length; i3++) {
                const ownRecipe = this.ownRecipes[i3];
                const index = ownRecipe.index;
                qualityAddQ = this.kitchenGodCal.qualityAddNoEquip(ownChef, skillEffect, ownRecipe);
                if (qualityAddQ === -1) {
                    scoreCacheNoEquip[i][index] = 0;
                    continue;
                }

                let tags = ownChef.tags;
                let sexAdd = 0;
                if (tags != null && tags.length > 0) {
                    for (const sexTag of tags) {
                        if (sexTag <= 2) {
                            sexAdd += this.sexReward[sexTag - 1];
                        }
                    }
                }
                qualityAddS = this.kitchenGodCal.skillAdd(skillEffect, ownRecipe);
                price = ownRecipe.price;
                singleprice = (Math.ceil(price * (1 + this.reward[ownRecipe.recipeId] + sexAdd + qualityAddQ + qualityAddS + useall[ownRecipe.rarity])) | 0);
                scoreCacheNoEquip[i][index] = singleprice * ownRecipe.count;
                scoreCache[i][index] = singleprice * ownRecipe.count;
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
        this.tempCalCache.scoreAddCacheNoEquip = new Array(indexs);

        for (let i = 0; i < indexs; i++) {
            this.tempCalCache.scoreAddCacheNoEquip[i] = new Array(this.tempCalCache.chefCount).fill(0)
        }

        const scoreAddCacheNoEquip = this.tempCalCache.scoreAddCacheNoEquip;
        const scoreCacheNoEquipIndex = this.tempCalCache.scoreCacheNoEquipIndex;
        for (let t = 0; t < this.tempCalCache.chefCount; t++) {
            let index = 0;
            for (let i = 0; i < length; i++) {
                for (let j = i + 1; j < length; j++) {
                    scoreCacheNoEquipIndex[i][j] = index;
                    for (let k = j + 1; k < length; k++) {
                        if (scoreCacheNoEquip[t][i] === 0 || scoreCacheNoEquip[t][j] === 0 || scoreCacheNoEquip[t][k] === 0) {
                            scoreAddCacheNoEquip[index++][t] = 0;
                        } else {
                            scoreAddCacheNoEquip[index++][t] = scoreCacheNoEquip[t][i] + scoreCacheNoEquip[t][j] + scoreCacheNoEquip[t][k];
                        }
                    }
                }
            }
        }
    }

    buildEffect$com_example_entity_Chef(chef) {
        const skillEffect = new SkillEffect();
        let skill = this.officialGameData.getSkill(chef.skill);
        let effect = skill.effect;
        for (let index140 = 0; index140 < effect.length; index140++) {
            let effect1 = effect[index140];
            {
                skillEffect.effect(effect1);
            }
        }
        const ultimateId = chef.ultimateSkill;
        if (ultimateId != null) {
            skill = this.officialGameData.getSkill(ultimateId);
            if (skill != null) {
                effect = skill.effect;
                for (let index141 = 0; index141 < effect.length; index141++) {
                    let effect1 = effect[index141];
                    {
                        skillEffect.effect(effect1);
                    }
                }
            }
        }
        chef.skillEffect = skillEffect;
        return skillEffect;
    }

    buildEffect(chef) {
        if (((chef != null && chef instanceof Chef) || chef === null)) {
            return this.buildEffect$com_example_entity_Chef(chef);
        } else if (((chef != null && chef instanceof Equip) || chef === null)) {
            return this.buildEffect$com_example_entity_Equip(chef);
        } else
            throw new Error('invalid overload');
    }

    buildEffect$com_example_entity_Equip(equip) {
        const skillEffect = new SkillEffect();
        const skills = equip.skill;
        for (let index142 = 0; index142 < skills.length; index142++) {
            let skill = skills[index142];
            {
                const skill1 = this.officialGameData.getSkill(skill);
                const effect = skill1.effect;
                for (let index143 = 0; index143 < effect.length; index143++) {
                    let effect1 = effect[index143];
                    {
                        skillEffect.effect(effect1);
                    }
                }
            }
        }
        equip.skillEffect = skillEffect;
        return skillEffect;
    }

    MergerSkillEffect(chef, equip) {
        this.tempEffect.reset();
        const skillEffect = this.tempEffect;
        const skillEffect1 = chef.skillEffect;
        const skillEffect2 = equip.skillEffect;
        skillEffect.addEffect(skillEffect1);
        skillEffect.addEffect(skillEffect2);
        return skillEffect;
    }
}

TempCalCache.builder = builder;

class TopResult {
    constructor(playChefs, recipeindex, score) {
        this.chefs = null;
        this.equipid = null;
        this.recepeids = null;
        this.id = 0;
        this.score = 0;
        this.update(playChefs, recipeindex, score);
    }

    update(playChefs, recipeindex, score) {
        this.chefs = playChefs;
        this.recepeids = recipeindex;
        this.score = score;
    }
}

class EquipTree {
    constructor() {
        if (this.index === undefined) {
            this.index = 0;
        }
        if (this.children === undefined) {
            this.children = null;
        }
        if (this.leaves === undefined) {
            this.leaves = null;
        }
    }
}


class CalRecipe {
    constructor(recipe, count) {
        if (this.index === undefined) {
            this.index = 0;
        }
        if (this.id === undefined) {
            this.id = 0;
        }
        if (this.count === undefined) {
            this.count = 0;
        }
        if (this.recipeId === undefined) {
            this.recipeId = 0;
        }
        if (this.name === undefined) {
            this.name = null;
        }
        if (this.stirfry === undefined) {
            this.stirfry = 0;
        }
        if (this.boil === undefined) {
            this.boil = 0;
        }
        if (this.knife === undefined) {
            this.knife = 0;
        }
        if (this.fry === undefined) {
            this.fry = 0;
        }
        if (this.bake === undefined) {
            this.bake = 0;
        }
        if (this.steam === undefined) {
            this.steam = 0;
        }
        if (this.rarity === undefined) {
            this.rarity = 0;
        }
        if (this.price === undefined) {
            this.price = 0;
        }
        if (this.exPrice === undefined) {
            this.exPrice = 0;
        }
        if (this.tags === undefined) {
            this.tags = null;
        }
        if (this.attributeTags === undefined) {
            this.attributeTags = null;
        }
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
     * 通过菜谱id和菜谱数量 确定菜谱是否相同
     * @param {*} o
     * @return {boolean}
     */
    equals(o) {
        if (this === o)
            return true;
        if (!(o != null && o instanceof CalRecipe))
            return false;
        const calRecipe = o;
        if (this.count !== calRecipe.count)
            return false;
        return this.recipeId === calRecipe.recipeId;
    }

    /**
     * count<<14|recipeid;
     * @return {number}
     */
    hashCode() {
        return this.id;
    }

    /**
     *
     * @return {string}
     */
    toString() {
        return "{\"recipe\" : \"" + this.name + "\", \"count\" :" + this.count + '}';
    }
}


class Chef {
    constructor() {
        if (this.index === undefined) {
            this.index = 0;
        }
        if (this.chefId === undefined) {
            this.chefId = 0;
        }
        if (this.galleryId === undefined) {
            this.galleryId = null;
        }
        if (this.name === undefined) {
            this.name = null;
        }
        if (this.origin === undefined) {
            this.origin = null;
        }
        if (this.rarity === undefined) {
            this.rarity = 0;
        }
        if (this.bake === undefined) {
            this.bake = 0;
        }
        if (this.boil === undefined) {
            this.boil = 0;
        }
        if (this.stirfry === undefined) {
            this.stirfry = 0;
        }
        if (this.knife === undefined) {
            this.knife = 0;
        }
        if (this.fry === undefined) {
            this.fry = 0;
        }
        if (this.steam === undefined) {
            this.steam = 0;
        }
        if (this.creation === undefined) {
            this.creation = 0;
        }
        if (this.fish === undefined) {
            this.fish = 0;
        }
        if (this.meat === undefined) {
            this.meat = 0;
        }
        if (this.veg === undefined) {
            this.veg = 0;
        }
        if (this.skill === undefined) {
            this.skill = null;
        }
        if (this.ultimateGoal === undefined) {
            this.ultimateGoal = null;
        }
        if (this.ultimateSkill === undefined) {
            this.ultimateSkill = null;
        }
        if (this.tags === undefined) {
            this.tags = null;
        }
        if (this.equip === undefined) {
            this.equip = null;
        }
        if (this.skillEffect === undefined) {
            this.skillEffect = null;
        }
    }

    /**
     *
     * @return {Chef}
     */
    clone() {
        let chef1 = null;
        try {
            chef1 = ((o) => {
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
        return chef1;
    }
}

Chef.SEX_MAN = 1;
Chef.SEX_WOMAN = 2;


class Effect {
    constructor() {
        if (this.type === undefined) {
            this.type = null;
        }
        if (this.value === undefined) {
            this.value = null;
        }
        if (this.condition === undefined) {
            this.condition = null;
        }
        if (this.cal === undefined) {
            this.cal = null;
        }
        if (this.rarity === undefined) {
            this.rarity = null;
        }
        if (this.tag === undefined) {
            this.tag = null;
        }
    }
}

class Equip {
    constructor() {
        if (this.index === undefined) {
            this.index = 0;
        }
        if (this.equipId === undefined) {
            this.equipId = 0;
        }
        if (this.galleryId === undefined) {
            this.galleryId = null;
        }
        if (this.name === undefined) {
            this.name = null;
        }
        if (this.rarity === undefined) {
            this.rarity = 0;
        }
        if (this.skill === undefined) {
            this.skill = null;
        }
        if (this.origin === undefined) {
            this.origin = null;
        }
        if (this.skillEffect === undefined) {
            this.skillEffect = null;
        }
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
        if (this.material === undefined) {
            this.material = 0;
        }
        if (this.quantity === undefined) {
            this.quantity = 0;
        }
    }
}

class MyGameData {
    constructor() {
        this.chefsMap = ({});
        this.recipesMap = ({});
        this.equipsMap = ({});
        this.chefs = (new Array());
        this.equips = (new Array());
        this.recipes = (new Array());
    }
}

class OfficialGameData {
    constructor() {
        if (this.recipes === undefined) {
            this.recipes = null;
        }
        if (this.materials === undefined) {
            this.materials = null;
        }
        if (this.chefs === undefined) {
            this.chefs = null;
        }
        if (this.equips === undefined) {
            this.equips = null;
        }
        if (this.skills === undefined) {
            this.skills = null;
        }
        this.equipHashMap = (new Map());
        this.skillHashMap = (new Map());
        this.ChefHashMap = (new Map());
        this.RecipeHashMap = (new Map());
    }

    buildMap() {
        for (let index144 = 0; index144 < this.recipes.length; index144++) {
            let x = this.recipes[index144];
            {
                this.RecipeHashMap.set(x.recipeId, x);
            }
        }
        for (let index145 = 0; index145 < this.equips.length; index145++) {
            let x = this.equips[index145];
            {
                this.equipHashMap.set(x.equipId, x);
            }
        }
        for (let index146 = 0; index146 < this.skills.length; index146++) {
            let x = this.skills[index146];
            {
                this.skillHashMap.set(x.skillId, x);
            }
        }
        for (let index147 = 0; index147 < this.chefs.length; index147++) {
            let x = this.chefs[index147];
            {
                this.ChefHashMap.set(x.chefId, x);
            }
        }
    }

    getSkill(id) {
        return this.skillHashMap.get(id);
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

class MathExtend {
    /**
     * 排列组合
     * A（M,N） 如A(3,2) 则参数 m=3,n=2 结果为
     *
     *
     *
     * @param {number} m
     * @param {number} n
     * @return {number}
     */
    static A(m, n) {
        let tmp = m;
        let result = m;
        let count = 0;
        while ((count < n - 1)) {
            {
                if (n === 1) {
                    return n;
                } else {
                    count++;
                    tmp--;
                    result = result * tmp;
                }
            }
        }
        return result;
    }
}

class SortUtils {
    static shellSort(arr, start, end) {
        let len = end - start + 1;
        // gap 即为增量
        for (let gap = Math.floor(len / 2); gap > 0; gap = Math.floor(gap / 2)) {
            for (let i = start + gap; i <= end; i++) {
                let j = i;
                let current = arr[i];
                while (j - gap >= start && current < arr[j - gap]) {
                    arr[j] = arr[j - gap];
                    j = j - gap;
                }
                arr[j] = current;
            }
        }
    }

    static quickSort(array) {
        const stack = (s => {
            let a = [];
            while (s-- > 0)
                a.push(0);
            return a;
        })(array.length * 2);
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
            {
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
    }

    /*private*/
    static partion(array, low, high) {
        const temp = array[low];
        while ((low < high)) {
            {
                while (((low < high) && temp <= array[high])) {
                    {
                        high--;
                    }
                }
                if (low >= high) {
                    break;
                } else {
                    array[low] = array[high];
                }
                while (((low < high) && array[low] <= temp)) {
                    {
                        low++;
                    }
                }
                if (low === high) {
                    break;
                } else {
                    array[high] = array[low];
                }
            }
        }
        array[low] = temp;
        return low;
    }

    static sort(arr) {
        for (let i = 1; i < arr.length; i++) {
            {
                for (let j = 0; j < arr.length - 1; j++) {
                    {
                        if (arr[j] > arr[j + 1]) {
                            const temp = arr[j];
                            arr[j] = arr[j + 1];
                            arr[j + 1] = temp;
                        }
                    }
                }
            }
        }
    }
}


IngredientLimit.cacheResult_$LI$();
IngredientLimit.__static_initialize();
ChefAndRecipeThread.disordePermuation_$LI$();
ChefAndRecipeThread.__static_initialize();

async function start() {

    let data = await (await fetch('./json/gameData.json')).json();
    let myEquipdata = await (await fetch('./json/myequips.json')).json();
    let myGameData = await (await fetch('./json/myGameData.json')).json();
    let rewardAndCount = await (await fetch('https://bcjh.xyz/api/get_rule?time=2021-02-12T05%3A00%3A00.000Z')).json();
    let officialGameData = new OfficialGameData();


    officialGameData.chefs = data.chefs;
    officialGameData.equips = data.equips;
    officialGameData.materials = data.materials;
    officialGameData.recipes = data.recipes;
    officialGameData.skills = data.skills;
    officialGameData.buildMap();


    myGameData.equips = myEquipdata;

    let myGameData1 = importChefsAndRecipesFromFoodGame(officialGameData, myGameData);

    return App.main(officialGameData, myGameData1, rewardAndCount);

}


//从图鉴网导入数据
function importChefsAndRecipesFromFoodGame(officialGameData, foodgameData) {
    let myGameData = new MyGameData();
    let recipes = foodgameData.recipes;

    let size = recipes.length;
    //菜谱
    for (let i = 0; i < size; i++) {
        let jsonRecipe = recipes[i];
        let id = jsonRecipe.id;

        if (jsonRecipe.got == "是") {
            let recipe = officialGameData.RecipeHashMap.get(id);
            if (recipe != null) {
                if (jsonRecipe.ex == "是") {
                    recipe.price = recipe.price + recipe.exPrice;
                }
                myGameData.recipes.push(recipe);
            }
        }
    }


    //厨师
    let chefs = foodgameData.chefs;
    size = chefs.length;
    for (let i = 0; i < size; i++) {
        let jsonchef = chefs[i];

        let id = jsonchef.id;
        let chef = officialGameData.ChefHashMap.get(id);
        if (chef != null && jsonchef.got == "是") {
            if (jsonchef.ult != "是") {
                chef.ultimateSkill = null;
            }
            myGameData.chefs.push(chef);
        }
    }
    let equipmentData = foodgameData.equips;
    let officialequips = officialGameData.equips;
    //厨具
    size = equipmentData.length;


    for (let equip of officialequips) {
        for (let i = 0; i < size; i++) {
            let equipname = equipmentData[i];
            if (equip.name == equipname) {
                myGameData.equips.push(equip);
                break;
            }
        }
    }
    return myGameData;
}


function getMaterialAndRewardFromJson(jsonObject) {
    let reward = new Array(10000).fill(-100)
    let materialCount = new Array(47);

    const rules = jsonObject.rules;
    for (let i = 0; i < rules.length; i++) {
        let rule = rules[i];
        if (rule.Title != null && rule.Title.indexOf('御前') != -1) {
            let recipeEffect = rule.RecipeEffect;
            for (let key in recipeEffect) {
                reward[key] = recipeEffect[key]
            }
            if (rule.MaterialsLimit instanceof Object) {
                let materials = rule.MaterialsLimit;
                for (let index in materials) {
                    materialCount[index] = materials[index]
                }
            } else {
                let materialsLimit = rule.MaterialsLimit;
                materialCount.fill(materialsLimit);
            }
            console.log(rule)
            break;
        }
    }
    return {
        reward,
        materialCount
    }
}

export {App, OfficialGameData, importChefsAndRecipesFromFoodGame}
