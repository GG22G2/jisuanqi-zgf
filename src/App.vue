<template>
  <div class="app-shell">
    <div class="app-layout">
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
          <div class="form-row">
            <label class="form-label">计算档位</label>
            <select v-model="calPreset" class="control" @change="applyCalPreset(calPreset)">
              <option v-for="item in presetOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

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
          <div class="top-score-meta">
            <span class="top-score-label">当前最高分</span>
            <span class="top-score-tip">基于当前规则与筛选参数</span>
          </div>
          <span class="top-score-value">{{ topScore }}</span>
        </div>

        <div v-else class="empty-result-card">
          <div class="empty-result-title">还没有计算结果</div>
          <div class="empty-result-desc">选择规则后点击"计算"，结果会在这里展示。</div>
        </div>

        <div v-if="topChefs.length" class="top-chef-grid">
          <div
            v-for="(topChef, index) in topChefs"
            :key="`${topChef.chef}-${index}`"
            class="chef-card"
          >
            <div class="chef-rank">#{{ index + 1 }}</div>
            <div class="chef-head">
              <div class="chef-name">{{ topChef.chef }}</div>
              <div class="chef-equip">{{ topChef.equip || '未佩戴厨具' }}</div>
            </div>
            <div class="chef-columns">
              <div class="chef-column">
                <div class="chef-column-title">菜谱</div>
                <div class="chef-recipes">
                  <div v-for="(recipe, recipeIndex) in topChef.recipes || []" :key="recipeIndex">
                    {{ recipe.recipe }}
                  </div>
                </div>
              </div>
              <div class="chef-column">
                <div class="chef-column-title">份数 / 单价</div>
                <div class="chef-values">
                  <div v-for="(recipe, recipeIndex) in topChef.recipes || []" :key="recipeIndex">
                    {{ recipe.count }} {{ recipe.singlePrice }}
                  </div>
                </div>
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

    // 没有进度条机制，所以手机端计算简单一点
    const isMobile = this.isMobile()

    const presetOptions = [
      { label: '稳健(更快)', value: 'stable' },
      { label: '均衡(推荐)', value: 'balanced' },
      { label: '激进(更高分概率)', value: 'aggressive' },
    ]
    const presetConfigs = {
      stable: {
        deepLimit: [1, 5, 4, 3, 3, 3, 3, 4, 5, 6],
        recipeLimit: isMobile ? 90 : 100,
        filterScoreRate: 0.96,
        ownChefTopK: 4,
        baseOwnChefTopK: 3,
        recipePerturbRuns: 2,
        recipeCandidateExpandRate: 1.15,
        recipeCandidateExpandMax: 30,
        estimatedCandidateKeepRate: 1.05,
        maxEstimatedCandidateExtra: 300,
        useEquip: false,
      },
      balanced: {
        deepLimit: [1, 7, 6, 4, 3, 3, 3, 3, 5, 10],
        recipeLimit: 120,
        filterScoreRate: 0.92,
        ownChefTopK: 5,
        baseOwnChefTopK: 3,
        recipePerturbRuns: 4,
        recipeCandidateExpandRate: 1.35,
        recipeCandidateExpandMax: 60,
        estimatedCandidateKeepRate: 1.12,
        maxEstimatedCandidateExtra: 800,
        useEquip: false,
      },
      aggressive: {
        deepLimit: [1, 8, 8, 6, 6, 4, 4, 4, 6, 11],
        recipeLimit: 170,
        filterScoreRate: 0.88,
        ownChefTopK: 7,
        baseOwnChefTopK: 3,
        recipePerturbRuns: 6,
        recipeCandidateExpandRate: 1.55,
        recipeCandidateExpandMax: 100,
        estimatedCandidateKeepRate: 1.2,
        maxEstimatedCandidateExtra: 1400,
        useEquip: true,
      },
    }
    const defaultPreset = isMobile ? 'stable' : useAll ? 'aggressive' : 'balanced'
    const calConfig = new CalConfig([1, 7, 6, 4, 3, 3, 3, 3, 5, 10], 120, 5, 0.92, false, useAll)
    const applyPresetConfig = (config, presetKey) => {
      const preset = presetConfigs[presetKey] || presetConfigs.balanced
      config.deepLimit = preset.deepLimit.slice()
      config.recipeLimit = preset.recipeLimit
      config.filterScoreRate = preset.filterScoreRate
      config.ownChefTopK = preset.ownChefTopK
      config.baseOwnChefTopK = preset.baseOwnChefTopK
      config.enableDynamicTopK = true
      config.recipePerturbRuns = preset.recipePerturbRuns
      config.recipeCandidateExpandRate = preset.recipeCandidateExpandRate
      config.recipeCandidateExpandMax = preset.recipeCandidateExpandMax
      config.estimatedCandidateKeepRate = preset.estimatedCandidateKeepRate
      config.maxEstimatedCandidateExtra = preset.maxEstimatedCandidateExtra
      config.useEquip = isMobile ? false : preset.useEquip
    }
    applyPresetConfig(calConfig, defaultPreset)
    console.log(calConfig)
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
      calPreset: defaultPreset,
      presetOptions,
      presetConfigs,
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
    applyCalPreset(presetKey) {
      const preset = this.presetConfigs[presetKey] || this.presetConfigs.balanced
      if (!preset) {
        return
      }
      this.calConfig.deepLimit = preset.deepLimit.slice()
      this.calConfig.recipeLimit = preset.recipeLimit
      this.calConfig.filterScoreRate = preset.filterScoreRate
      this.calConfig.ownChefTopK = preset.ownChefTopK
      this.calConfig.baseOwnChefTopK = preset.baseOwnChefTopK
      this.calConfig.enableDynamicTopK = true
      this.calConfig.recipePerturbRuns = preset.recipePerturbRuns
      this.calConfig.recipeCandidateExpandRate = preset.recipeCandidateExpandRate
      this.calConfig.recipeCandidateExpandMax = preset.recipeCandidateExpandMax
      this.calConfig.estimatedCandidateKeepRate = preset.estimatedCandidateKeepRate
      this.calConfig.maxEstimatedCandidateExtra = preset.maxEstimatedCandidateExtra
      this.calConfig.useEquip = this.simpleCal ? false : preset.useEquip
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
  max-width: 1140px;
  margin: 0 auto;
  padding: 12px 16px 16px;
  text-align: left;
  box-sizing: border-box;
  min-height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}

.app-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.tab-header {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}

.tab-button {
  border: 1px solid var(--color-border);
  background: var(--color-surface-soft);
  color: var(--color-text-muted);
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.1;
  font-weight: 500;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--color-primary);
  border-color: var(--color-border-strong);
  background: #f1f7f4;
}

.tab-button.active {
  color: var(--color-primary);
  background: var(--color-primary-soft);
  border-color: #b9d9ce;
  box-shadow: 0 6px 14px rgba(47, 138, 116, 0.14);
}

.tab-content-wrap {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 14px 32px rgba(56, 81, 69, 0.08);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tab-panel {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.panel-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--color-surface-soft);
}

.form-card {
  max-width: 760px;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-label {
  min-width: 220px;
  color: var(--color-text);
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
}

.control {
  height: 34px;
  min-width: 110px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-surface);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  box-sizing: border-box;
}

.control:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(47, 138, 116, 0.15);
}

.rule-select {
  min-width: 320px;
}

.switch {
  position: relative;
  width: 46px;
  height: 26px;
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
  border: 1px solid var(--color-border);
  background: #c7d5cd;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.switch-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.switch-input:checked + .switch-track {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.switch-input:checked + .switch-track::after {
  transform: translateX(20px);
}

.switch-input:focus-visible + .switch-track {
  outline: 2px solid rgba(47, 138, 116, 0.5);
  outline-offset: 2px;
}

.btn-primary {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: #f7fffb;
  border-radius: 8px;
  height: 34px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(47, 138, 116, 0.24);
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease,
    transform 0.05s ease;
}

.btn-primary:not(:disabled):hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 8px 18px rgba(37, 111, 94, 0.28);
}

.btn-primary:not(:disabled):active {
  background: #1f5f50;
  border-color: #1f5f50;
  box-shadow: 0 4px 10px rgba(31, 95, 80, 0.28);
  transform: translateY(1px);
}

.btn-primary:focus-visible {
  outline: 2px solid rgba(47, 138, 116, 0.45);
  outline-offset: 1px;
}

.btn-primary:disabled {
  background: #d8e2dd;
  border-color: #d8e2dd;
  color: #9aaba2;
  opacity: 1;
  cursor: not-allowed;
  box-shadow: none;
}

.top-score-card {
  margin: 12px 0 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: linear-gradient(130deg, var(--color-primary-soft), #f0faf6);
  border: 1px solid #b8dacc;
  color: var(--color-text);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  max-width: 760px;
}

.top-score-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.top-score-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.top-score-tip {
  font-size: 11px;
  color: #799185;
}

.top-score-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--color-primary);
}

.empty-result-card {
  margin: 12px 0 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed var(--color-border-strong);
  background: #f7fbf8;
  max-width: 760px;
}

.empty-result-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.empty-result-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.top-chef-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  margin-top: 8px;
}

.chef-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: 0 8px 20px rgba(48, 76, 63, 0.08);
}

.chef-rank {
  width: fit-content;
  font-size: 12px;
  line-height: 1;
  padding: 6px 8px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
}

.chef-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.chef-name {
  font-weight: 700;
  font-size: 16px;
}

.chef-equip {
  color: var(--color-text-muted);
  font-size: 13px;
}

.chef-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.chef-column {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px;
  background: #fbfdfb;
}

.chef-column-title {
  font-size: 12px;
  color: #779185;
  margin-bottom: 8px;
  font-weight: 600;
}

.chef-recipes,
.chef-values {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13px;
}

.chef-values {
  color: var(--color-text-muted);
}

.tips-text {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 14px;
  background: #eff6f2;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 12px;
}

.desc-panel p {
  margin: 8px 0;
  color: var(--color-text-muted);
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
  border-radius: 10px;
  padding: 12px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow: 0 10px 20px rgba(28, 43, 35, 0.2);
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
  background: var(--color-success);
}

.toast-error {
  background: var(--color-error);
}

.toast-info {
  background: var(--color-info);
}

@media (max-width: 768px) {
  .app-shell {
    padding: 8px 8px 12px;
    min-height: 100dvh;
    max-height: none;
    overflow: visible;
  }

  .app-layout {
    height: auto;
    min-height: auto;
  }

  .tab-header {
    gap: 4px;
    margin-bottom: 6px;
  }

  .tab-button {
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 6px;
  }

  .tab-content-wrap {
    padding: 10px;
    border-radius: 10px;
    flex: none;
    overflow: visible;
  }

  .tab-panel {
    overflow: visible;
  }

  .panel-card {
    padding: 10px 8px;
    border-radius: 8px;
  }

  .form-card {
    max-width: 100%;
  }

  .form-row {
    gap: 8px;
    margin: 0 0 8px;
  }

  .form-label {
    min-width: 100%;
    font-size: 12px;
    margin-bottom: 2px;
  }

  .control {
    height: 36px;
    font-size: 14px;
    min-width: auto;
  }

  .rule-select {
    min-width: 100%;
    width: 100%;
    flex: 1;
  }

  .action-row {
    flex-direction: column;
    gap: 8px;
  }

  .action-row .control {
    width: 100%;
    height: 40px !important;
    min-height: 40px;
    line-height: 38px;
    padding: 0 10px;
  }

  .action-row .btn-primary {
    width: 100%;
    height: 40px;
  }

  .btn-primary {
    height: 36px;
    padding: 0 14px;
    font-size: 14px;
  }

  .top-score-card {
    padding: 10px 12px;
    margin: 8px 0 6px;
    border-radius: 8px;
  }

  .top-score-label {
    font-size: 11px;
  }

  .top-score-tip {
    font-size: 10px;
  }

  .top-score-value {
    font-size: 20px;
  }

  .empty-result-card {
    padding: 10px;
    margin: 8px 0 6px;
    border-radius: 8px;
  }

  .empty-result-title {
    font-size: 12px;
  }

  .empty-result-desc {
    font-size: 11px;
    margin-top: 3px;
  }

  .top-chef-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 6px;
  }

  .chef-card {
    padding: 10px;
    border-radius: 10px;
    gap: 8px;
  }

  .chef-rank {
    font-size: 11px;
    padding: 4px 6px;
  }

  .chef-name {
    font-size: 14px;
  }

  .chef-equip {
    font-size: 12px;
  }

  .chef-head {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .chef-columns {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .chef-column {
    padding: 8px;
    border-radius: 8px;
  }

  .chef-column-title {
    font-size: 11px;
    margin-bottom: 6px;
  }

  .chef-recipes,
  .chef-values {
    font-size: 12px;
    gap: 5px;
  }

  .tips-text {
    font-size: 12px;
    padding: 8px 10px;
    margin-bottom: 10px;
  }

  .desc-panel p {
    margin: 6px 0;
    font-size: 12px;
  }
}
</style>
