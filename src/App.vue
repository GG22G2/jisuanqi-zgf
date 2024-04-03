<template>
  <el-container>
    <el-main>
      <el-tabs type="card" @tab-click="cardClick">
        <el-tab-pane label="计算器">
          <el-row>
            <el-text class="mx-1" size="large">额外属性值</el-text>

            <el-input-number :precision="0" :min="0" :max="9999" :controls="false" v-model="calConfig.addBaseValue"></el-input-number>
          </el-row>
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
            <el-col><span>{{ topScore }}</span></el-col>
            <el-col :xs="24" :sm="8" :md="8" :lg="8" v-for="topChef in topChefs">
              <div style="display: flex;align-items: center;height: 150px; gap: 10px;font-size: 14px">
                <div>{{ topChef.chef }}</div>
                <div>额外加成</div>
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
            <el-button @click="reloadGameData">重新加载游戏数据</el-button>
          </el-row>

          <el-row>
            <span>个人数据</span>
          </el-row>
          <el-row>
            <el-col :span="6">
              <el-input
                  type="input"
                  resize="none"
                  placeholder="校验码"
                  v-model="dataCode">
              </el-input>
            </el-col>
          </el-row>
          <el-row>
            <el-button @click="saveRecipesAndChefsData">导入数据</el-button>
          </el-row>


        </el-tab-pane>
        <el-tab-pane label="说明">
          奖励倍数取自白采菊花
          <br/>
          游戏数据取自图鉴网
          <br/>
        </el-tab-pane>

      </el-tabs>
    </el-main>

  </el-container>

</template>


<script>

import { ElNotification } from 'element-plus'

import {OfficialGameData,importChefsAndRecipesFromFoodGame,CalConfig} from './core/bundle.js'
import {Task} from './core/task.js'



export default {
  officialGameData: {},
  myGameData: null,
  data() {
    return {
      calConfig:new CalConfig(),
      dataCode: '',
      equips: [],
      checkAll: false,
      isIndeterminate: true,
      equipOrigins: ['新手奖池'],
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
  created() {
    this.init();
  },
  methods: {
    async calculator() {
      if (this.officialGameData == null || this.myGameData == null) {
        ElNotification({
          title: '无法计算',
          message: '没有厨师或厨具配置，无法计算',
          type: 'error',
        })
        return;
      }

      let ruleStr = null;

      // 挑选本周规则，还是历史规则
      if (this.currentRule === -1) {
        ruleStr = this.curWeekRule;
      } else {
        ruleStr = await (await fetch(`https://bcjh.xyz/api/get_rule?time=${this.currentRule}`)).json();
      }
      let topResult = await Task.main(this.officialGameData, this.myGameData, ruleStr,this.calConfig);
      console.log(topResult[0].chefs)
      this.topChefs = topResult[0].chefs
      this.topScore = topResult[0].score
    },
    async init() {
      await this.initRuleSelected();
      await this.loadData();
    },
    async loadData() {
      let data = await this.getOfficeGameData();
      if (data == null) {
        return
      }

      if (this.calConfig.addBaseValue>0){


      }


      let officialGameData = new OfficialGameData();
      officialGameData.chefs = data.chefs;
      officialGameData.equips = data.equips;
      officialGameData.materials = data.materials;
      officialGameData.recipes = data.recipes;
      officialGameData.skills = data.skills;
      officialGameData.buildMap();
      this.officialGameData = officialGameData;

      this.getEquipOrigin(data.equips)

      let myGameData = localStorage.getItem('myGameData');
      if (myGameData != null) {
        myGameData = JSON.parse(myGameData);
        let myEquipdata = await this.getMyEquip();

        if (myEquipdata != null) {
          myGameData.equips = myEquipdata;
        }
        this.myGameData = importChefsAndRecipesFromFoodGame(officialGameData, myGameData);
      }

    },
    getMyEquip() {
      return ["金烤叉", "银烤叉", "铜烤叉", "金平铲", "银平铲", "铜平铲", "金斩骨刀", "银斩骨刀", "铜斩骨刀", "象牙筷", "银骨筷", "铜竹筷", "豪华蒸笼", "双层蒸笼", "简易蒸笼", "金漏勺", "银漏勺", "铜漏勺"];
    },
    async updateData() {
      let myGameData = localStorage.getItem('myGameData')
      if (myGameData != null) {
        myGameData = JSON.parse(myGameData);
        myGameData.equips = this.getMyEquip();
        this.myGameData = importChefsAndRecipesFromFoodGame(this.officialGameData, myGameData)
      }
    },
    getEquipOrigin(equips) {
      const result = new Set();
      for (let item of equips) {
        if (item.origin.indexOf('<br>') !== -1) {
          continue;
        }
        if (item.origin.indexOf('限时任务') !== -1) {
          continue;
        }
        if (item.origin.indexOf('主线') !== -1) {
          continue;
        }
        result.add(item.origin)
      }
      this.equipOrigins = []
      for (let originName of result) {
        this.equipOrigins.push(originName)
      }
    },
    async initRuleSelected() {
      let data = await (await fetch('https://bcjh.xyz/api/get_etc_rule')).json();

      //如果是周五下午到周日22点，则尝试获取本周的厨神数据
      let curWeekRuleResult = await this.getCurrentWeekRule();

      this.ruleList = []
      if (curWeekRuleResult) {
        this.ruleList.push({
          label: '本周御前',
          value: -1
        })
      }

      let ruleList = this.ruleList;
      for (let item of data) {
        ruleList.push({
          label: item.tag,
          value: item['start_time']
        })
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
        this.updateData(data)
      }else {
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
