import {GodInference, OfficialGameData, MyGameData} from './bundle.js'

class Task {
    static main(officialGameData, myGameData, ruleStr, config) {
        return new Promise(resolve => {
            let rule = parseRule(ruleStr)
            let TopResult = Task.defaultTask(officialGameData, myGameData, rule, config);
            // let TopResult = App.testTask(officialGameData, myGameData);
            resolve(TopResult)
        });
        //App.testTask(officialGameData, myGameData);
    }

    static defaultTask(officialGameData, myGameData, rule, calConfig) {
        const reward = rule.reward;
        const materialCount = rule.materialCount;
        let sexReward = rule.sexReward;
        const inference = new GodInference(reward, sexReward, materialCount, calConfig, officialGameData, myGameData);
        return inference.refer();
    }

    static testTask(officialGameData, myGameData, calConfig) {
        const reward = new Array(10000).fill(1);
        const materialCount = new Array(47).fill(50);
        let sexReward = new Array(2).fill(0);
        sexReward = [0, 0.5]
        const inference = new GodInference(reward, sexReward, materialCount, calConfig, officialGameData, myGameData);
        inference.refer();
    }
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
    officialGameData.buildMap();


    myGameData.equips = [];

    return {
        officialGameData: officialGameData,
        myGameData: importChefsAndRecipesFromFoodGame(officialGameData, myGameData,calConfig)
    }
}

//从图鉴网导入数据
function importChefsAndRecipesFromFoodGame(officialGameData, foodGameData,calConfig) {
    let myGameData = new MyGameData();
    let recipes = foodGameData.recipes;
    let size = recipes.length;
    //菜谱
    for (let i = 0; i < size; i++) {
        let jsonRecipe = recipes[i];
        let id = jsonRecipe.id;

        if (jsonRecipe.got === "是") {
            let recipe = officialGameData.RecipeHashMap.get(id);
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
                chef.ultimateSkill = null;
                delSkill  = true;
            }
            myGameData.chefs.push(chef);

            if (chef.rarity === 5 && calConfig.addBaseValue>0) {
                //5星的厨师，在生成一份技法增加60/100的版本
                let chefIds = generateChefIds(chef,calConfig.addBaseValue);
                for (let chefId of chefIds) {
                  let  chef2 = officialGameData.chefHashMap.get(chefId);
                    if (delSkill) {
                        chef2.ultimateSkill = null;
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
        newChef.remark = "烤 "+appendValue;
    }

    if (chef.boil !== 0) {
        newChef = cloneChef(chef);
        newChef.boil += appendValue;
        newChef.chefId = (2 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "煮 "+appendValue;
    }

    if (chef.stirfry !== 0) {
        newChef = cloneChef(chef);
        newChef.stirfry += appendValue;
        newChef.chefId = (3 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "炒 "+appendValue;
    }

    if (chef.knife !== 0) {
        newChef = cloneChef(chef);
        newChef.knife += appendValue;
        newChef.chefId = (4 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "切 "+appendValue;
    }

   if (chef.fry !== 0) {
        newChef = cloneChef(chef);
        newChef.fry += appendValue;
        newChef.chefId = (5 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
       newChef.remark = "炸 "+appendValue;
    }

    if (chef.steam !== 0) {
        newChef = cloneChef(chef);
        newChef.steam += appendValue;
        newChef.chefId = (6 << 28 | (appendValue << 12) | chef.chefId);
        chefs.push(newChef);
        newChef.remark = "蒸 "+appendValue;
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

function parseRule(jsonObjectRule) {
    let reward = new Array(10000).fill(-100)
    let materialCount = new Array(47);
    let sexReward = [0.0, 0.0]
    const rules = jsonObjectRule.rules;
    for (let i = 0; i < rules.length; i++) {
        let rule = rules[i];
        if (rule.Title != null && rule.Title.indexOf('御前') !== -1) {
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
            if (rule.ChefTagEffect) {
                sexReward[0] = rule.ChefTagEffect["1"]
                sexReward[1] = rule.ChefTagEffect["2"]
            }
            console.log(rule)
            break;
        }
    }
    return {
        reward,
        materialCount,
        sexReward
    }
}


export {Task, parseData}
