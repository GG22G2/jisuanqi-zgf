


export class Calculator {
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


    basePriceAdd(effect, recipe) {
        //price = price * (1 + skillEffect.basePrice + skillEffect.basicPriceUseSteam)
        let add = effect.basePrice;
        if (recipe.bake !== 0) {
            add += (effect.basicPriceUseBake);
        }
        if (recipe.boil !== 0) {
            add += (effect.basicPriceUseBoil);
        }
        if (recipe.stirfry !== 0) {
            add += (effect.basicPriceUseStirfry);
        }
        if (recipe.knife !== 0) {
            add += (effect.basicPriceUseKnife);
        }
        if (recipe.fry !== 0) {
            add += (effect.basicPriceUseFry);
        }
        if (recipe.steam !== 0) {
            add += (effect.basicPriceUseSteam);
        }

        if (recipe.Tasty) {
            add += (effect.basicPriceUseTasty);
        }
        if (recipe.Salty) {
            add += (effect.basicPriceUseSalty);
        }
        if (recipe.Spicy) {
            add += (effect.basicPriceUseSpicy);
        }
        if (recipe.Sweet) {
            add += (effect.basicPriceUseSweet);
        }
        if (recipe.Bitter) {
            add += (effect.basicPriceUseBitter);
        }
        if (recipe.Sour) {
            add += (effect.basicPriceUseSour);
        }


        return add;
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
        //一份菜的得分 = ((菜谱单价*(1*基础售价加成)) *  1 * (p+g+r))) =
        let qualityAddS = 0;  //技法加成
        let skillEffect = ownChef.skillEffect;
        const rarity = skillEffect.rarity;
        const baseRarity = skillEffect.baseRarity;
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

        //基础售价的加成
        let basePriceAdd = this.basePriceAdd(skillEffect, ownRecipe) + baseRarity[ownRecipe.rarity];




        price = price * (1 + basePriceAdd);

        return Math.ceil(price * (this.base + this.recipeReward[ownRecipe.recipeId] + sexAdd + qualityAddQ + qualityAddS + this.useAll[ownRecipe.rarity] + rarity[ownRecipe.rarity])) | 0;
    }


    calSkillPrice(ownRecipe, skillEffect) {
        const rarity = skillEffect.rarity;
        let qualityAddS = this.skillAdd(skillEffect, ownRecipe);
        let price = ownRecipe.price;
        return Math.ceil(price * (qualityAddS)) | 0;
    }
}
