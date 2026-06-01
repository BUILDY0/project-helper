<template>
  <div class="app">
    <!-- 顶部 banner：通过 :active-tab + @update 拦截切换，必要时弹出未保存提示 -->
    <TopBanner :active-tab="activeTab" @update:active-tab="onRequestTab" />

    <!-- 主内容区根据 tab 切换 -->
    <main class="app-main">
      <ProjectsPage v-show="activeTab === 'projects'" :active="activeTab === 'projects'" />
      <SettingsPage
        ref="settingsRef"
        v-show="activeTab === 'settings'"
        :active="activeTab === 'settings'"
      />
    </main>

    <!-- 切走配置页时若存在未保存的修改，提示用户 -->
    <UnsavedDialog
      :visible="unsaved.visible"
      title="存在未保存的修改"
      message="检测到配置页有尚未保存的修改，是否保存？"
      confirm-text="保存并切换"
      discard-text="放弃修改"
      cancel-text="留在此页"
      @confirm="onUnsavedSave"
      @discard="onUnsavedDiscard"
      @cancel="onUnsavedCancel"
    />

    <!-- 应用自动更新提示（右下角悬浮） -->
    <UpdateBanner />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import TopBanner from './components/business/top-banner.vue'
import ProjectsPage from './pages/projects/index.vue'
import SettingsPage from './pages/settings/index.vue'
import UnsavedDialog from './components/common/unsaved-dialog.vue'
import UpdateBanner from './components/business/update-banner.vue'

// 当前激活的 tab：projects 项目展示页 / settings 配置页
const activeTab = ref('projects')
const settingsRef = ref(null)

// "未保存提示" 弹窗状态：pendingTab 表示用户想要切到的目标 tab
const unsaved = reactive({ visible: false, pendingTab: '' })

/**
 * 拦截 tab 切换：若当前在 settings 且存在未保存修改，先弹确认；否则直接切换
 * @param {string} target 目标 tab key
 */
function onRequestTab(target) {
  if (target === activeTab.value) return
  if (activeTab.value === 'settings' && settingsRef.value?.hasChanges?.()) {
    unsaved.pendingTab = target
    unsaved.visible = true
    return
  }
  activeTab.value = target
}

/** 弹窗：保存后切换 */
async function onUnsavedSave() {
  unsaved.visible = false
  try {
    await settingsRef.value?.save?.()
  } catch {
    // 保存失败由 SettingsPage 内部 toast 提示，这里不再阻塞 tab 切换由用户决定
    return
  }
  if (unsaved.pendingTab) activeTab.value = unsaved.pendingTab
  unsaved.pendingTab = ''
}

/** 弹窗：放弃修改并切换 */
async function onUnsavedDiscard() {
  unsaved.visible = false
  // 回滚 settings 的本地编辑到磁盘最新状态，避免后续切回仍是脏数据
  await settingsRef.value?.discard?.()
  if (unsaved.pendingTab) activeTab.value = unsaved.pendingTab
  unsaved.pendingTab = ''
}

/** 弹窗：取消，留在配置页 */
function onUnsavedCancel() {
  unsaved.visible = false
  unsaved.pendingTab = ''
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}
.app-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
