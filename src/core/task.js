
import {GodInference} from './bundle.js'

class Task {
    static main(officialGameData, myGameData, ruleStr,config) {
        return new Promise(resolve => {
            let rule = parseRule(ruleStr)
            let TopResult = Task.defaultTask(officialGameData, myGameData, rule,config);
            // let TopResult = App.testTask(officialGameData, myGameData);
            resolve(TopResult)
        });
        //App.testTask(officialGameData, myGameData);
    }

    static defaultTask(officialGameData, myGameData, rule,calConfig) {
        const reward = rule.reward;
        const materialCount = rule.materialCount;
        let sexReward = rule.sexReward;
        const inference = new GodInference(reward, sexReward, materialCount, calConfig,officialGameData, myGameData);
        return inference.refer();
    }

    static testTask(officialGameData, myGameData,calConfig) {
        const reward = new Array(10000).fill(1);
        const materialCount = new Array(47).fill(50);
        let sexReward = new Array(2).fill(0);
        sexReward = [0, 0.5]
        const inference = new GodInference(reward, sexReward, materialCount, calConfig,officialGameData, myGameData);
        inference.refer();
    }
}



function parseRule(jsonObjectRule) {
    let reward = new Array(10000).fill(-100)
    let materialCount = new Array(47);
    let sexReward = [0.0,0.0]
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
            if (rule.ChefTagEffect){
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


export {Task}
