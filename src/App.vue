<template>
  <div class="app-shell">
    <TabGroup :selected-index="selectedTabIndex" @change="onTabChange">
      <TabList class="tab-header">
        <Tab v-for="tab in tabs" :key="tab.key" as="template" v-slot="{ selected }">
          <button type="button" class="tab-button" :class="{ active: selected }">
            {{ tab.label }}
          </button>
        </Tab>
      </TabList>

      <TabPanels class="tab-content-wrap">
        <TabPanel class="tab-panel">
        <div class="panel-card form-card">
          <div v-if="!simpleCal" class="form-row">
            <label class="form-label">使用厨具(3星)</label>
            <label class="switch" aria-label="使用厨具(3星)">
              <input v-model="calConfig.useEquip" type="checkbox" class="switch-input" />
              <span class="switch-track"></span>
            </label>
          </div>

          <div class="form-row">
            <label class="form-label">候选厨师最低星级</label>
            <select v-model.number="calConfig.chefMinRarity" class="control">
              <option v-for="item in 5" :key="item" :value="item">{{ item }}星</option>
            </select>
          </div>

          <div v-if="!simpleCal" class="form-row">
            <label class="form-label">候选菜谱数量(根据奖励倍数排序)</label>
            <input
              v-model.number="calConfig.recipeLimit"
              class="control"
              type="number"
              min="10"
              max="200"
              step="10"
            />
          </div>

          <div v-if="!simpleCal" class="form-row">
            <label class="form-label">低分过滤比例(无厨师最大9个菜谱为基准)</label>
            <input
              v-model.number="calConfig.filterScoreRate"
              class="control"
              type="number"
              min="0.7"
              max="0.99"
              step="0.01"
            />
          </div>

          <div class="form-row action-row">
            <select v-model="currentRule" class="control rule-select">
              <option :value="''" disabled>请选择厨神计算器</option>
              <option v-for="item in ruleList" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
            <button
              type="button"
              class="btn-primary"
              :disabled="currentRule === ''"
              @click="calculator"
            >
              计算
            </button>
          </div>
        </div>

        <div v-if="topScore !== null" class="top-score-card">
          <span class="top-score-label">最高分</span>
          <span class="top-score-value">{{ topScore }}</span>
        </div>

        <div class="top-chef-grid">
          <div
            v-for="(topChef, index) in topChefs"
            :key="`${topChef.chef}-${index}`"
            class="chef-card"
          >
            <div class="chef-name">{{ topChef.chef }}</div>
            <div class="chef-equip">{{ topChef.equip }}</div>
            <div class="chef-recipes">
              <div v-for="(recipe, recipeIndex) in topChef.recipes || []" :key="recipeIndex">
                {{ recipe.recipe }}
              </div>
            </div>
            <div class="chef-values">
              <div v-for="(recipe, recipeIndex) in topChef.recipes || []" :key="recipeIndex">
                {{ recipe.count }} {{ recipe.singlePrice }}
              </div>
            </div>
          </div>
        </div>
        </TabPanel>

        <TabPanel class="tab-panel">
        <div class="panel-card form-card">
          <div class="form-row">
            <button type="button" class="btn-primary" @click="reloadGameData">加载游戏数据</button>
          </div>
          <div class="tips-text">
            说明: [加载游戏数据] 是从图鉴网拿最新的厨师，菜谱等数据。只需要在图鉴网数据更新后重新加载一次即可。
          </div>

          <div class="form-row">
            <span>官方数据导入（厨子满级满阶才会导入）</span>
          </div>

          <div class="form-row action-row">
            <input
              v-model="dataCode"
              class="control"
              type="text"
              placeholder="在游戏设置页面获取校验码"
            />
            <button type="button" class="btn-primary" @click="saveRecipesAndChefsData">
              导入数据
            </button>
          </div>
        </div>
        </TabPanel>

        <TabPanel class="tab-panel desc-panel">
        <div class="panel-card">
          <p>奖励倍数取自白采菊花</p>
          <p>游戏数据取自图鉴网</p>
          <p>只是为了能拿到高保</p>
          <p>已考虑: 厨师修炼,菜谱专精,导入数据中厨师佩戴的厨具</p>
          <p>调料,心法盘不参与计算。</p>
          <p>
            光环技能只适配了5星厨师
            不支持的光环技能有[制作三种同技法][每制作一种神级料理]。其余光环技能可以作用于自身，但不提供在场效果。
            兰飞鸿光环技能可以作用于刘昂星
          </p>
          <p>[厨师技能效果提升50%]还没实现</p>
        </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>

  <div class="toast-stack">
    <div
      v-for="item in notifications"
      :key="item.id"
      class="toast-item"
      :class="`toast-${item.type}`"
    >
      <div class="toast-title">{{ item.title }}</div>
      <div class="toast-message">{{ item.message }}</div>
    </div>
  </div>
</template>

<script>
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { CalConfig } from './core/core.js'
import { parseData, Task } from './core/task.js'
import { markRaw, toRaw } from 'vue'

export default {
  components: {
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
  },
  data() {
    // 获取URL参数
    // http://localhost:5173/jisuanqi-zgf?useAll=true
    const urlParams = new URLSearchParams(window.location.search)
    const useAll = urlParams.get('useAll') === 'true'
    let calConfig = null

    // 没有进度条机制，所以手机端计算简单一点
    const isMobile = this.isMobile()

    if (useAll) {
      calConfig = new CalConfig([1, 8, 8, 6, 6, 4, 4, 4, 6, 11], 160, 5, 0.92, true, useAll)
    } else {
      calConfig = new CalConfig([1, 7, 6, 4, 3, 3, 3, 3, 5, 10], 120, 5, 0.92, false, false)
    }
    if (isMobile) {
      calConfig = new CalConfig([1, 5, 4, 3, 3, 3, 3, 4, 5, 6], 100, 5, 0.96, false, false)
    }

    return {
      tabs: [
        { key: 'calculator', label: '计算器' },
        { key: 'data', label: '数据' },
        { key: 'desc', label: '说明' },
      ],
      activeTab: 'calculator',
      notifications: [],
      nextNotificationId: 1,
      simpleCal: isMobile,
      calConfig,
      percentage: 0,
      showPercentage: false,
      dataCode: '',
      currentRule: '',
      ruleList: [],
      curWeekRule: null,
      topChefs: [],
      topScore: null,
    }
  },
  computed: {
    selectedTabIndex() {
      const index = this.tabs.findIndex((tab) => tab.key === this.activeTab)
      return index >= 0 ? index : 0
    },
  },
  async created() {
    this.init()
    window.onmessage = (event) => {
      this.percentage = Math.round(event.data)
    }
  },
  beforeUnmount() {
    window.onmessage = null
  },
  methods: {
    onTabChange(index) {
      const tab = this.tabs[index]
      if (tab) {
        this.activeTab = tab.key
      }
    },
    isMobile() {
      return navigator.userAgent.match(
        /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i,
      )
    },
    async calculator() {
      this.topChefs.length = 0
      this.topScore = null
      const { officialGameData, myGameData } = await this.loadData()
      if (myGameData == null || officialGameData == null) {
        this.errorNotify('无法计算', '缺少数据，需要从官方导入个人数据', 'error')
        return
      }

      this.percentage = 0
      this.showPercentage = true

      let ruleStr = null
      try {
        // 挑选本周规则，还是历史规则
        if (this.currentRule === -1) {
          ruleStr = toRaw(this.curWeekRule)
        } else {
          ruleStr = markRaw(await this.getRule(this.currentRule))
        }
      } catch (e) {
        // 忽略后续统一处理 ruleStr 为空
      }
      if (ruleStr == null) {
        this.errorNotify('获取规则失败', '', 'error')
        return
      }

      const topResult = await Task.main(officialGameData, myGameData, ruleStr, this.calConfig)
      if (topResult == null) {
        this.errorNotify('无法计算', '规则不符合预期', 'error')
        this.deleteRule(this.currentRule)
        return
      }

      this.topChefs = topResult[0].chefs
      this.topScore = topResult[0].score
    },
    errorNotify(title, message, type) {
      const id = this.nextNotificationId
      this.nextNotificationId += 1
      this.notifications.push({
        id,
        title,
        message,
        type: type || 'info',
      })
      setTimeout(() => {
        this.notifications = this.notifications.filter((item) => item.id !== id)
      }, 2800)
    },
    async getRule(ruleTime) {
      const oldRule = localStorage.getItem(ruleTime)
      if (oldRule) {
        return JSON.parse(oldRule)
      }
      // ruleTime = '2026-01-06T5:00:00.000Z';   //2026-01-02 13:00:00
      const requestTime = new Date(ruleTime).toISOString()
      const ruleStr = await (await fetch(`https://i.baochaojianghu.com/api/get_rule?time=${requestTime}`)).json()
      localStorage.setItem(ruleTime, JSON.stringify(ruleStr))
      return ruleStr
    },
    deleteRule(ruleTime) {
      localStorage.removeItem(ruleTime)
    },
    async init() {
      await this.initRuleSelected()
    },
    async loadData() {
      let gameData = await this.getOfficeGameData()
      let myGameData = localStorage.getItem('myGameData')

      if (gameData == null || myGameData == null) {
        return {
          officialGameData: null,
          myGameData: null,
        }
      }

      myGameData = JSON.parse(myGameData)
      return parseData(gameData, myGameData, this.calConfig)
    },
    async initRuleSelected() {
      const data = await (await fetch('https://i.baochaojianghu.com/api/get_etc_rule')).json()
      // 如果是周五下午到周日22点，则尝试获取本周的厨神数据
      const curWeekRuleResult = await this.getCurrentWeekRule()

      this.ruleList = []
      const ruleList = this.ruleList
      if (curWeekRuleResult) {
        this.ruleList.push({
          label: '本周御前',
          value: -1,
        })
      }
      for (const item of data) {
        ruleList.push({
          label: item.tag,
          value: item.start_time,
        })
      }
    },
    async getCurrentWeekRule() {
      // 获得今天日期时间
      const curData = new Date()
      const curTime = curData.getTime()
      // 设置时间为下午13:00:00
      curData.setHours(13, 0, 0, 0)
      // 获得今天与星期五的日差
      const week = 5 - (curData.getDay() ? curData.getDay() : 7)
      // 当天下午13:00:00的时间戳加上今天与周五的日差得到结果时间戳
      const startTime = curData.getTime() + week * 86400000
      // 周日22点
      const endTime = startTime + 205200000
      let curWeekRule = null
      if (curTime >= startTime && curTime <= endTime) {
        curWeekRule = await (await fetch('https://i.baochaojianghu.com/api/get_rule')).json()
        this.curWeekRule = curWeekRule
        return true
      }
      return false
    },
    async loadMyData(code) {
      const data = await (
        await fetch(`https://yx518.com/api/archive.do?token=${code}&_=${new Date().getTime()}`)
      ).json()
      return data.msg
    },
    async saveRecipesAndChefsData() {
      const data = await this.loadMyData(this.dataCode)
      if (data != null && data !== '' && data !== '数据过期') {
        this.errorNotify('加载成功', '加载个人成功', 'success')
        localStorage.setItem('myGameData', JSON.stringify(data))
      } else {
        this.errorNotify('加载失败', data, 'error')
      }
    },
    async getOfficeGameData() {
      let gameData = localStorage.getItem('gameData')

      if (gameData == null) {
        gameData = await this.reloadGameData()
      }
      if (gameData != null) {
        gameData = JSON.parse(gameData)
        return gameData
      }
      return null
    },
    async reloadGameData() {
      const data = await (
        await fetch(`https://foodgame.github.io/data/data.min.json?v=${new Date().getTime()}`)
      ).json()
      const dateStr = JSON.stringify(data)
      localStorage.setItem('gameData', dateStr)
      this.errorNotify('加载成功', '加载游戏数据成功', 'success')
      return dateStr
    },
  },
}
</script>

<style scoped>
.app-shell {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 16px 24px;
  text-align: left;
  box-sizing: border-box;
}

.tab-header {
  display: flex;
  gap: 0;
  align-items: flex-end;
  border-bottom: 1px solid #dcdfe6;
  margin-bottom: 0;
}

.tab-button {
  border: 1px solid #dcdfe6;
  border-bottom: none;
  background: #f5f7fa;
  color: #606266;
  border-radius: 4px 4px 0 0;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  margin-right: 4px;
  transition: background-color 0.18s ease, color 0.18s ease;
  transform: translateY(1px);
}

.tab-button:hover {
  color: #409eff;
  background: #ecf5ff;
}

.tab-button.active {
  color: #409eff;
  background: #fff;
  border-color: #dcdfe6;
  border-bottom-color: #fff;
}

.tab-content-wrap {
  border: 1px solid #dcdfe6;
  border-top: none;
  background: #fff;
  border-radius: 0 4px 4px 4px;
  padding: 18px;
}

.tab-panel {
  width: 100%;
}

.panel-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 14px 14px 10px;
  background: #fff;
}

.form-card {
  max-width: 760px;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 0 0 12px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-label {
  min-width: 260px;
  color: #303133;
  font-size: 14px;
  line-height: 20px;
}

.control {
  height: 32px;
  min-width: 120px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 10px;
  font-size: 14px;
  color: #606266;
  background: #fff;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.control:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 1px #409eff inset;
}

.rule-select {
  min-width: 300px;
}

.switch {
  position: relative;
  width: 42px;
  height: 24px;
  display: inline-block;
  cursor: pointer;
}

.switch-input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.switch-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid #dcdfe6;
  background: #dcdfe6;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.switch-track::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease;
}

.switch-input:checked + .switch-track {
  background: #409eff;
  border-color: #409eff;
}

.switch-input:checked + .switch-track::after {
  transform: translateX(18px);
}

.switch-input:focus-visible + .switch-track {
  outline: 2px solid #a0cfff;
  outline-offset: 2px;
}

.btn-primary {
  border: 1px solid #79bbff;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  height: 32px;
  padding: 0 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  transition: background-color 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s,
    transform 0.05s;
}

.btn-primary:not(:disabled):hover {
  background: #d9ecff;
  color: #337ecc;
  border-color: #409eff;
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.2);
}

.btn-primary:not(:disabled):active {
  background: #c6e2ff;
  border-color: #337ecc;
  box-shadow: inset 0 1px 2px rgba(51, 126, 204, 0.25);
  transform: translateY(1px);
}

.btn-primary:focus-visible {
  outline: 2px solid #a0cfff;
  outline-offset: 1px;
}

.btn-primary:disabled {
  background: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
  opacity: 1;
  cursor: not-allowed;
}

.top-score-card {
  margin: 14px 0;
  padding: 8px 12px;
  border-radius: 4px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  color: #409eff;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.top-score-label {
  font-size: 13px;
}

.top-score-value {
  font-size: 18px;
  font-weight: 700;
}

.top-chef-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.chef-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  display: grid;
  grid-template-columns: 0.9fr 1fr 1.6fr 1.3fr;
  gap: 10px;
  align-items: start;
  font-size: 14px;
  color: #303133;
  background: #fff;
}

.chef-name {
  font-weight: 700;
}

.chef-equip {
  color: #909399;
}

.chef-recipes,
.chef-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chef-values {
  color: #606266;
}

.tips-text {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 14px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px 12px;
}

.desc-panel p {
  margin: 6px 0;
  color: #606266;
  line-height: 1.6;
}

.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 9999;
}

.toast-item {
  min-width: 260px;
  max-width: 360px;
  border-radius: 6px;
  padding: 12px;
  color: #fff;
  border: 1px solid #ffffff47;
}

.toast-title {
  font-size: 14px;
  font-weight: 700;
}

.toast-message {
  font-size: 13px;
  margin-top: 4px;
  word-break: break-word;
  line-height: 1.5;
}

.toast-success {
  background: #67c23a;
}

.toast-error {
  background: #f56c6c;
}

.toast-info {
  background: #409eff;
}

@media (max-width: 768px) {
  .app-shell {
    padding: 12px 10px 18px;
  }

  .tab-content-wrap {
    padding: 12px;
  }

  .panel-card {
    padding: 12px 10px;
  }

  .form-card {
    max-width: 100%;
  }

  .form-label {
    min-width: 100%;
  }

  .rule-select {
    min-width: 240px;
  }

  .chef-card {
    grid-template-columns: 1fr;
  }
}
</style>
