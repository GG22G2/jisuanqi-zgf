


function isScoreIntent(officialGameData,intent){
    let value = intent.effectValue;
    let nextIntentOrBuff = null
    //console.log(intent.effectType)
    switch (intent.effectType) {
        case 'IntentAdd':
        case 'PriceChangePercent':
        case 'BasicPriceChangePercent':
        case 'BasicPriceChange':
            return true;
        case 'CreateIntent':
            //创建一个新的intent，则个intent是作用于下一道料理的(暂时不知道能不能跨阶段)
            //   console.log(intent)
            nextIntentOrBuff = officialGameData.intentHashMap.get(value);
           return  isScoreIntent(officialGameData,nextIntentOrBuff)
        case 'CreateBuff':
            //创建全局buffer  buffer一般是下一阶段或者两阶段  符合条件的都加百分比售价
            nextIntentOrBuff = officialGameData.buffHashMap.get(value);
            return isScoreIntent(officialGameData,nextIntentOrBuff)

        default:
            return false;
    }
}






function yanhui(officialGameData, myGameData, calConfig) {
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
               // console.log(intent)
                break;
            case 'BasicPriceChange':
                //基础售价增加   比如+100
                //console.log(intent)
                break;
            case 'CreateBuff':
                //创建全局buffer  buffer一般是下一阶段或者两阶段  符合条件的都加百分比售价
                  console.log(intent)
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

    //4个意图全部触发，那么触发顺序有


    let intentHashMap = officialGameData.intentHashMap;

    //先生成意图的生效顺序，   再往里边填菜  ， 最后再放厨师
    //生效顺序确定后，等于每个位置那些能放，哪些不能放也确定下来了
    //其中 生效次数加1的默认必定全部触发， 其他意图根据情况触发


    for (const intentIdElement of intentId) {
        for (const id of intentIdElement) {
            let intent = intentHashMap.get(id);

            //console.log(intent.effectType)
            console.log(intent.desc)
            console.log()

            if (isScoreIntent(officialGameData,intent)){
                //可以增加得分的意图,

                //判断触发条件是

            } else {
                //不增加得分的意图，那只能是修改饱腹度了

            }
        }
    }




    //区分加成位和非加成位 ， 高分菜应该放置到能获得加成的位置上，
    // 非加成位用筛选条件代替(比如x星，x品质，x口味，x技法，几号位)， 后续只需要从符合条件的里边选最优解就行


    //挑选


}




export {yanhui}
