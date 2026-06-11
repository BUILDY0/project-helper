<template>
  <!-- 项目页入口：侧边栏 + 本地/远程子页切换 -->
  <div class="projects-root">
    <ProjectTypeBar v-model="projectType" />
    <div class="projects-body">
      <LocalProjects v-show="projectType === 'local'" :active="active && projectType === 'local'" />
      <RemoteProjects
        v-show="projectType === 'remote'"
        :active="active && projectType === 'remote'"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ProjectTypeBar from './common/components/project-type-bar.vue'
import LocalProjects from './local/local.vue'
import RemoteProjects from './remote/remote.vue'

defineProps({
  active: Boolean
})

const projectType = ref('local')
</script>

<style scoped>
.projects-root {
  display: flex;
  height: 100%;
  overflow: hidden;
}
.projects-body {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
/* 通过 v-show 保留子页面状态 */
.projects-body > :deep(*) {
  height: 100%;
}
</style>
