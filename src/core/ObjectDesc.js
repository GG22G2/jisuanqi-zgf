import {cloneObject} from "./utils.js";


class BitArray {
    constructor(length) {
        this.buffer = new Uint8Array(Math.ceil(length / 8));
    }

    get(index) {
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        return (this.buffer[byteIndex] & (1 << bitIndex)) !== 0;
    }

    set(index, value) {
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        if (value) {
            this.buffer[byteIndex] |= (1 << bitIndex); // 置1
        } else {
            this.buffer[byteIndex] &= ~(1 << bitIndex); // 置0
        }
    }
}

export class PlayChef {
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

export class PlayRecipe {
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

export class SkillEffect {
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

        //基础售价增加百分比
        this.basePrice = 0;

        //基础售价 固定数值   待实现
        this.basePriceAbs = 0;

        //基础售价增加百分比   蒸技法  1代表100%

        this.basicPriceUseBake = 0;
        this.basicPriceUseBoil = 0;
        this.basicPriceUseStirfry = 0;
        this.basicPriceUseKnife = 0;
        this.basicPriceUseFry = 0;
        this.basicPriceUseSteam = 0;


        this.basicPriceUseSour = 0;
        this.basicPriceUseSalty = 0;
        this.basicPriceUseTasty = 0;
        this.basicPriceUseSweet = 0;
        this.basicPriceUseSpicy = 0;
        this.basicPriceUseBitter = 0;


        //1,2,3,4,5星料理售价加成
        this.rarity = [0, 0, 0, 0, 0, 0]

        //1,2,3,4,5星料理基础售价加成  待实现
        this.baseRarity = [0, 0, 0, 0, 0, 0]

        // !!!大于等于!!!  某个份数生效
        this.excessCookbookNum = []

        //  !!!小于等于!!!   某个份数生效
        this.fewerCookbookNum = []

        //品质  !!!大于等于!!!  某个级别生效
        this.excessRank = []

        //品质  !!!大于等于!!!  某个级别生效
        this.baseExcessRank = []
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


    //处理光环类技能，作用加到当前厨师身上
    partialEffect(effect, skill, chef) {

        //会影响其他厨师的技能，直接将技能挂在到符合条件的厨师身上

        // 比如兰飞鸿【制作料理基础售价+30%小当家系列厨师在场时对其也生效】， 所以对刘昴星来说，就是创建两个刘昴星，一个是正常的刘昴星，另一个刘昴星除了有自己的技能，还包含兰飞鸿的修炼技能
        // 但是这种算最大分的时候要有额外校验，比如使用了兰飞鸿技能，最终的三个厨师里必须包含兰飞鸿
        // 比如每制作一种神级料理场上厨师蒸售价+10%

        //Partial 会影响其他厨师的技能，比如场上厨师制作炒料理基础售价+35% 每制作一种神级料理场上厨师蒸售价+10%

        /*switch ((effect.conditionType)) {

            case "ChefTag":
                if (this.chefTagMatchSelf(effect,chef)){
                    //具体逻辑

                }
                break;
            case "CookbookRarity":
                //console.log("CookbookRarity",effect)
                break;
            case "Rank":
                console.log("Rank",effect)
                break;
            case "SameSkill":

                break;
            case "PerRank":

                break;

            default:
                //无条件
                //console.log("无条件",effect)
                break;
        }*/


        if (['SameSkill', 'PerRank'].indexOf(effect.conditionType) !== -1) {
            //console.log('暂时实现不了的effect', skill, effect, chef)
            return
        }

        switch ((effect.type)) {
            case "Bake":
                this.bake += effect.value;
                break;
            case "Steam":
                this.steam += effect.value;
                break;
            case "Boil":
                this.boil += effect.value;
                break;
            case "Fry":
                this.fry += effect.value;
                break;
            case "Knife":
                this.knife += effect.value;
                break;
            case "Stirfry":
                this.stirfry += effect.value;
                break;

            case "UseSteam":
                this.chefTagMatchSelfPercent(effect, chef, 'useSteam');

                // console.log('effect的type没有完成,需要处理', skill, effect)
                break

            case "BasicPrice":
                //console.log('effect的type没有被考虑到,需要处理', skill, effect)
                //todo  这里是针对兰飞鸿的，为了使小当家系列可以分数更准确

                if (effect.conditionType === 'SameSkill') {
                    //制作三种同技法料理 忽略

                } else if (effect.conditionType === 'CookbookRarity') {
                    //console.log(skill)
                    //星级基础售价加成
                    let conditionValueList = effect.conditionValueList;
                    for (let i = 0; i < conditionValueList.length; i++) {
                        if (effect.cal === 'Percent') {
                            this.baseRarity[conditionValueList[i]] += effect.value / 100
                        } else {
                            this.basePriceAbs += effect.value;
                        }
                    }
                } else if (effect.conditionType === 'Rank') {
                    //制作的品质大于等于某个级别时，增加售价  1可 2优 3特 4神 5传
                    this.baseExcessRank.push([effect.conditionValue, effect.value / 100])

                } else if (effect.conditionType === 'ChefTag') {
                    if (this.chefTagMatchSelf(effect, chef)) {
                        if (effect.cal === 'Percent') {
                            this.basePrice += effect.value / 100;
                        }
                    }
                } else {
                    console.log('effect的type没有被考虑到,需要处理', skill, effect)
                }

                break;
            case 'CookbookPrice':
                if (effect.cal === 'Percent') {
                    if (effect.conditionType === 'CookbookRarity') {
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
                    } else if (effect.conditionType == null){
                        //场上所有厨师售价+30%  小皇帝
                    } else {
                        console.log('出现了没考虑到的参数')
                        console.log(skill, effect)
                    }
                } else {
                    console.log('出现了没考虑到的参数')
                    console.log(skill, effect)
                }
                break
            case "BasicPriceUseKnife":
                this.chefTagMatchSelfPercent(effect, chef, 'basicPriceUseKnife');
                break
            case "BasicPriceUseStirfry":
                this.chefTagMatchSelfPercent(effect, chef, 'basicPriceUseStirfry');
                break;
            case 'PerRank':
                //处理不了 每制作一种神级料理场上厨师炸售价+10%
                break

            case "OpenTime":
            case "Meat":
            case "Vegetable":
            case "Fish":

            case "Creation":
                break;
            default:
                console.log('effect的type没有被考虑到,需要处理', skill, effect)
                break;
        }
    }


    chefTagMatchSelfPercent(effect, chef, key) {
        if (effect.cal === 'Percent') {
            if (effect.conditionType === 'ChefTag') {
                if (this.chefTagMatchSelf(effect, chef)) {
                    this[key] += effect.value / 100;
                }
            } else {
                //直接加
                this[key] += effect.value / 100;
            }
        } else {
            console.log('未考虑加具体值', effect, chef, key)
        }

    }


    chefTagMatchSelf(effect, chef) {
        let conditionValueList = effect.conditionValueList
        let selfTag = chef.tags;
        for (let i = 0; i < selfTag.length; i++) {
            if (conditionValueList.indexOf(selfTag[i]) !== -1) {
                //蒸类料理基础售价
                return true;
            }
        }
        return false;
    }


    //处理技能对厨师自身的影响
    effect(effect, skill, chef) {
        // if (chef.name==='刘昴星'){
        //     debugger
        // }
        if ("Partial" === effect.condition) {
            //console.log("忽略技能，调用partialEffect处理",skill)
            this.partialEffect(effect, skill, chef)
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
                   // debugger
                    //厨具效果翻倍,目前来看都是用在贵客率上了，先不管
                    break;
                case 'BasicPrice':
                    //todo 待实现
                    // 樊声 炎罗 小红帽 天女 乐乐妹 汤圆(汤圆的技能可能处理不了)
                    // console.log('基础售价类技能还没有生效基础售价类技能还没有生效基础售价类技能还没有生效', skill, effect,chef)
                    break;
                case 'BasicPriceUseStirfry':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseStirfry += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseBoil':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseBoil += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseSteam':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseSteam += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseKnife':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseKnife += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseBake':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseBake += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseFry':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseFry += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseSour':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseSour += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseSalty':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseSalty += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseTasty':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseTasty += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseSweet':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseSweet += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseSpicy':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseSpicy += effect.value / 100;
                    }
                    break;
                case 'BasicPriceUseBitter':
                    //蒸类料理基础售价
                    if (effect.cal === 'Percent') {
                        this.basicPriceUseBitter += effect.value / 100;
                    }
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
                case  "MaxEquipLimit":
                    //增加最大做菜数量，感觉出神里用不大，不考虑

                    break;
                case  "MaterialReduce":
                    //制作料理时   食材消耗数量改动， 这个能增加做的份数， 但是估计增加份数比例最好的情况能代理20%左右的总收益
                    //console.log("食材消耗减少技能效果暂不支持")
                    break;
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
            // console.log('下一位上场厨师类技能还没有生效',skill, effect)
        } else if (effect.condition !== 'Global') {
            console.warn('新类型的effect,需要处理', skill, effect)

        }
    }


}


export class TempAddition {
    constructor() {
        this.bake = 0;
        this.boil = 0;
        this.stirfry = 0;
        this.knife = 0;
        this.fry = 0;
        this.steam = 0;
    }
}

export class TopResult {
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


export class CalRecipe {
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
        this.recipe = recipe;
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


export class Chef {
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


export class Effect {
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


export class Recipe {
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

export class Skill {
    constructor() {
        this.skillId = 0;
        this.desc = null;
        this.effect = null;
        this.skillEffect = null;
    }
}
