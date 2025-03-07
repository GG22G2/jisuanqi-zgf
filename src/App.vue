<template>
  <el-container>
    <el-main>
      <el-tabs type="card" @tab-click="cardClick">
        <el-tab-pane label="计算器">


          <!--          厨具有bug,可能导致同一个厨师出现多次,先隐藏了-->
          <el-row>
            <el-text class="mx-1" size="large">使用厨具(3星)</el-text>
            <el-switch
                v-model="calConfig.useEquip"
                size="small"
                :active-value="true"
                :inactive-value="false"
            />
          </el-row>


          <el-row>
            <el-text class="mx-1" size="large">候选厨师最低星级</el-text>
            <el-select
                v-model="calConfig.chefMinRarity"
                placeholder="Select"

                style="width: 100px"
            >
              <el-option
                  v-for="item in 5"
                  :label="item+'星'"
                  :value="item"
              />
            </el-select>
          </el-row>

          <el-row>
            <el-text class="mx-1" size="large">候选菜谱数量(根据奖励倍数排序)</el-text>
            <el-input-number
                v-model="calConfig.recipeLimit"
                style="width: 140px"
                :step="10"
                :min="10"
                :max="200"
            >
            </el-input-number>
          </el-row>

          <el-row>
            <el-text class="mx-1" size="large">低分过滤比例(无厨师最大9个菜谱为基准)</el-text>
            <el-input-number
                v-model="calConfig.filterScoreRate"
                style="width: 140px"
                :precision="2"
                :min="0"
                :max="0.99"
                :step="0.01"
                :step-strictly="false"
                controls-position="right"
            >
            </el-input-number>
          </el-row>


          <div style="margin-top: 5px"></div>

          <el-row>
            <el-select filterable style="width: 300px" v-model="currentRule" placeholder="请选择厨神计算器">
              <el-option
                  v-for="item in ruleList"
                  :label="item.label"
                  :value="item.value">
              </el-option>
            </el-select>
            <el-button :disabled="this.currentRule===''" @click="calculator">计算</el-button>
          </el-row>

          <el-row>
            <el-col :xs="24" :sm="8" :md="8" :lg="8">
              <!--              <el-progress v-show="showPercentage" :percentage="percentage" :color="'#67c23a'"></el-progress>-->
            </el-col>
          </el-row>
          <el-row>
            <el-col><span>{{ topScore }}</span></el-col>
            <el-col :xs="24" :sm="8" :md="8" :lg="8" v-for="topChef in topChefs">
              <div style="display: flex;align-items: center;height: 150px; gap: 10px;font-size: 14px">
                <div>{{ topChef.chef }}</div>
                <div>{{ topChef.equip }}</div>
                <div style="display: flex;flex-direction: column;align-items: flex-start;">
                  <div>{{ topChef.recipes[0].recipe }}</div>
                  <div>{{ topChef.recipes[1].recipe }}</div>
                  <div>{{ topChef.recipes[2].recipe }}</div>
                </div>
                <div>
                  <div>{{ topChef.recipes[0].count }} {{ topChef.recipes[0].singlePrice }}</div>
                  <div>{{ topChef.recipes[1].count }} {{ topChef.recipes[1].singlePrice }}</div>
                  <div>{{ topChef.recipes[2].count }} {{ topChef.recipes[2].singlePrice }}</div>
                </div>
              </div>

            </el-col>

          </el-row>

        </el-tab-pane>
        <el-tab-pane label="数据">

          <el-row>
            <el-button @click="reloadGameData">加载游戏数据</el-button>
          </el-row>
          <div style="text-align: left">
            说明: [加载游戏数据] 是从图鉴网拿最新的厨师，菜谱等数据。只需要在图鉴网数据更新后重新加载一次即可。
          </div>

          <div style="margin-top: 5px"></div>

          <el-row>
            <span>官方数据导入（厨子满级满阶才会导入）</span>
          </el-row>
          <el-row>
            <el-col :span="6">
              <el-input
                  type="input"
                  resize="none"
                  placeholder="在游戏设置页面获取校验码"
                  v-model="dataCode">
              </el-input>

            </el-col>

            <el-col :span="3">
              <el-button @click="saveRecipesAndChefsData">导入数据</el-button>
            </el-col>
          </el-row>

        </el-tab-pane>
        <el-tab-pane label="说明">
          <div>
            奖励倍数取自白采菊花
            <br/>
            游戏数据取自图鉴网
            <br/>
            只是为了能拿到高保
            <br/>
            已考虑: 厨师修炼,菜谱专精,导入数据中厨师佩戴的厨具
            <br/>
            调料,心法盘不参与计算。
            <br/>
            光环技能只适配了5星厨师
            不支持的光环技能有[制作三种同技法][每制作一种神级料理]。其余光环技能可以作用于自身，但不提供在场效果。
            兰飞鸿光环技能可以作用于刘昂星
            <br/>

            [厨师技能效果提升50%]还没实现
            <br/>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-main>

  </el-container>

</template>


<script>

import {ElNotification} from 'element-plus'

import {CalConfig} from './core/core.js'
import {parseData, Task} from './core/task.js'

import {markRaw, toRaw} from 'vue';
import VConsole from 'vconsole';

const vConsole = new VConsole();


export default {
  data() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    let useAll = urlParams.get('useAll') === 'true';
    let calConfig = null;

    if (useAll) {
      calConfig = new CalConfig([1, 8, 8, 6, 6, 4, 4, 4, 6, 11], 160, 5, 0.92, true, useAll)
    } else {
     // calConfig = new CalConfig([1, 8, 7, 5, 5, 3, 3, 3, 5, 10], 120, 5, 0.95, false, useAll)
      calConfig = new CalConfig([1, 4, 4, 3, 3, 2, 2, 2, 2, 3], 120, 5, 0.98, false, false)
    }

    return {
      //http://localhost:5173/jisuanqi-zgf?useAll=true
      //如果存在useAll参数，并且为true则CalConfig中useAll为true
      //calConfig: new CalConfig([1, 7, 7, 6, 5, 5, 5, 5, 5, 5], 100, 5, 0.95, false, false),
      calConfig: calConfig,
      percentage: 0,
      showPercentage: false,
      dataCode: '',
      isIndeterminate: true,
      currentRule: '',
      ruleList: [],
      curWeekRule: null,
      globalEquipOption: {
        rarityOneLimit: 1,
        rarityTwoLimit: 1,
        rarityThreeLimit: 1
      },
      topChefs: [],
      topScore: null,
      rarityLimitOption: [0, 1, 2, 3]
    }
  },
  computed: {},
  mounted() {

  },
  async created() {
    this.init();
    window.onmessage = (event) => {
      this.percentage = Math.round(event.data);
    }
  },
  methods: {
    async calculator() {
      console.log('准备计算')
      this.topChefs.length = 0;
      this.topScore = null;
      let {officialGameData, myGameData} = await this.loadData();
      console.log('加载完数据')
      if (myGameData == null || officialGameData == null) {
        this.errorNotify('无法计算', '缺少数据，需要从官方导入个人数据', 'error');
        return;
      }

      this.percentage = 0;
      let ruleStr = null;
      this.showPercentage = true;
      try {
        // 挑选本周规则，还是历史规则
        console.log('获取厨神规则...')
        if (this.currentRule === -1) {
          ruleStr = toRaw(this.curWeekRule);
        } else {
          ruleStr = markRaw(await this.getRule(this.currentRule));
        }
      } catch (e) {
      }
      if (ruleStr == null) {
        this.errorNotify('获取规则失败', '', 'error');
        return null;
      }

      let topResult = await Task.main(officialGameData, myGameData, ruleStr, this.calConfig);
      if (topResult == null) {
        this.errorNotify('无法计算', '规则不符合预期', 'error');
        this.deleteRule(this.currentRule);
      }
      //讲规则缓存起来，下次服用
      console.log(topResult)

      //console.log(topResult[0].chefs)
      this.topChefs = topResult[0].chefs
      this.topScore = topResult[0].score
    },
    errorNotify(title, message, error) {
      ElNotification({
        title: title,
        message: message,
        type: error,
      })
    },
    async getRule(ruleTime) {
      let oldRule = localStorage.getItem(ruleTime);
      if (oldRule) {
        return JSON.parse(oldRule);
      }
      let ruleStr = await (await fetch(`https://h5.baochaojianghu.com/api/get_rule?time=${ruleTime}`)).json();
      localStorage.setItem(ruleTime, JSON.stringify(ruleStr));
      return ruleStr;
    },
    async deleteRule(ruleTime) {
      localStorage.removeItem(ruleTime);
    },
    async init() {
      await this.initRuleSelected();
    },
    async loadData() {
      let gameData = await this.getOfficeGameData();
      let myGameData = localStorage.getItem('myGameData');

      if (gameData == null || myGameData == null) {
        return {
          officialGameData: null,
          myGameData: null
        }
      }

      myGameData = JSON.parse(myGameData);
      return parseData(gameData, myGameData, this.calConfig);
    },
    async initRuleSelected() {
      let data = await (await fetch('https://h5.baochaojianghu.com/api/get_etc_rule')).json();
      //如果是周五下午到周日22点，则尝试获取本周的厨神数据
      let curWeekRuleResult = await this.getCurrentWeekRule();

      this.ruleList = []
      let ruleList = this.ruleList;
      if (curWeekRuleResult) {
        this.ruleList.push({
          label: '本周御前',
          value: -1
        })
      }
      const regex = /^(\d{1,2}\/\d{1,2}\/\d{1,2})-(\S+)$/;
      for (let item of data) {
        //24/1/26-酸味  以日期开始 -  的格式
        const match = item.tag.match(regex);
        if (match != null) {
          ruleList.push({
            label: item.tag,
            value: item['start_time']
          })
        }

      }
    },
    async getCurrentWeekRule() {
      //获得今天日期时间
      let curData = new Date();
      let curTime = curData.getTime();
      //设置时间为下午13:00:00
      curData.setHours(13, 0, 0, 0);
      //获得今天与星期五的日差
      let week = 5 - (curData.getDay() ? curData.getDay() : 7);
      //当天下午13:00:00的时间戳 加上今天与周五的 c 日差秒数得到结果时间戳
      let startTime = curData.getTime() + week * 86400000;
      // 周日22点
      let endTime = startTime + 205200000;
      let curWeekRule = null;
      if (curTime >= startTime && curTime <= endTime) {
        curWeekRule = await (await fetch('https://h5.baochaojianghu.com/api/get_rule')).json();
        this.curWeekRule = curWeekRule;
        return true;
      }
      return false
    },
    async loadMyData(code) {
      let data = await (await fetch(`https://yx518.com/api/archive.do?token=${code}&_=${new Date().getTime()}`)).json();
      return data.msg;
    },
    async saveRecipesAndChefsData() {
      let data = await this.loadMyData(this.dataCode);
      if (data != null && data !== '' && data !== '数据过期') {
        this.errorNotify('加载成功', '加载个人成功', 'success');
        localStorage.setItem('myGameData', JSON.stringify(data))
      } else {
        this.errorNotify('加载失败', data, 'error');
      }
    },
    async getOfficeGameData() {
      let gameData = localStorage.getItem('gameData')

      if (gameData == null) {
        gameData = await this.reloadGameData();
      }
      if (gameData != null) {
        gameData = JSON.parse(gameData);
        return gameData;
      }
      return null;
    },
    async reloadGameData() {
      let data = await (await fetch(`https://foodgame.github.io/data/data.min.json?v=${new Date().getTime()}`)).json();
      let dateStr = JSON.stringify(data);
      localStorage.setItem('gameData', dateStr)
      this.errorNotify('加载成功', '加载游戏数据成功', 'success');
      return dateStr;
    },
    cardClick(event) {

    },
  },
}

</script>


<style scoped>

</style>
