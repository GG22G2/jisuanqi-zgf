
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

        //基础售价增加百分比
        this.basePrice = 0;

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

    effect(effect, skill,chef) {
        if ("Partial" === effect.condition) {
            if (this.tempAddtion == null) {
                this.tempAddtion = new TempAddition();
            }

            //Partial 会影响其他厨师的技能，比如场上厨师制作炒料理基础售价+35% 每制作一种神级料理场上厨师蒸售价+10%

            //暂时不支持全局影响，但是可以判断对自己的影响

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

                case "BasicPrice":
                    console.log('effect的type没有被考虑到,需要处理', skill, effect)




                    break;
                case "BasicPriceUseKnife":
                    if (effect.conditionType === 'ChefTag') {
                        let conditionValueList = effect.conditionValueList
                        let selfTag = chef.tags;

                        for (let i = 0; i < selfTag.length; i++) {
                            if (conditionValueList.indexOf(selfTag[i])!==-1){
                                //蒸类料理基础售价
                                if (effect.cal === 'Percent') {
                                    this.basicPriceUseKnife += effect.value / 100;
                                }
                            }
                        }
                    }
                    //this.tempAddtion.stirfry += effect.value;
                    break;
                case "OpenTime":
                    break;

                default:
                    console.log('effect的type没有被考虑到,需要处理', skill, effect)
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
                    //增加最大

                    break;
                case  "MaterialReduce":
                    //制作料理时   食材消耗数量改动， 这个能增加做的份数， 但是估计增加份数比例最好的情况能代理20%左右的总收益
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
            // console.log('下一位上场厨师类技能还没有生效')
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
