<script setup lang="ts">
import { ref } from 'vue'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Msg[]>([])
const input = ref('')
const busy = ref(false)
const err = ref('')

async function send() {
  const text = input.value.trim()
  if (!text || busy.value) return
  input.value = ''
  err.value = ''
  messages.value.push({ role: 'user', content: text })
  messages.value.push({ role: 'assistant', content: '' })
  busy.value = true

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.value.slice(0, -1) })
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder('utf-8')
    // SSE 缓冲：一个 data: 行可能被拆到多个网络包，中文也可能跨包断字节
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''          // 未完整的一行留到下一包
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          if (json.error) { err.value = String(json.error); continue }
          const delta = json.choices?.[0]?.delta?.content || ''
          messages.value[messages.value.length - 1].content += delta
        } catch {
          // 半包 / 心跳行，忽略
        }
      }
    }
  } catch (e) {
    err.value = `请求失败：${String(e)}`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="chat">
    <h2>AI 流式对话（Vue3 + TS + DeepSeek）</h2>
    <div v-if="err" class="err">{{ err }}</div>
    <div class="box">
      <div v-for="(m, i) in messages" :key="i" :class="['row', m.role]">
        <b>{{ m.role === 'user' ? '我' : 'AI' }}</b>
        <span>{{ m.content }}</span>
      </div>
    </div>
    <div class="input">
      <input v-model="input" @keyup.enter="send" :disabled="busy" placeholder="输入消息，回车发送…" />
      <button @click="send" :disabled="busy">{{ busy ? '生成中…' : '发送' }}</button>
    </div>
  </div>
</template>

<style scoped>
.chat { max-width: 760px; margin: 40px auto; font-family: system-ui, sans-serif; }
.err { background: #fff2f0; border: 1px solid #ffccc7; color: #a8071a; padding: 10px 12px; border-radius: 6px; white-space: pre-wrap; word-break: break-all; }
.box { min-height: 300px; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin: 12px 0; }
.row { margin: 8px 0; line-height: 1.6; }
.row.user { text-align: right; color: #1565c0; }
.row.assistant { text-align: left; color: #222; }
.input { display: flex; gap: 8px; }
.input input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; }
.input button { padding: 10px 18px; border: none; background: #1565c0; color: #fff; border-radius: 6px; cursor: pointer; }
</style>
