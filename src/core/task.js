import {GodInference, OfficialGameData, MyGameData, Calculator} from './bundle.js'
import {yanhui} from "./fenyunyan.js";

class Task {
    static main(officialGameData, myGameData, ruleStr, config) {

        let rule = parseRule(officialGameData, ruleStr)
        if (rule==null){
            return null;
        }
      //  Task.questParse(officialGameData)
       // yanhui(officialGameData)
         let TopResult = Task.defaultTask(officialGameData, myGameData, rule, config);
        //let TopResult = Task.testTask(officialGameData, myGameData);
         return TopResult;
       // Task.maxGood(officialGameData, myGameData)
        //App.testTask(officialGameData, myGameData);
    }

    static defaultTask(officialGameData, myGameData, rule, calConfig) {
        const recipeReward = rule.recipeReward;
        const materialCount = rule.materialCount;
        let sexReward = rule.sexReward;
        const inference = new GodInference(officialGameData, myGameData, recipeReward, sexReward, materialCount);
        return inference.refer();
    }



    static testTask(officialGameData, myGameData, calConfig) {
        const recipeReward = new Array(10000).fill(0);
        const materialCount = new Array(47).fill(5000);
        let sexReward = new Array(2).fill(0);
        sexReward = [0, 0]
        const inference = new GodInference(officialGameData, myGameData, null, null, materialCount);
        return inference.refer();
    }

    static questParse(officialGameData){

        //officialGameData.recipes
        const recipesNames = new Set(officialGameData.recipes.map(obj => obj.name));
        const chefsNames = new Set(officialGameData.chefs.map(obj => obj.name));
        const materialNames = new Set(officialGameData.materials.map(obj => obj.name));


        // 烤炸切蒸煮炒是技法，1到5星是菜谱星级， 优特神传是不同稀有度，还有具体的菜谱名称，和厨师名称，单价是指价格，
        // 请给每个任务用对象描述，包含技法限制，星级要求，稀有度要求，价格要求，食材要求，菜谱要求等，如果某一项没有对应要求，则生成出来的对象中不用体现




        console.log(recipesNames,chefsNames,materialNames)
        //稀有度
        let rank = 0;
        //菜谱星级
        let rarity = 0;
        //制作份数
        let count = 0 ;
        //材料消耗
        let materialCount = 0 ;
        //累计开业时长
        let time = 0;
        //是累计开业还是一次性开业
        let once = false;
        //所需材料
        let material = 0;
        const regex = /\d*份/;

        let fenci = ['制作','使用','和','的','']

        let goals= []

        let quests =  officialGameData.quests;
        for (let quest of quests) {
            if (quest.type === '主线任务'){
                let goal  = quest.goal;

                if (quest.questId<310){
                    continue
                }
               // console.log(goal.match(regex))
                if (goal.indexOf('提交')!==-1){
                    //  console.log(quest,goal)
                } else if (goal.indexOf('探索')!==-1){
                    //  console.log(quest,goal)
                } else if (goal.indexOf('拥有')!==-1){
                  //  console.log(quest,goal)
                } else if(goal.indexOf('研发')!==-1) {
                    //  console.log(quest,goal)
                }  else if(goal.indexOf('遇见')!==-1){
                    //   console.log(quest,goal)
                }else if (goal.indexOf('集市')!==-1){
                    // console.log(quest)
                } else if (goal.indexOf('升级')!==-1){
                    //   console.log(quest)
                }  else if (goal.indexOf('收集')!==-1){
                   //    console.log(quest,goal)
                }
                else if(goal.indexOf('制作使用')!==-1){
                    goals.push(goal)
                 //   console.log(quest,goal)
                } else if(goal.indexOf('制作')!==-1){
                   //   console.log(quest,goal)
                    goals.push(goal)
                }else if (goal.indexOf('使用')!==-1){
                    goals.push(goal)
                    // 使用材料xxx个
                    // 制作 使用xxx的料理 xxx份
                    // 其他情况
                    //  console.log(quest,goal)
                }
                else if (goal.indexOf('经营')!==-1 || goal.indexOf('开业')!==-1){
                 //  console.log(quest)
                }
                else if (goal.indexOf('获得')!==-1){
                    //   console.log(quest)
                }

                else{
                    console.log('没解析的任务')
                    console.log(quest,goal)
                }

            }

        }
        console.log(goals.slice(0,50))
        console.log(  JSON.stringify(goals.slice(0,50)))
    }

    static maxGood(officialGameData, myGameData, calConfig) {

        const inference = new GodInference(officialGameData, myGameData, null, null, null);

        let kitchenGodCal = new Calculator(inference.globalAddtion.useall, null, null, 86 / 100);

        let maxV = 0;

        for (const ownChef of inference.ownChefs) {
            if (ownChef.rarity >= 3) {
                //console.log(ownChef)
                for (const ownRecipe of myGameData.recipes) {
                    if (ownRecipe.rarity >= 2) {
                        let singlePrice = kitchenGodCal.calSinglePrice(ownChef, ownRecipe)
                        //console.log(singlePrice)
                        // console.log(ownRecipe)
                        let seconds = ownRecipe.time;
                        let hourPrice = singlePrice * 60 * 60 / seconds;
                        if (ownRecipe.name==='雪景球蛋糕'){
                           // console.log(ownChef.name,ownRecipe.name,hourPrice)
                        }
                        if (hourPrice>50000){
                            console.log(ownChef.name,ownRecipe.name,hourPrice)

                            //计算11 或22小时版本采集下，一个小时消耗的食材等效的采集耗时

                        }


                        // if (hourPrice > maxV) {
                        //     maxV = hourPrice;
                        //     console.log(ownChef.name,ownRecipe.name,hourPrice)
                        // }

                    }
                }
            }

        }


    }

    static yanhui(officialGameData, myGameData, calConfig) {
        //如果计算宴会，计算思路
        //奖励倍数为0, 食材无线 ，然后按照现有思路算分数，但是三位厨师确定后，走一遍规则

        //所有菜的总意图要合适, 最后总意图等于

        //6个厨师  18到菜， 每个菜的位置不一样都可能影响

        //保证菜谱等级总和 等于意图总和 拿到售价加成

        //再次基础上生成菜谱排列 18道菜谱的排列   ，然后

        // 42 5 5  5  5 5  5 4 4 4


        //6组菜谱， 菜谱合计饱腹感要匹配， 首先筛选

        //打印effectType
        let intents = officialGameData.intents;
        let buffs = officialGameData.buffs;
        let et = new Set();
        for (const intent of intents) {
            et.add(intent.effectType)
            //console.log(intent.effectType)
            switch (intent.effectType) {
                case 'IntentAdd':
                    //本道料理意图生效次数加一  如果这个菜谱有多个生效意图，就是这些意图每一个就增加一次
                    //console.log(intent)
                    break;
                case 'PriceChangePercent':
                    //本道料理售价 加或者减百分比
                    // console.log(intent)
                    break;
                case 'BasicPriceChangePercent':
                    //本道料理基础售价增加百分比  比如 +100%
                    //console.log(intent)
                    break;
                case 'SatietyChange':
                    //饱腹感加减
                    //console.log(intent)
                    break;
                case 'CreateIntent':
                    //创建一个新的intent，则个intent是作用于下一道料理的(暂时不知道能不能跨阶段)
                    console.log(intent)
                    break;
                case 'BasicPriceChange':
                    //基础售价增加   比如+100
                    //console.log(intent)
                    break;
                case 'CreateBuff':
                    //创建全局buffer  buffer一般是下一阶段或者两阶段  符合条件的都加百分比售价
                  //  console.log(intent)
                    break;
                case 'SetSatietyValue':
                    //修改某个符合条件的菜谱的饱腹感为固定值
                    //console.log(intent)
                    break;
            }
        }



        let et2 = new Set();
        for (const intent of intents) {
            et2.add(intent.conditionType)
            //conditionType是触发意图的条件
            switch (intent.conditionType) {
                case 'CookSkill':
                    //菜谱 有某种技法
                    // console.log(intent)
                    break;
                case 'CondimentSkill':
                    //菜谱 有某个口味
                    //console.log(intent)
                    break;
                case 'Order':
                    //1/2/3 某个位置生效
                    // console.log(intent)
                    break;
                case 'Rarity':
                    //菜谱星级匹配  这个是完全匹配  匹配3星则只有3星菜可以
                    //console.log(intent)
                    break;
                case 'Group':
                    //三道菜都符合条件才行 目前这一类都是三道菜都有某种技法
                    //console.log(intent)
                    break;
                case 'Rank':
                    //品质大于等于某个品级触发
                    //console.log(intent)
                    break;
                default:
                    //不需要匹配条件直接生效于下一个菜谱
                    //console.log(intent)
                    break;
            }
        }
        console.log(et2)
        //计算18个菜谱位置，每一个位置的最优总奖励倍数


        /**
         * 规则梳理:
         *      一共两组，每组三个阶段，每个阶段一个厨师做三个菜，菜谱和厨师公用
         *      饱腹度达标增加30%售价，这个售价是在最终得分的基础上再增加30%
         *      大部分意图匹配后只能生效一次，
         *      意图的匹配顺序是按照菜谱位置从左到右，匹配是按照位置的，不是按照放置顺序的
         *
         *      等于说高分一定符合是饱腹度达标的
         *
         * */



        /**
         *
         * 模拟跟据规则上菜
         * 就是计算最有的
         * 先不上菜谱:
         *          判断是否有意图生效次数加一的
         *          判断是否有buff ，buff能对多个菜起作用，效果还是不错的
         *          选择高价菜，跟据意图的生效规则，选择技法，口味和星级等
         *          如果有意图生肖次数加1的，的大概率这个位置是主要得分来源，需要放主要菜谱或者围绕这个位置组和
         *          统计匹配规则，生成符合条件的菜谱
         *
         * */

        let intentId  =[[173, 184, 195, 35], [214, 223, 233, 240], [157, 145, 35, 273]]


        let intentHashMap = officialGameData.intentHashMap;
        for (const id of intentId[0]) {
            let intent = intentHashMap.get(id);

                //console.log(intent.effectType)
                switch (intent.effectType) {
                    case 'IntentAdd':
                        //本道料理意图生效次数加一  如果这个菜谱有多个生效意图，就是这些意图每一个就增加一次
                        //console.log(intent)
                        break;
                    case 'PriceChangePercent':
                        //本道料理售价 加或者减百分比
                        // console.log(intent)
                        break;
                    case 'BasicPriceChangePercent':
                        //本道料理基础售价增加百分比  比如 +100%
                        //console.log(intent)
                        break;
                    case 'CreateIntent':
                        //创建一个新的intent，则个intent是作用于下一道料理的(暂时不知道能不能跨阶段)
                        //   console.log(intent)
                        break;
                    case 'BasicPriceChange':
                        //基础售价增加   比如+100
                        //console.log(intent)
                        break;
                    case 'CreateBuff':
                        //创建全局buffer  buffer一般是下一阶段或者两阶段  符合条件的都加百分比售价
                        //  console.log(intent)
                        break;
                }



        }

        //区分加成位和非加成位 ， 高分菜应该放置到能获得加成的位置上，
        // 非加成位用筛选条件代替(比如x星，x品质，x口味，x技法，几号位)， 后续只需要从符合条件的里边选最优解就行


        //挑选


    }
}


function autoxjsTask(topChef) {
    console.log(topChef)
}


function parseData(gameData, myGameData, calConfig) {
    if (calConfig.addBaseValue > 0) {
        //todo 需要将厨师的4维增加 addBaseValue，
        let chefs = gameData.chefs;
        let chefs2 = []
        for (const chef of chefs) {
            if (chef.rarity > 3) {
                let chefs1 = generateChefs(chef, calConfig.addBaseValue);
                for (let chefs1Element of chefs1) {
                    chefs2.push(chefs1Element);
                }
            }
            chefs2.push(chef)
        }
        gameData.chefs = chefs2;
    }

    let officialGameData = new OfficialGameData();
    officialGameData.chefs = gameData.chefs;
    officialGameData.equips = gameData.equips;
    officialGameData.materials = gameData.materials;
    officialGameData.recipes = gameData.recipes;
    officialGameData.skills = gameData.skills;
    officialGameData.ambers = gameData.ambers
    officialGameData.quests = gameData.quests
    officialGameData.buffs = gameData.buffs
    officialGameData.intents = gameData.intents


    officialGameData.buildMap();

    myGameData.equips = [];

    return {
        officialGameData: officialGameData,
        myGameData: importChefsAndRecipesFromFoodGame(officialGameData, myGameData, calConfig)
    }
}


/**
 * @param allChef 全厨师，并且全修炼
 * @param allRecipe 全菜谱并且全专精
 * */
function  modifyMyData(foodGameData,allChef,allRecipe){

    if (allRecipe){
        let recipes = foodGameData.recipes;
        for (const recipe of recipes) {
            recipe.ex = '是'
            recipe.got = '是'
        }
    }

    if (allChef){
        let chefs = foodGameData.chefs;
        for (const chef of chefs) {
            chef.got = '是'
            chef.ult = '是'
        }
    }


}


//从图鉴网导入数据
function importChefsAndRecipesFromFoodGame(officialGameData, foodGameData, calConfig) {
    // modifyMyData(foodGameData,true,true)
    let myGameData = new MyGameData();
    let recipes = foodGameData.recipes;
    let size = recipes.length;
    //菜谱
    for (let i = 0; i < size; i++) {
        let jsonRecipe = recipes[i];
        let id = jsonRecipe.id;
        if (jsonRecipe.got === "是") {
            let recipe = officialGameData.recipeHashMap.get(id);
            if (recipe != null) {
                if (jsonRecipe.ex === "是") {
                    recipe.price = recipe.price + recipe.exPrice;
                }
                myGameData.recipes.push(recipe);
            }
        }
    }

    //厨师
    let chefs = foodGameData.chefs;
    size = chefs.length;
    for (let i = 0; i < size; i++) {
        let jsonChef = chefs[i];
        let id = jsonChef.id;
        let chef = officialGameData.chefHashMap.get(id);
        if (chef != null && jsonChef.got === "是") {
            let delSkill = false;
            if (jsonChef.ult !== "是") {
                chef.ult = false
                delSkill = true;
            } else {
                chef.ult = true
            }
            //厨师本身携带了厨具
            if (jsonChef.equip != null) {
                let equip = officialGameData.equipHashMap.get(jsonChef.equip);
                chef.selfEquipSkillIds = equip.skill
            }

            // if (jsonChef.ambers!= null){
            //     let amberIds = jsonChef.ambers;
            //     let amberSkillIds = []
            //     for (let j = 0; j <  amberIds.length; j++) {
            //         let amber = officialGameData.amberHashMap.get(amberIds[j]);
            //         if (amber!=null){
            //             //这里直接生成一个技能得了
            //             amberSkillIds= [...amberSkillIds,...amber.skill]
            //         }
            //     }
            //     let dlv = jsonChef.dlv ? jsonChef.dlv:1; //厨师心法盘等级
            //
            //
            //     chef.amberSkillIds =  amberSkillIds;
            //
            //     for (let j = 0; j < amberSkillIds.length; j++) {
            //         if (amberSkillIds[j]>0){
            //             let skill = officialGameData.skillHashMap.get(amberSkillIds[j]);
            //             //根据心法盘等级生成一个新的技能
            //             let newSkill = JSON.stringify(JSON.stringify(skill));
            //             let effects = newSkill.effect;
            //             for (let k = 0; k < effects.length; k++) {
            //                 let effect = effects[k];
            //                 // effect.value +=
            //             }
            //
            //
            //         }
            //     }
            // }


            myGameData.chefs.push(chef);
            if (jsonChef.equip == null && chef.rarity === 5 && calConfig.addBaseValue > 0) {
                //5星的厨师，在生成一份技法增加60/100的版本
                let chefIds = generateChefIds(chef, calConfig.addBaseValue);
                for (let chefId of chefIds) {
                    let chef2 = officialGameData.chefHashMap.get(chefId);
                    if (delSkill) {
                        chef.ult = false
                    } else {
                        chef.ult = true
                    }
                    myGameData.chefs.push(chef2);
                }

            }
        }
    }


    return myGameData;
}


function generateChefIds(chef, appendValue) {
    let chefIds = [];
    if (chef.bake !== 0) {
        chefIds.push(1 << 28 | (appendValue << 12) | chef.chefId);
    }
    if (chef.boil !== 0) {
        chefIds.push(2 << 28 | (appendValue << 12) | chef.chefId);
    }
    if (chef.stirfry !== 0) {
        chefIds.push(3 << 28 | (appendValue << 12) | chef.chefId);
    }
    if (chef.knife !== 0) {
        chefIds.push(4 << 28 | (appendValue << 12) | chef.chefId);
    }
    if (chef.fry !== 0) {
        chefIds.push(5 << 28 | (appendValue << 12) | chef.chefId);
    }
    if (chef.steam !== 0) {
        chefIds.push(6 << 28 | (appendValue << 12) | chef.chefId);
    }


    return chefIds;
}

function generateChefs(chef, appendValue) {
    let chefs = [];
    let newChef;

    if (chef.bake !== 0) {
        newChef = cloneChef(chef);
        newChef.bake += appendValue;
        newChef.chefId = (1 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "烤 " + appendValue;
    }

    if (chef.boil !== 0) {
        newChef = cloneChef(chef);
        newChef.boil += appendValue;
        newChef.chefId = (2 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "煮 " + appendValue;
    }

    if (chef.stirfry !== 0) {
        newChef = cloneChef(chef);
        newChef.stirfry += appendValue;
        newChef.chefId = (3 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "炒 " + appendValue;
    }

    if (chef.knife !== 0) {
        newChef = cloneChef(chef);
        newChef.knife += appendValue;
        newChef.chefId = (4 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "切 " + appendValue;
    }

    if (chef.fry !== 0) {
        newChef = cloneChef(chef);
        newChef.fry += appendValue;
        newChef.chefId = (5 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "炸 " + appendValue;
    }

    if (chef.steam !== 0) {
        newChef = cloneChef(chef);
        newChef.steam += appendValue;
        newChef.chefId = (6 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "蒸 " + appendValue;
    }

    return chefs;
}


function cloneChef(chef) {
    let chef1 = Object.create(chef);
    for (let p in chef) {
        if (chef.hasOwnProperty(p))
            chef1[p] = chef[p];
    }
    return chef1;
}

/**
 * 规则可以分为两类，一类是对菜谱本身的加成
 * 另一类的跟据厨师确定给菜谱的加成，比如性别加成
 *
 * */
function parseRule(officialGameData, jsonObjectRule) {
    let recipeReward = new Array(10000).fill(-1000)
    let materialCount = new Array(47);
    let sexReward = [0.0, 0.0]
    let recipes = officialGameData.recipes

    let hasMatchRule = false;
    const rules = jsonObjectRule.rules;
    for (let i = 0; i < rules.length; i++) {
        let rule = rules[i];
        if (rule.Title != null && rule.Title.indexOf('御前') !== -1) {
            hasMatchRule = true;
            //奖励倍数
            if (rule.RecipeEffect) {
                let recipeEffect = rule.RecipeEffect;
                for (let key in recipeEffect) {
                    recipeReward[key] = recipeEffect[key]
                }
            } else {
                recipeReward = recipeReward.fill(0)
                console.log('没有奖励倍数', rule)
            }

            //食材数量
            if (rule.MaterialsLimit instanceof Object) {
                let materials = rule.MaterialsLimit;
                for (let index in materials) {
                    materialCount[index] = materials[index]
                }
            } else {
                let materialsLimit = rule.MaterialsLimit;
                materialCount.fill(materialsLimit);
            }

            //厨师性别影响
            if (rule.ChefTagEffect) {
                sexReward[0] = rule.ChefTagEffect["1"]
                sexReward[1] = rule.ChefTagEffect["2"]
            }

            //酸甜苦辣鲜咸影响
            if (rule.CondimentEffect) {
                let CondimentEffect = rule.CondimentEffect;
                for (const recipe of recipes) {
                    recipeReward[recipe.recipeId] = recipeReward[recipe.recipeId] + CondimentEffect[recipe.condiment];
                }
            }

            //技法影响
            if (rule.SkillEffect) {
                let SkillEffect = rule.SkillEffect;
                for (const recipe of recipes) {
                    let r = recipe.stirfry > 0 ? SkillEffect['stirfry'] : 0;
                    r = r + (recipe.boil > 0 ? SkillEffect['boil'] : 0);
                    r = r + (recipe.knife > 0 ? SkillEffect['knife'] : 0);
                    r = r + (recipe.fry > 0 ? SkillEffect['fry'] : 0);
                    r = r + (recipe.bake > 0 ? SkillEffect['bake'] : 0);
                    r = r + (recipe.steam > 0 ? SkillEffect['steam'] : 0);
                    recipeReward[recipe.recipeId] = recipeReward[recipe.recipeId] + r;
                }
            }

            //食材影响
            if (rule.MaterialsEffect) {
                let MaterialsEffect = rule.MaterialsEffect;
                const materialsMap = {};
                MaterialsEffect.forEach(item => {
                    materialsMap[item.MaterialID] = item.Effect;
                });
                for (const recipe of recipes) {
                    let materials = recipe.materials
                    let mReward = 0;
                    for (const material of materials) {
                        mReward = mReward + (materialsMap[material.material] ? materialsMap[material.material] : 0);
                    }
                    recipeReward[recipe.recipeId] = recipeReward[recipe.recipeId] + mReward;
                }
            }

            //菜谱星级的影响
            if (rule.RarityEffect) {
                let RarityEffect = rule.RarityEffect
                for (const recipe of recipes) {
                    recipeReward[recipe.recipeId] = recipeReward[recipe.recipeId] + RarityEffect[recipe.rarity];
                }
            }

            break;
        }
    }
    if (!hasMatchRule){
        return null
    }

    //console.log(recipeReward)
    return {
        recipeReward,
        materialCount,
        sexReward
    }
}


export {Task, parseData}
