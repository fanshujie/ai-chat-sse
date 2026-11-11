<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Message from './components/Message.vue'
import { useChat } from './composables/useChat'

// 组装层：状态与网络全在 useChat，这里只管布局、滚动、错误横幅
const { messages, input, busy, err, send, abort } = useChat()
const box = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (box.value) box.value.scrollTop = box.value.scrollHeight
}

// 关键坑：流式过程中消息条数不变，变的是「最后一条的 content」。
// 只 watch messages.length 会导致生成时不滚动；盯最后一条内容才会持续滚。
// 发送瞬间 push(user) / push(空 assistant) 也会改变最后一条 content，所以一个 watch 就够。
watch(
  () => messages.value.at(-1)?.content,
  () => { void scrollToBottom() },
  { flush: 'post' }
)

function retry() {
  err.value = ''
  // send() 会清空 input，重试前把最后一句用户消息填回去
  const lastUser = [...messages.value].reverse().find(m => m.role === 'user')
  input.value = lastUser?.content ?? ''
  void send()
}
</script>

<template>
  <div class="chat">
    <h2>AI 流式对话（Vue3 + TS + DeepSeek）</h2>

    <div v-if="err" class="err">
      <span class="err-text">{{ err }}</span>
      <button class="link" @click="err = ''">关闭</button>
      <button class="link" @click="retry">重试</button>
    </div>

    <div ref="box" class="box">
      <Message
        v-for="(m, i) in messages"
        :key="i"
        :role="m.role"
        :content="m.content"
        :pending="busy && i === messages.length - 1 && !m.content"
      />
      <div v-if="!messages.length" class="empty">输入消息，开始对话…</div>
    </div>

    <div class="input">
      <input
        v-model="input"
        @keyup.enter="send"
        :disabled="busy"
        placeholder="输入消息，回车发送…"
      />
      <button @click="send" :disabled="busy || !input.trim()">
        {{ busy ? '生成中…' : '发送' }}
      </button>
      <button v-if="busy" class="stop" @click="abort">停止</button>
    </div>
  </div>
</template>

<style scoped>
.chat { max-width: 760px; margin: 40px auto; font-family: system-ui, sans-serif; }

.err {
  display: flex; align-items: center; gap: 10px;
  background: #fff2f0; border: 1px solid #ffccc7; color: #a8071a;
  padding: 10px 12px; border-radius: 6px;
  white-space: pre-wrap; word-break: break-all;
}
.err-text { flex: 1; }
.link { border: none; background: none; color: #a8071a; cursor: pointer; text-decoration: underline; padding: 2px 4px; }

/* 固定高度 + overflow 才能让 scrollTop / scrollHeight 生效（D1 版本没有，所以滚动无效） */
.box {
  height: 420px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
}
.empty { color: #9aa3af; font-size: 13px; text-align: center; padding-top: 160px; }

.input { display: flex; gap: 8px; }
.input input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; }
.input button { padding: 10px 18px; border: none; background: #1565c0; color: #fff; border-radius: 6px; cursor: pointer; }
.input button:disabled { background: #b0bec5; cursor: not-allowed; }
.input button.stop { background: #d93025; }
</style>
