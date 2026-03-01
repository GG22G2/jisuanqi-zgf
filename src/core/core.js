/* Generated from Java with JSweet 3.0.0 - http://www.jsweet.org */
import {ChefAndRecipeThread as recipepl} from './calThread.js'
import {
    PlayChef,
    PlayRecipe,
    SkillEffect,
    TempAddition,
    TopResult,
    CalRecipe,
    Chef,
    Effect,
    Recipe,
    Skill
} from './ObjectDesc.js'
import {GlobalAddition} from './globalAddition.js'
import {Calculator} from './calculator.js'
import {getMaterialCount, IngredientLimit} from "./ingredientLimit.js";
import {cloneObject, MinHeap} from "./utils.js";
import {ChefAndRecipeThread} from "./worker.js"


class GodInference {
    constructor(officialGameData, myGameData, recipeReward, sexReward, materials, calConfig) {
        this.useEquip = false;
        this.ownChefTopK = 3;
        this.baseOwnChefTopK = 3;
        this.enableDynamicTopK = false;
        this.estimatedCandidateKeepRate = 1.12;
        this.maxEstimatedCandidateExtra = 800;
        this.recipePerturbRuns = 4;
        this.recipeCandidateExpandRate = 1.35;
        this.recipeCandidateExpandMax = 60;

        if (calConfig != null) {
            this.chefMinRarity = calConfig.chefMinRarity;
            this.deepLimit = calConfig.deepLimit;
            this.recipeLimit = calConfig.recipeLimit;
            this.filterScoreRate = calConfig.filterScoreRate;
            this.useEquip = calConfig.useEquip;
            this.mustChefs = calConfig.mustChefs;
            this.ownChefTopK = calConfig.ownChefTopK == null ? 3 : calConfig.ownChefTopK;
            this.baseOwnChefTopK = calConfig.baseOwnChefTopK == null ? 3 : calConfig.baseOwnChefTopK;
            this.enableDynamicTopK = calConfig.enableDynamicTopK === true;
            if (calConfig.estimatedCandidateKeepRate != null) {
                this.estimatedCandidateKeepRate = Math.max(1, calConfig.estimatedCandidateKeepRate);
            }
            if (calConfig.maxEstimatedCandidateExtra != null) {
                this.maxEstimatedCandidateExtra = Math.max(0, calConfig.maxEstimatedCandidateExtra | 0);
            }
            if (calConfig.recipePerturbRuns != null) {
                this.recipePerturbRuns = Math.max(1, calConfig.recipePerturbRuns | 0);
            }
            if (calConfig.recipeCandidateExpandRate != null) {
                this.recipeCandidateExpandRate = Math.max(1, calConfig.recipeCandidateExpandRate);
            }
            if (calConfig.recipeCandidateExpandMax != null) {
                this.recipeCandidateExpandMax = Math.max(0, calConfig.recipeCandidateExpandMax | 0);
            }
        }

        //拥有的厨师，菜谱，厨具
        this.ownChefs = null;

        //在场生效厨师
        this.presenceChefs = null;

        this.ownRecipes = null;
        this.ownEquips = null;

        this.tempOwnRecipes = null;


        this.playChefs = []; //上场厨师（不受其他厨师影响）
        this.playPresenceChefs = []; //上场厨师（在场生效厨师）

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
        GodInference.modifyChefValue(this.presenceChefs, this.globalAddtion);
        this.buildRecipeTags();
        this.estimatedChefs = [...this.ownChefs, ...this.presenceChefs];
        this.estimatedQualityCal = new Calculator(this.globalAddtion.useall, this.recipeReward, this.sexReward);

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
        const needPrioritize = this.enableDynamicTopK;
        const groupOrder = new Int32Array(this.playRecipeGroup.length);
        for (let i = 0; i < this.playRecipeGroup.length; i++) {
            groupOrder[i] = i;
        }
        if (needPrioritize) {
            const rankList = new Array(this.playRecipeGroup.length);
            for (let i = 0; i < this.playRecipeGroup.length; i++) {
                const group = this.playRecipeGroup[i];
                let score = 0;
                for (let j = 0; j < 9; j++) {
                    const item = group[j];
                    const recipe = item.recipe;
                    const estimatedRewardPrice = recipe.estimatedRewardPrice != null ? recipe.estimatedRewardPrice : (recipe.rewardPrice != null ? recipe.rewardPrice : recipe.price);
                    score += (estimatedRewardPrice * item.count) | 0;
                }
                rankList[i] = { index: i, score };
            }
            rankList.sort((a, b) => b.score - a.score);
            for (let i = 0; i < rankList.length; i++) {
                groupOrder[i] = rankList[i].index;
            }
        }

        for (let i = 0; i < this.playRecipeGroup.length; i++) {
            let playRecipes = this.playRecipeGroup[groupOrder[i]];
            for (let j = 0; j < 9; j++) {
                playRecipesArr[i * 9 + j] = playRecipes[j].index    //idToIndex.get(playRecipes[j].getRecipe().recipeId)
            }
            //让新放入的9个值从小打到排列
            this.sortArraySegment(playRecipesArr, i * 9, i * 9 + 8)
        }

        let total = this.playRecipeGroup.length;
        let maxScoreResult = null;
        let that = this;

        const recipePL = recipepl.disordePermuation_$LI$();


        let totalPlayChefCount = this.tempCalCache.playChefs.length + this.tempCalCache.playPresenceChefs.length;
        let totalChefCount = this.ownChefs.length + this.presenceChefs.length;

        const chefRealIndex = new Int32Array(totalPlayChefCount)
        let tAdd = 0;
        for (let r = 0; r < totalChefCount; r++) {
            let equipCount = this.tempCalCache.chefEquipCount[r];
            let start = tAdd, end = tAdd + equipCount + 1;
            for (let t = start; t < end; t++) {
                if (r < this.ownChefs.length) {
                    chefRealIndex[t] = r;
                } else {
                    chefRealIndex[t] = this.presenceChefs[r - this.ownChefs.length].index;
                }
            }
            tAdd = end;
        }


        //console.log(playRecipesArr)
        let data = {
            playRecipesArr,
            recipePL,
            scoreCache: this.tempCalCache.scoreCache,
            amberPrice: this.tempCalCache.amberPrice,
            recipeCount: this.tempCalCache.recipeCount,
            playChefCount: this.tempCalCache.playChefs.length,
            ownChefCount: this.ownChefs.length,
            playPresenceChefCount: this.tempCalCache.playPresenceChefs.length,
            presenceChefCount: this.presenceChefs.length,
            chefEquipCount: this.tempCalCache.chefEquipCount,
            chefMasks: this.tempCalCache.chefMasks,
            chefMatchMasks: this.tempCalCache.chefMatchMasks,
            chefRealIndex: chefRealIndex,
            ownChefTopK: this.ownChefTopK,
            baseOwnChefTopK: this.baseOwnChefTopK,
            enableDynamicTopK: this.enableDynamicTopK && this.ownChefTopK > this.baseOwnChefTopK
        }

        return new Promise(async resolve => {
            let chefAndRecipeThread = new ChefAndRecipeThread();
            await chefAndRecipeThread.setBaseData(data);

            let isMobile = false;
            if (typeof navigator !== 'undefined') {
                isMobile = !!navigator.userAgent.match(
                    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i,
                );
            }
            if (this.enableDynamicTopK && this.ownChefTopK <= this.baseOwnChefTopK) {
                console.warn('[dynamicTopK] 已开启但未生效：需要 ownChefTopK > baseOwnChefTopK');
            }
            const useGpuStage2 = !isMobile && typeof navigator !== 'undefined' && !!navigator.gpu;
            if (!isMobile && typeof navigator !== 'undefined' && !navigator.gpu) {
                console.warn('[GPU] 当前浏览器不支持 WebGPU，使用 CPU 路径');
            }
            if (useGpuStage2) {
                maxScoreResult = await chefAndRecipeThread.callWithGpu(0, total);
            } else {
                maxScoreResult = chefAndRecipeThread.call(0, total);
            }

            if (maxScoreResult == null || maxScoreResult.recipes == null) {
                resolve(null);
                return;
            }
            const topPlayChefs = that.parseLong(playRecipesArr, maxScoreResult);
            end = Date.now();
            console.info("总用时 " + (end - start) + "ms");
            resolve(that.calSecondStage(topPlayChefs));
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

        this.tempCalCache = builder.build(this.ownChefs, this.presenceChefs, this.playRecipes, this.useEquip ? this.playEquips : [], this.officialGameData
            , this.globalAddtion, this.recipeReward, this.sexReward);


        this.playChefs = this.tempCalCache.playChefs
        this.playPresenceChefs = this.tempCalCache.playPresenceChefs
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
        let materialCounts = getMaterialCount(this.materials);
        let recipeCounts = new Int32Array(1500)
        this.calQuantity(recipeCounts, materialCounts);


        //预估
        const product = this.deepLimit.reduce((acc, num) => acc * num);
        console.log("预估组合数", product);

        this.tempOwnRecipes = this.selectRecipeCandidatesWithPerturbation(recipeCounts, this.tempOwnRecipes);

        //tempOwnRecipes 中的id进行压缩

        for (let i = 0; i < this.tempOwnRecipes.length; i++) {
            let r = this.tempOwnRecipes[i];
            r.pIndex = i;
            let recipeId = r.recipeId;
            const reward = this.recipeReward[recipeId];
            r.rewardPrice = r.price * (1 + reward);
            let estimatedChefAdd = this.estimatedChefAdd(r);
            if (!Number.isFinite(estimatedChefAdd) || estimatedChefAdd < 0) {
                estimatedChefAdd = 0;
            }
            r.estimatedChefAdd = estimatedChefAdd;
            r.estimatedRewardPrice = r.price * (1 + reward + estimatedChefAdd);
        }


        let ignoreRecipeId = new Int8Array(this.tempOwnRecipes.length);

        this.playRecipeGroup = new Array(product);
        this.playRecipeGroupIndex = 0;

        let initialRecipeCounts = new Int32Array(this.tempOwnRecipes.length)
        this.calQuantity2(initialRecipeCounts, materialCounts);
        let priceAscResult = this.sortOfPrice(initialRecipeCounts, this.tempOwnRecipes, ignoreRecipeId);

        console.time("菜谱组合用时");
        this.recipePermutation(1, [], materialCounts, ignoreRecipeId, 0n, initialRecipeCounts, priceAscResult);
        console.timeEnd("菜谱组合用时");
        console.log("实际组合数", this.playRecipeGroup.length)
        let maxScore = 0;
        let maxEstimatedScore = 0;

        let totalScoreCache = new Int32Array(this.playRecipeGroup.length);
        let estimatedScoreCache = new Int32Array(this.playRecipeGroup.length);

        for (let i = 0; i < this.playRecipeGroup.length; i++) {
            let temp = this.playRecipeGroup[i];
            if (temp == null) {
                this.playRecipeGroup.length = i;
                break
            }
            let score = 0;
            let estimatedScore = 0;
            for (let j = 0; j < 9; j++) {
                let count = temp[j].count
                let ownRecipe = temp[j].recipe
                const reward = this.recipeReward[ownRecipe.recipeId];
                //这里要考虑厨师做菜到传可以增加100%售价
                score += ((ownRecipe.price * (1 + reward + 1) * count) | 0);
                const estimatedChefAdd = ownRecipe.estimatedChefAdd == null ? 1 : ownRecipe.estimatedChefAdd;
                estimatedScore += ((ownRecipe.price * (1 + reward + estimatedChefAdd) * count) | 0);
            }
            totalScoreCache[i] = score;
            estimatedScoreCache[i] = estimatedScore;
            if (maxScore < score) {
                maxScore = score;
            }
            if (maxEstimatedScore < estimatedScore) {
                maxEstimatedScore = estimatedScore;
            }
        }
        const filterScoreRate = this.filterScoreRate;
        const scoreThreshold = maxScore * filterScoreRate;
        const estimatedScoreThreshold = maxEstimatedScore * filterScoreRate;
        const candidateMap = new Map();
        let baseCount = 0;
        for (let i = 0; i < this.playRecipeGroup.length; i++) {
            let temp = this.playRecipeGroup[i];
            if (temp == null) {
                continue
            }
            let score = totalScoreCache[i];
            let estimatedScore = estimatedScoreCache[i];
            let basePass = score >= scoreThreshold;
            let estimatedPass = estimatedScore >= estimatedScoreThreshold;
            if (!basePass && !estimatedPass) {
                continue;
            }
            temp.sort((r1, r2) => {
                return r2.id - r1.id;
            });
            let key = "";
            for (let j = 0; j < 9; j++) {
                let count = temp[j].count
                let ownRecipe = temp[j].recipe
                key = key + "-" + ownRecipe.recipeId + "-" + count
            }
            let oldCandidate = candidateMap.get(key);
            if (oldCandidate == null) {
                if (basePass) {
                    baseCount++;
                }
                candidateMap.set(key, {
                    playRecipeGroup: temp,
                    score,
                    estimatedScore,
                    basePass
                });
            } else {
                if (basePass && !oldCandidate.basePass) {
                    oldCandidate.basePass = true;
                    baseCount++;
                }
                const oldCombined = oldCandidate.score + oldCandidate.estimatedScore;
                const newCombined = score + estimatedScore;
                if (newCombined > oldCombined) {
                    oldCandidate.playRecipeGroup = temp;
                }
                if (score > oldCandidate.score) {
                    oldCandidate.score = score;
                }
                if (estimatedScore > oldCandidate.estimatedScore) {
                    oldCandidate.estimatedScore = estimatedScore;
                }
            }
        }

        let candidates = Array.from(candidateMap.values());
        if (baseCount <= 0 || candidates.length <= baseCount) {
            this.playRecipeGroup = candidates.map((item) => item.playRecipeGroup);
        } else {
            const safeMaxScore = maxScore <= 0 ? 1 : maxScore;
            const safeMaxEstimatedScore = maxEstimatedScore <= 0 ? 1 : maxEstimatedScore;
            candidates.sort((a, b) => {
                const aRank = Math.max(a.score / safeMaxScore, a.estimatedScore / safeMaxEstimatedScore);
                const bRank = Math.max(b.score / safeMaxScore, b.estimatedScore / safeMaxEstimatedScore);
                return bRank - aRank;
            });
            let targetCount = Math.ceil(baseCount * this.estimatedCandidateKeepRate);
            targetCount = Math.min(targetCount, baseCount + this.maxEstimatedCandidateExtra);
            targetCount = Math.max(baseCount, targetCount);
            candidates.length = Math.min(targetCount, candidates.length);
            this.playRecipeGroup = candidates.map((item) => item.playRecipeGroup);
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

            let t2 = ownRecipe.estimatedChefAdd;
            if (t2 == null) {
                t2 = this.estimatedChefAdd(ownRecipe);
                ownRecipe.estimatedChefAdd = t2;
            }

            prices[ownRecipe.recipeId] = ((ownRecipe.price * (1 + reward + t2) * quantity[ownRecipe.recipeId]) | 0);
        }

        //返回每个菜对应的索引位置
        recipes.sort((r1, r2) => {
            return prices[r2.recipeId] - prices[r1.recipeId];
        });
    }

    selectRecipeCandidatesWithPerturbation(quantity, recipes) {
        const baseLimit = Math.min(this.recipeLimit, recipes.length);
        if (baseLimit <= 0) {
            return [];
        }

        this.estimatedPriceAndSort(quantity, recipes);
        if (recipes.length <= baseLimit || this.recipePerturbRuns <= 1) {
            return recipes.slice(0, baseLimit);
        }

        const metrics = new Array(recipes.length);
        const metricByRecipeId = new Map();
        let maxTotal = 0;
        let maxUnit = 0;
        let maxCount = 0;
        for (let i = 0; i < recipes.length; i++) {
            let recipe = recipes[i];
            const recipeId = recipe.recipeId;
            const count = quantity[recipeId] | 0;
            const reward = this.recipeReward[recipeId];
            let estimatedChefAdd = recipe.estimatedChefAdd;
            if (estimatedChefAdd == null) {
                estimatedChefAdd = this.estimatedChefAdd(recipe);
                recipe.estimatedChefAdd = estimatedChefAdd;
            }
            const unitScore = recipe.price * (1 + reward + estimatedChefAdd);
            const totalScore = ((unitScore * count) | 0);
            const metric = {
                recipe,
                totalScore,
                unitScore,
                count
            };
            metrics[i] = metric;
            metricByRecipeId.set(recipeId, metric);
            if (totalScore > maxTotal) {
                maxTotal = totalScore;
            }
            if (unitScore > maxUnit) {
                maxUnit = unitScore;
            }
            if (count > maxCount) {
                maxCount = count;
            }
        }

        const selectedMap = new Map();
        for (let i = 0; i < baseLimit; i++) {
            selectedMap.set(recipes[i].recipeId, recipes[i]);
        }

        const runs = Math.max(1, this.recipePerturbRuns | 0);
        const safeMaxTotal = maxTotal <= 0 ? 1 : maxTotal;
        const safeMaxUnit = maxUnit <= 0 ? 1 : maxUnit;
        const safeMaxCount = maxCount <= 0 ? 1 : maxCount;
        const perturbWeights = [
            [0.82, 0.12, 0.06, 0.03],
            [0.72, 0.08, 0.20, 0.04],
            [0.66, 0.24, 0.10, 0.02],
            [0.90, 0.02, 0.08, 0.05],
            [0.74, 0.18, 0.08, 0.06]
        ];

        for (let run = 1; run < runs; run++) {
            const weights = perturbWeights[(run - 1) % perturbWeights.length];
            const wb = weights[0], wu = weights[1], wc = weights[2], wn = weights[3];
            const ranked = metrics.slice();
            ranked.sort((a, b) => {
                const an = this.deterministicNoise(a.recipe.recipeId, run);
                const bn = this.deterministicNoise(b.recipe.recipeId, run);
                const as = wb * (a.totalScore / safeMaxTotal)
                    + wu * (a.unitScore / safeMaxUnit)
                    + wc * (a.count / safeMaxCount)
                    + wn * an;
                const bs = wb * (b.totalScore / safeMaxTotal)
                    + wu * (b.unitScore / safeMaxUnit)
                    + wc * (b.count / safeMaxCount)
                    + wn * bn;
                if (as === bs) {
                    return b.totalScore - a.totalScore;
                }
                return bs - as;
            });

            const take = Math.min(baseLimit, ranked.length);
            for (let i = 0; i < take; i++) {
                selectedMap.set(ranked[i].recipe.recipeId, ranked[i].recipe);
            }
        }

        let finalLimit = baseLimit;
        if (selectedMap.size > baseLimit) {
            let expandByRate = Math.ceil(baseLimit * this.recipeCandidateExpandRate);
            finalLimit = Math.max(baseLimit, expandByRate);
            finalLimit = Math.min(finalLimit, baseLimit + this.recipeCandidateExpandMax);
            finalLimit = Math.min(finalLimit, selectedMap.size);
        }

        const selectedRecipes = Array.from(selectedMap.values());
        selectedRecipes.sort((r1, r2) => {
            const m1 = metricByRecipeId.get(r1.recipeId);
            const m2 = metricByRecipeId.get(r2.recipeId);
            const s1 = m1 == null ? 0 : m1.totalScore;
            const s2 = m2 == null ? 0 : m2.totalScore;
            return s2 - s1;
        });
        if (selectedRecipes.length > finalLimit) {
            selectedRecipes.length = finalLimit;
        }

        console.info(`[候选菜谱扰动] 基础${baseLimit} 扩展到${selectedMap.size} 最终${selectedRecipes.length} run=${runs}`);
        return selectedRecipes;
    }

    deterministicNoise(recipeId, run) {
        let x = (Math.imul((recipeId + 1), 1103515245) + Math.imul((run + 1), 12345) + 0x9e3779b9) >>> 0;
        x ^= x >>> 16;
        x = Math.imul(x, 2246822519) >>> 0;
        x ^= x >>> 13;
        return x / 4294967295;
    }

    estimatedChefAdd(recipe) {
        const chefs = this.estimatedChefs;
        const qualityCal = this.estimatedQualityCal;
        if (chefs == null || chefs.length === 0 || qualityCal == null) {
            return this.legacyEstimatedChefAdd(recipe);
        }

        let best1 = -1;
        let best2 = -1;
        let best3 = -1;
        for (let i = 0; i < chefs.length; i++) {
            const chef = chefs[i];
            const skillEffect = chef.skillEffect;
            if (skillEffect == null) {
                continue;
            }
            const score = qualityCal.qualityAddNoEquip(chef, skillEffect, recipe);
            if (score > best1) {
                best3 = best2;
                best2 = best1;
                best1 = score;
            } else if (score > best2) {
                best3 = best2;
                best2 = score;
            } else if (score > best3) {
                best3 = score;
            }
            if (best1 >= 1 && best2 >= 1 && best3 >= 1) {
                break;
            }
        }

        if (best1 < 0) {
            return this.legacyEstimatedChefAdd(recipe);
        }
        const q1 = Math.max(best1, 0);
        if (best2 < 0) {
            return q1;
        }
        const q2 = Math.max(best2, 0);
        const q3 = Math.max(best3, 0);
        return Math.min(1, q1 * 0.65 + q2 * 0.25 + q3 * 0.1);
    }

    legacyEstimatedChefAdd(recipe) {
        const abc = [-1, 0, 0.1, 0.3, 0.5, 1.0];
        const v1 = 500, v2 = 400;

        // 仅使用该菜谱要求的技法进行估算
        const skills = [];
        for (const key of ['bake', 'boil', 'stirfry', 'knife', 'fry', 'steam']) {
            const value = recipe[key];
            if (value > 0) {
                skills.push(value);
            }
        }
        if (skills.length === 0) {
            return 0;
        }
        skills.sort((a, b) => b - a); // 降序排列

        let a = Math.min(v1 / skills[0], 5) | 0; // 最高技法与v1比较
        let b = skills.length > 1 ? (Math.min(v2 / skills[1], 5) | 0) : 5; // 单技法时不惩罚
        const value = Math.min(abc[a], abc[b]);
        return Math.max(0, value);
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

        recipes[0] = precipes[0];
        recipes[1] = precipes[1];
        recipes[2] = precipes[2];
        recipes[3] = precipes[3];
        recipes[4] = precipes[4];
        recipes[5] = precipes[5];
        recipes[6] = precipes[6];
        recipes[7] = precipes[7];
        recipes[8] = precipes[8];

        const chefs = maxScoreResult.maxScoreChefGroup;
        return new TopResult(chefs, recipes, score, maxScoreResult.scores);
    }

    /**
     * 第二阶段的计算
     * @param {TopResult} topPlayChef
     */
    calSecondStage(topPlayChef) {
        // debugger
        let scoreCache = this.tempCalCache.scoreCache
        let recipeCount = this.tempCalCache.recipeCount
        let chefIds = topPlayChef.chefs;
        let recipeIds = topPlayChef.recipeids;
        let result = []
        let chefs = [];
        for (let i = 0; i < 3; i++) {
            let ownChef = this.playChefs[chefIds[i]];

            if (ownChef == null) {
                ownChef = this.playPresenceChefs[chefIds[i] - this.playChefs.length];
            }
            let name1 = this.playRecipes[recipeIds[(i * 3)]].name;
            let count1 = this.playRecipes[recipeIds[(i * 3)]].count;
            let name2 = this.playRecipes[recipeIds[(i * 3) + 1]].name;
            let count2 = this.playRecipes[recipeIds[(i * 3) + 1]].count;
            let name3 = this.playRecipes[recipeIds[(i * 3) + 2]].name;
            let count3 = this.playRecipes[recipeIds[(i * 3) + 2]].count;

            let t1 = chefIds[i] * recipeCount;
            let t2 = chefIds[i] * recipeCount;
            let t3 = chefIds[i] * recipeCount;
            //scoreCache[chefIds[i] * recipeCount + i] === 0 || scoreCache[t * recipeCount + j] === 0 || scoreCache[t * recipeCount + k]

            let s1 = scoreCache[chefIds[i] * recipeCount + recipeIds[(i * 3)]]
            let s2 = scoreCache[chefIds[i] * recipeCount + recipeIds[(i * 3) + 1]]
            let s3 = scoreCache[chefIds[i] * recipeCount + recipeIds[(i * 3) + 2]]


            chefs.push({
                chef: ownChef.name,
                equip: ownChef.remark ? ownChef.remark : '',
                recipes: [
                    {recipe: name1, count: count1, singlePrice: s1 / count1, totalPrice: s1}
                    , {recipe: name2, count: count2, singlePrice: s2 / count2, totalPrice: s2}
                    , {recipe: name3, count: count3, singlePrice: s3 / count3, totalPrice: s3}
                ]
            })
        }
        result = {
            chefs,
            score: topPlayChef.totalScore
        }
        console.log(result)
        return [result]
    }


    /**
     * 生成候选的菜谱序列 9个菜谱
     *
     * @param index 菜谱序号1-9 代表1到9号位
     * @param play 9个菜谱的集合
     * @param materialCount 剩余食材
     * @param ignoreRecipeId : Int8Array 忽略的菜谱id
     * @param lastMaterialBit : BigInt 上一道挑选的菜的食材信息
     * @param lastRecipeCount 上一次计算出来的各个菜可做数量
     * @param lastPrice 上一次计算出来的价格
     *
     * */
    recipePermutation(index, play, materialCount, ignoreRecipeId, lastMaterialBit, lastRecipeCount, lastPrice) {

        if (index === 10) {
            this.playRecipeGroup[this.playRecipeGroupIndex++] = play;
            return;
        }

        let limit = this.deepLimit[index];
        //拷贝食材数量
        let recipeCounts = new Int32Array(this.tempOwnRecipes.length);

        let topKHeap = new MinHeap(limit);

        //计算奖励倍数加持下,根据剩余食材计算各个菜最多做多少份
        this.calQuantityAndPriceFromLastResult(this.tempOwnRecipes, recipeCounts, topKHeap, lastMaterialBit
            , materialCount, lastRecipeCount, lastPrice, ignoreRecipeId);
        let priceTopKResult = topKHeap.getAll().slice();
        priceTopKResult.sort((a, b) => {
            if (a === b) {
                return 0;
            }
            return a < b ? -1 : 1;
        });

        const length = Math.min(limit, priceTopKResult.length)
        let removesRecipeIndex = [];
        for (let i = 0; i < length; i++) {
            //根据份数计算得分，并降序排列返回

            let priceIdAndScore = priceTopKResult[length - i - 1];
            let pIndex = Number(priceIdAndScore & 0xFFFFFFFFn);

            //let pIndex  = q.pop();
            //let score  = Number((priceIdAndScore>>32n) & 0xFFFFFFFFn);


            const quantity = recipeCounts[pIndex];
            if (quantity === 0) {
                continue;
            }


            const newPlayRecipes = new Array(9);

            for (let j = 0; j < index - 1; j++) {
                newPlayRecipes[j] = play[j];
            }

            let selectRecipe = this.tempOwnRecipes[pIndex]
            newPlayRecipes[index - 1] = new PlayRecipe(selectRecipe, quantity);

            //设置为忽略
            ignoreRecipeId[pIndex] = 1;
            //removesRecipeIndex.push(pIndex)

            this._reduceMaterials(selectRecipe.materials2, quantity, materialCount);


            this.recipePermutation(index + 1, newPlayRecipes, materialCount, ignoreRecipeId
                , selectRecipe.materialFeature, recipeCounts, null);

            // 3. 递归返回后，原地恢复食材
            this._restoreMaterials(selectRecipe.materials2, quantity, materialCount);
            ignoreRecipeId[pIndex] = 0;
        }

        for (let remove of removesRecipeIndex) {
            ignoreRecipeId[remove] = 0;
        }
    }





    /**
     * 原地减少食材数量（用于回溯）
     * @param {Array} materials - 菜谱所需的食材列表
     * @param {number} count - 制作份数
     * @param {Int32Array} materialCount - 当前食材存量数组（将被原地修改）
     */
    _reduceMaterials(materials, count, materialCount) {
        for (const material of materials) {
            materialCount[material.material] -= material.quantity * count;
        }
    }

    /**
     * 原地恢复食材数量（用于回溯）
     * @param {Array} materials - 菜谱所需的食材列表
     * @param {number} count - 制作份数
     * @param {Int32Array} materialCount - 当前食材存量数组（将被原地修改）
     */
    _restoreMaterials(materials, count, materialCount) {
        for (const material of materials) {
            materialCount[material.material] += material.quantity * count;
        }
    }

    /**
     * @param recipes : Array
     * @param recipeCounts : Int32Array
     * @param priceAscResult : MinHeap
     * @param lastMaterialFeature : BigInt
     * @param materialCount : Int32Array 各种食材的剩余数量,数组下标对应食材的id
     * @param lastRecipeCount : Int32Array
     * @param lastPrice : BigUint64Array
     * @param ignoreRecipeId : Int8Array
     * @return
     */
    calQuantityAndPriceFromLastResult(recipes, recipeCounts, priceAscResult, lastMaterialFeature, materialCount, lastRecipeCount, lastPrice, ignoreRecipeId) {

        recipeCounts.set(lastRecipeCount)
        let resultIndex = 0;
        const maxEquipLimit = this.globalAddtion.maxequiplimit;
        const length = recipes.length;
        for (let i = 0; i < length; i++) {
            let ownRecipe = recipes[i];
            let id = ownRecipe.pIndex;

            let materialFeature = ownRecipe.materialFeature;
            let count = recipeCounts[id];
            if ((lastMaterialFeature & materialFeature) !== 0n) {
                count = IngredientLimit.cookingQuantity(ownRecipe.materials2, ownRecipe.limit + maxEquipLimit[ownRecipe.rarity], materialCount);
                recipeCounts[id] = count;
            }
            if (count === 0) {
                continue
            }
            if (ignoreRecipeId[id] !== 0) {
                continue
            }
            const estimatedRewardPrice = ownRecipe.estimatedRewardPrice ? ownRecipe.estimatedRewardPrice : ownRecipe.rewardPrice;
            let computedPrice = BigInt((estimatedRewardPrice * count) | 0);
            priceAscResult.insert(computedPrice << 32n | BigInt(ownRecipe.pIndex))
        }
    }


    cookingQuantityAndReduce(materials, count, materialCount) {
        let destinationArray = new Int32Array(47);
        destinationArray.set(materialCount);
        let maxCount = count;
        const length = materials.length;
        for (let i = 0; i < length; i++) {
            const material = materials[i];
            destinationArray[material.material] = destinationArray[material.material] - material.quantity * maxCount;
        }
        return destinationArray;
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

    calQuantity2(counts, materialCount) {
        const maxEquipLimit = this.globalAddtion.maxequiplimit;
        const length = this.tempOwnRecipes.length;
        for (let i = 0; i < length; i++) {
            let ownRecipe = this.tempOwnRecipes[i];
            const count = IngredientLimit.cookingQuantity(ownRecipe.materials2, ownRecipe.limit + maxEquipLimit[ownRecipe.rarity], materialCount);
            counts[ownRecipe.pIndex] = count;
        }
        return counts;
    }


    /**
     * @param quantity : Int32Array
     * @param recipes : Array
     * @param ignoreRecipeId : Int8Array
     * */
    sortOfPrice(quantity, recipes, ignoreRecipeId) {
        let result = new BigUint64Array(recipes.length);

        for (let i = 0; i < recipes.length; i++) {
            let ownRecipe = recipes[i];
            let recipeId = ownRecipe.recipeId;
            let id = ownRecipe.pIndex;
            if (ignoreRecipeId[id] !== 0) {
                continue
            }
            const estimatedRewardPrice = ownRecipe.estimatedRewardPrice ? ownRecipe.estimatedRewardPrice : (ownRecipe.price * (1 + this.recipeReward[recipeId]));
            let computedPrice = BigInt((estimatedRewardPrice * quantity[id]) | 0);
            if (computedPrice === 0n) {
                continue
            }
            result[i] = computedPrice << 32n | BigInt(ownRecipe.pIndex)
        }
        result.sort()
        return result;
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
        let ownChefs = this.myGameData.chefs.filter((chef) => {

            //排除厨师
            // if (['兰飞鸿','执笔人','李清凝','艾琳','今珏','普洛妮','玄离','特图图'].indexOf(chef.name)!==-1){
            //     return false;
            // }
            // if (['雷恩'].indexOf(chef.name)!==-1){
            //     return false;
            // }
            return this.mustChefs.indexOf(chef.name) !== -1 || chef.rarity >= this.chefMinRarity;
        }).sort((chef, chef2) => {
            return chef.chefId - chef2.chefId;
        });

        let presenceChefs = [];
        // let partialSkillChef = ['兰飞鸿','露西','美乐蒂'];
        let useGlobalSkillChef = ['兰飞鸿'];
        for (const ownChef of ownChefs) {
            if (useGlobalSkillChef.indexOf(ownChef.name) === -1) {
                continue
            }
            let chefList = createPartialSkillChef(this.officialGameData, ownChef, ownChefs)
            console.log("在场生效技能，扩展厨师", chefList)
            //新生成的厨师要做出来

            presenceChefs.push(...chefList)
        }

        for (const ownChef of ownChefs) {
            buildChefSkillEffect(this.officialGameData, ownChef);
        }
        for (const ownChef of presenceChefs) {
            buildChefSkillEffect(this.officialGameData, ownChef);
        }


        this.ownChefs = ownChefs;
        this.presenceChefs = presenceChefs;

        //70 -> 630 -> (630 * 200) -> 126000
        //每个厨师生成一个副本

        // 兰飞鸿[制作料理基础售价+30%小当家系列厨师在场时对其也生效] 小当家系列
        // 露西[场上厨师制作神级料理基础售价+25%]
        // 美乐蒂[场上厨师制作5火料理基础售价+450]
        // 今珏[场上厨师制作5火料理基础售价+20%]

        // 南飞[制作三种同技法料理在场基础售价+5%]
        // 年糕[制作三种同技法料理场上炸料理售价+20%]
        // 泉映月[制作三种同技法料理在场蒸料理基础售价+10%]
        // 普洛妮[场上女性厨师制作蒸料理售价+30%] 女性
        // 雨荷[场上厨师制作炒料理基础售价+35%] 炒厨师
        // 悲歌[场上厨师制作3火料理售价+50%]

        //每个厨师生成三个副本
        // 艾琳[每制作一种神级料理场上厨师炸售价+10%]
        // 特图图[每制作一种神级料理场上厨师蒸售价+10%]


        this.tempOwnRecipes = this.myGameData.recipes;
        for (let tempOwnRecipe of this.tempOwnRecipes) {
            tempOwnRecipe.materials2 = tempOwnRecipe.materials
        }
        let equips = []


        //获取所有3星出局

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
    }
}


class TempCalCache {
    constructor(chefCount, presenceChefCount, recipeCount) {
        this.scoreCache = null;
        this.groupMaxScore = null;
        this.groupMaxScoreChefIndex = null;
        this.groupRecipeIndex = null; //一维数组，   一组菜谱3个，这个是前两个菜谱的索引,


        this.recipeCount = recipeCount;

        this.scoreCache = null;
        this.amberPrice = new Int32Array(recipeCount * 17);
        this.groupRecipeIndex = null;

        this.playChefs = null;
        this.chefEquipCount = new Int32Array(chefCount + presenceChefCount);
    }
}


class TempCalCacheBuilder {
    constructor() {
        this.tempCalCache = null;
        this.recipeReward = null;
        this.sexReward = null;
        this.officialGameData = null;
        this.kitchenGodCal = null;
        this.ownChefs = null;
        this.playRecipes = null;
    }

    build(ownChefs, presenceChefs, playRecipes, playEquips, officialGameData, globalAddition, recipeReward, sexReward) {
        this.officialGameData = officialGameData;
        this.kitchenGodCal = new Calculator(globalAddition.useall, recipeReward, sexReward);

        //this.updateId(ownChefs,0);
        this.updateId(ownChefs, presenceChefs);


        this.ownChefs = ownChefs;
        this.presenceChefs = presenceChefs;


        this.playChefs = [...ownChefs];
        this.playRecipes = playRecipes;
        this.recipeReward = recipeReward;
        this.sexReward = sexReward;
        this.playEquips = playEquips;


        this.tempCalCache = new TempCalCache(ownChefs.length, presenceChefs.length, playRecipes.length);
        // let chefEquipCount = this.tempCalCache.chefEquipCount;


        this.createCalCache();
        return this.tempCalCache;
    }

    updateId(ownChefs, presenceChefs) {
        let IndexMap = new Map();
        for (let i = 0; i < ownChefs.length; i++) {
            const chef = ownChefs[i];
            chef.index = i;
            IndexMap.set(chef.chefId, i)
        }
        for (let i = 0; i < presenceChefs.length; i++) {
            const chef = presenceChefs[i];
            let index = IndexMap.get(chef.chefId)
            chef.index = index;
        }
    }

    createChefWithEquip(chefs, chefEquipCount, start) {
        let playRecipes = this.playRecipes;
        let equips = this.playEquips;
        let playEquipChefs = [];

        for (let i = 0; i < chefs.length; i++) {
            let ownChef = chefs[i];

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
                let newPlayChef = cloneObject(ownChef);
                newPlayChef.selfEquipSkillIds = equip.skill
                buildChefSkillEffect(this.officialGameData, newPlayChef);
                let equipScores = new Int32Array(playRecipes.length);

                //只要厨具存在增加分数效果，就可以上
                let scoreAddOk = false;
                for (let t = 0; t < playRecipeCount; t++) {
                    const calRecipe = playRecipes[t];
                    //   equipScores[t] = this.kitchenGodCal.calSinglePrice(newPlayChef, calRecipe) * calRecipe.count;

                    if (this.kitchenGodCal.calSinglePrice(newPlayChef, calRecipe) * calRecipe.count > 0) {
                        scoreAddOk = true;
                        break;
                    }

                }
                // let sum = 0;
                // //一个厨具应该能让三个菜的总分
                // for (let k = 0; k < playRecipeCount; k++) {
                //     sum = sum + (equipScores[k] - rawScores[k]);
                // }
                if (scoreAddOk) {
                    equipCount++;
                    newPlayChef.remark = equip.name
                    playEquipChefs.push(newPlayChef)
                }
            }
            chefEquipCount[start + i] = equipCount
        }
        return playEquipChefs;
    }

    createCalCache() {
        let playRecipes = this.playRecipes;
        //这里用来修改ownChefs
        let chefEquipCount = this.tempCalCache.chefEquipCount;

        let playChefs = [...this.ownChefs]
        let playPresenceChefs = [...this.presenceChefs]

        if (this.playEquips.length > 0) {
            playChefs = this.createChefWithEquip(this.ownChefs, chefEquipCount, 0)
            playPresenceChefs = this.createChefWithEquip(this.presenceChefs, chefEquipCount, this.ownChefs.length)
        }


        this.tempCalCache.playChefs = playChefs;
        this.tempCalCache.playPresenceChefs = playPresenceChefs;
        this.tempCalCache.chefCount = playChefs.length;
        this.tempCalCache.presenceChefCount = playPresenceChefs.length;
        this.tempCalCache.scoreCache = new Int32Array(playChefs.length * this.tempCalCache.recipeCount + playPresenceChefs.length * this.tempCalCache.recipeCount);


        // console.log('上场菜谱', playRecipes)
        // console.log('上场厨师', playChefs)


        let recipeCount = this.tempCalCache.recipeCount
        let scoreCache = this.tempCalCache.scoreCache;

        //todo 待确定是否实现
        //针对每制作一种类的技能，需要扩展单份分数的缓存，
        //每制作一种神级料理场上厨师蒸售价+10%
        //每制作一种神级料理菜谱基础售价+5%
        //每制作一种传级料理在场切售价+8%
        //每制作一种神级料理场上厨师炸售价+10%
        //400个菜谱，40000种厨师(带厨具)，只计算一组scoreCache得分，是61M内存，不带出局就是0.6m。这样的话计算10份也就600内存，
        //目前游戏里一共有4种这类技能，也就是要240m内存足够


        //各个品质对应的加成
        for (let i = 0; i < playChefs.length; i++) {
            const ownChef = playChefs[i];
            for (let t = 0; t < playRecipes.length; t++) {
                const playRecipe = playRecipes[t];
                const index = playRecipe.index;

                const singlePrice = this.kitchenGodCal.calSinglePrice(ownChef, playRecipe);
                scoreCache[i * recipeCount + index] = singlePrice * playRecipe.count;
            }
        }

        let start = playChefs.length * recipeCount;
        for (let i = 0; i < playPresenceChefs.length; i++) {
            const ownChef = playPresenceChefs[i];
            for (let t = 0; t < playRecipes.length; t++) {
                const playRecipe = playRecipes[t];
                const index = playRecipe.index;
                const singlePrice = this.kitchenGodCal.calSinglePrice(ownChef, playRecipe);
                scoreCache[start + i * recipeCount + index] = singlePrice * playRecipe.count;
            }
        }
        // debugger
        let startIndex = playChefs.length;
        let chefMasks = new Uint32Array(startIndex + playPresenceChefs.length).fill(0);
        let chefMatchMasks = new Uint32Array(startIndex + playPresenceChefs.length).fill(0);


        //this.tempCalCache.chefCount = playChefs.length;
        //this.tempCalCache.presenceChefCount = playPresenceChefs.length;

        //给厨师的mask生成对应所以
        for (let i = 0; i < playPresenceChefs.length; i++) {
            chefMasks[startIndex + i] = playPresenceChefs[i].mask;
            chefMatchMasks[startIndex + i] = playPresenceChefs[i].matchMask;
        }


        this.tempCalCache.chefMasks = chefMasks;
        this.tempCalCache.chefMatchMasks = chefMatchMasks;
        //后续扩展:  生成菜谱特征， 用六个bit代表菜谱用了那些技法  这样做三个菜的时候，三个菜的特征与运算，如果不等于0就代表是三种统计法菜谱


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
    constructor(deepLimit, recipeLimit, chefMinRarity, filterScoreRate, useEquip, useAll, mustChefs, ownChefTopK) {

        this.deepLimit = deepLimit;   //生成菜谱时候的遍历深度
        this.recipeLimit = recipeLimit;//菜谱限制，根据厨神规则排序菜谱，只是用前recipeLimit个菜
        this.chefMinRarity = chefMinRarity;    //上场3个厨师的星级和
        this.filterScoreRate = filterScoreRate;//使用厨具  带实现
        this.useSimpleEquip = useEquip;//使用新手池的六种三星技法厨具
        this.useEquip = useEquip;//使用厨具  待实现
        this.useAll = useAll;//拥有全厨师全修炼，全菜谱全专精
        this.mustChefs = ['二郎神'] //不收recipeLimit影响，参与计算的厨师
        this.ownChefTopK = ownChefTopK == null ? 3 : Math.max(3, ownChefTopK | 0);
        this.baseOwnChefTopK = 3;
        this.enableDynamicTopK = true;
        this.estimatedCandidateKeepRate = 1.12; // 允许保留部分估分高但基础分未达阈值的组合
        this.maxEstimatedCandidateExtra = 800; // 控制额外候选上限，避免候选爆炸
        this.recipePerturbRuns = 4; // 一阶段候选菜谱多次扰动探索次数
        this.recipeCandidateExpandRate = 1.35; // 相比基础recipeLimit允许的扩容比例
        this.recipeCandidateExpandMax = 60; // 扰动后最多增加的菜谱数量
    }

}

function setBit(m, pos) {
    return m | BigInt(1) << BigInt(pos);
}

// 兰飞鸿[制作料理基础售价+30%小当家系列厨师在场时对其也生效] 小当家系列
// 露西[场上厨师制作神级料理基础售价+25%]
// 美乐蒂[场上厨师制作5火料理基础售价+450]
// 今珏[场上厨师制作5火料理基础售价+20%]
//
// 南飞[制作三种同技法料理在场基础售价+5%]
// 年糕[制作三种同技法料理场上炸料理售价+20%]
// 泉映月[制作三种同技法料理在场蒸料理基础售价+10%]
// 普洛妮[场上女性厨师制作蒸料理售价+30%] 女性
// 雨荷[场上厨师制作炒料理基础售价+35%] 炒厨师
// 悲歌[场上厨师制作3火料理售价+50%]


// 艾琳和特图图先不考虑了
// 艾琳[每制作一种神级料理场上厨师炸售价+10%]
// 特图图[每制作一种神级料理场上厨师蒸售价+10%]


/**
 * 特征分类归纳 在场，在场 制作三种同技法料理，
 * BigUint64Array保存
 *
 *
 * 12个bit用于代表谁在场
 *
 *
 * 1bit代表是否三个菜同技法
 * 3bit代表自己做的神料理数量 0：000  1：001  2：010  3：100
 *
 *
 *
 * */


function createPartialSkillChef(officialGameData, chef, ownChefs) {
    let chefMask = {
        '兰飞鸿': 0b01
    }
    let chefName = chef.name;
    let mask = chefMask[chefName];


    let partialChefs = []
    let cloneChef = cloneObject(chef);
    cloneChef.mask = mask;
    cloneChef.matchMask = 0;
    partialChefs.push(cloneChef);


    let skill = officialGameData.getSkill(chef.skill);
    let partialEffects = []
    let effects = skill.effect;
    for (let i = 0; i < effects.length; i++) {
        let effect = effects[i];
        if ("Partial" !== effect.condition) {
            continue
        }
        partialEffects.push(effect);
    }

    if (chef.ult) {
        const ultimateId = chef.ultimateSkill;
        skill = officialGameData.getSkill(ultimateId);
        if (skill != null) {
            effects = skill.effect;
            for (let i = 0; i < effects.length; i++) {
                let effect = effects[i];
                if ("Partial" !== effect.condition) {
                    continue
                }
                partialEffects.push(effect);
            }
        }
    }


    for (const ownChef of ownChefs) {
        //这里判断一厨师能不能用此技能

        if (ownChef.name === chefName) {
            continue
        }
        let temp = [];
        for (let i = 0; i < partialEffects.length; i++) {
            let effect = partialEffects[i];
            if (effect.conditionType === 'ChefTag') {
                //过滤条件
                let conditionValueList = effect.conditionValueList
                let selfTag = ownChef.tags;
                if (selfTag == null) {
                    continue;
                }
                for (let i = 0; i < selfTag.length; i++) {
                    if (conditionValueList.indexOf(selfTag[i]) !== -1) {
                        temp.push(effect);
                        break;
                    }
                }
            } else {
                temp.push(effect);
            }
        }
        let cloneChef = cloneObject(ownChef);
        if (temp.length === 0) {
            continue;
        }
        cloneChef.partialEffects = temp;
        cloneChef.mask = 0;
        cloneChef.matchMask = mask;
        partialChefs.push(cloneChef);
    }
    return partialChefs;
}

function buildChefSkillEffect(officialGameData, chef) {
    //todo 待实现  厨具技能效果翻倍;自身效果加50%


    const skillEffect = new SkillEffect();
    let skill = officialGameData.getSkill(chef.skill);
    let effect = skill.effect;
    for (let i = 0; i < effect.length; i++) {
        skillEffect.effect(effect[i], skill, chef);
    }

    let doubleEquip = false;

    //如果没修炼，已经把修炼技能删除掉了
    if (chef.ult) {
        const ultimateId = chef.ultimateSkill;
        skill = officialGameData.getSkill(ultimateId);
        if (ultimateId === 528) {//厨具效果翻倍
            doubleEquip = true;
        }
        if (skill != null) {
            effect = skill.effect;
            for (let i = 0; i < effect.length; i++) {
                skillEffect.effect(effect[i], skill, chef);
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
                    skillEffect.effect(effect[i], skill, chef);
                    if (doubleEquip) {
                        skillEffect.effect(effect[i], skill, chef);
                    }
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
                    skillEffect.effect(effect[i], skill, chef);
                }
            }
        }
    }

    const partialEffects = chef.partialEffects;
    if (partialEffects) {
        for (let i = 0; i < partialEffects.length; i++) {
            skillEffect.partialEffect(partialEffects[i], skill, chef);
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

//浅层拷贝

export {GodInference, OfficialGameData, MyGameData, CalConfig, Calculator}
