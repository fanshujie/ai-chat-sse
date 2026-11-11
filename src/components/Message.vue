<script setup lang="ts">
import type { Msg } from '../composables/useChat'

// 纯展示组件：不发请求、不改 messages、不持有业务状态、不 emit
withDefaults(
  defineProps<{
    role: Msg['role']
    content: string
    pending?: boolean
  }>(),
  { pending: false }
)
</script>

<template>
  <div class="message-row" :class="role === 'user' ? 'is-user' : 'is-assistant'">
    <!-- 修 D1 遗留：标签独占一行，与气泡之间留 8px，不再裸文本拼接 -->
    <div class="label">{{ role === 'user' ? '我' : 'AI' }}</div>
    <div class="bubble">
      <div v-if="pending && !content" class="skeleton">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="hint">正在思考…</span>
      </div>
      <div v-else class="content">{{ content }}</div>
    </div>
  </div>
</template>

<style scoped>
.message-row { display: flex; flex-direction: column; margin: 12px 0; }
.message-row.is-user { align-items: flex-end; }
.message-row.is-assistant { align-items: flex-start; }

.label { font-size: 12px; color: #8a9099; margin-bottom: 8px; padding: 0 2px; }

.bubble {
  max-width: 75%;
  padding: 10px 12px;
  border-radius: 12px;
  line-height: 1.6;
  white-space: pre-wrap;   /* 保留模型输出里的换行 */
  word-break: break-word;  /* 长英文 / URL 不撑破气泡 */
  background: #f2f4f7;
  color: #222;
}
.is-user .bubble { background: #1565c0; color: #fff; border-top-right-radius: 4px; }
.is-assistant .bubble { border-top-left-radius: 4px; }

.content { font-size: 14px; }

.skeleton { display: flex; align-items: center; min-height: 20px; }
.dot {
  width: 6px; height: 6px; border-radius: 50%; background: #9aa3af;
  margin-right: 4px; animation: blink 1.2s infinite ease-in-out;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
.hint { font-size: 12px; color: #8a9099; margin-left: 8px; }
@keyframes blink { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }
</style>
