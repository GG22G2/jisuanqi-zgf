<template>
  <el-container>
    <el-main>
      <el-tabs type="card" @tab-click="cardClick">
        <el-tab-pane label="计算器">
          <el-row>

             <el-text class="mx-1" size="large">使用厨具</el-text>

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

      <div style="margin-top: 5px"> </div>

          <el-row>
            <el-select filterable style="width: 300px" v-model="currentRule" placeholder="请选择厨神计算器">
              <el-option
                  v-for="item in ruleList"
                  :label="item.label"
                  :value="item.value">
              </el-option>
            </el-select>
            <el-button @click="calculator">计算</el-button>
          </el-row>

          <el-row>
            <el-col :xs="24" :sm="8" :md="8" :lg="8">
              <el-progress v-show="showPercentage" :percentage="percentage" :color="'#67c23a'"></el-progress>
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
                  <div>{{ topChef.recipes[0].count }}</div>
                  <div>{{ topChef.recipes[1].count }}</div>
                  <div>{{ topChef.recipes[2].count }}</div>
                </div>
              </div>

            </el-col>

          </el-row>

        </el-tab-pane>
        <el-tab-pane label="数据">

          <el-row>
            <el-button @click="reloadGameData">加载游戏数据</el-button>
          </el-row>
          <div  style="text-align: left">
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
           已考虑：厨师修炼,菜谱专精
           <br/>
           厨具：不开启时使用自带厨具，开启后使用部分3星出局
           <br/>
           不考虑厨师在场时给其他厨师的光环技能,没有调料和心法盘
           <br/>
         </div>
        </el-tab-pane>

      </el-tabs>
    </el-main>

  </el-container>

</template>


<script>

import {ElNotification} from 'element-plus'

import {CalConfig} from './core/bundle.js'
import {parseData, Task} from './core/task.js'



export default {
  data() {
    return {
      calConfig: new CalConfig([0, 5, 2, 2, 2, 2, 2, 2, 2, 2], 4, false, false),
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
      this.topChefs.length = 0;
      this.topScore = null;
      let {officialGameData, myGameData} = await this.loadData();

      if (officialGameData == null || myGameData == null) {
        ElNotification({
          title: '无法计算',
          message: '缺少游戏数据，无法计算',
          type: 'error',
        })
        return;
      }
      this.percentage = 0;
      let ruleStr = null;
      this.showPercentage = true;
      // 挑选本周规则，还是历史规则
      console.log('获取厨神规则...')
      if (this.currentRule === -1) {
        ruleStr = this.curWeekRule;
      } else {
        ruleStr = await this.getRule(this.currentRule);
      }
      console.log('获取成功')

      let topResult = await Task.main(officialGameData, myGameData, ruleStr, this.calConfig);
      if (topResult == null) {
        ElNotification({
          title: '无法计算',
          message: '规则不符合预期',
          type: 'error',
        })
        this.deleteRule(this.currentRule);
      }
      //讲规则缓存起来，下次服用


      //console.log(topResult[0].chefs)
      this.topChefs = topResult[0].chefs
      this.topScore = topResult[0].score
    },

    async getRule(ruleTime) {
      let oldRule = localStorage.getItem(ruleTime);
      if (oldRule) {
        return JSON.parse(oldRule);
      }
      let ruleStr = await (await fetch(`https://bcjh.xyz/api/get_rule?time=${ruleTime}`)).json();
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
        return
      }
      myGameData = JSON.parse(myGameData);
      return parseData(gameData, myGameData, this.calConfig);
    },
    async initRuleSelected() {
      let data = await (await fetch('https://bcjh.xyz/api/get_etc_rule')).json();
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
        curWeekRule = await (await fetch('https://bcjh.xyz/api/get_rule')).json();
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
        ElNotification({
          title: '加载成功',
          message: '加载成功',
          type: 'success',
        })
        localStorage.setItem('myGameData', JSON.stringify(data))
      } else {
        ElNotification({
          title: '加载失败',
          message: data,
          type: 'error',
        })
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
      let data = await (await fetch(`https://foodgame.top/data/data.min.json?v=${new Date().getTime()}`)).json();
      let dateStr = JSON.stringify(data);
      localStorage.setItem('gameData', dateStr)
      ElNotification({
        title: '加载成功',
        message: '加载成功',
        type: 'success',
      })
      return dateStr;
    },
    cardClick(event) {

    },
  },
}

</script>


<style scoped>

</style>
