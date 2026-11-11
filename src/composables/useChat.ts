import { ref, onUnmounted } from 'vue'

export interface Msg {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 聊天状态 + SSE 流解析层（D3 从 App.vue 抽出）。
 * D1 已跑通的解析逻辑原样搬迁，只新增 signal / abort / onUnmounted。
 * 不碰 DOM、不引组件、不写样式 —— 换 UI 框架这层不用改。
 */
export function useChat() {
  const messages = ref<Msg[]>([])
  const input = ref('')
  const busy = ref(false)
  const err = ref('')

  // 收在 useChat() 闭包内（而非模块级）：多个组件实例各用各的 controller，不会互相取消
  let controller: AbortController | null = null

  function abort(): void {
    if (!controller) return
    controller.abort()
    controller = null
    busy.value = false
    // 关键语义：保留已生成的部分文字，不清空、不删占位消息，用户可接着提问。
    // 主动停止不是失败，所以 err 留空，界面只是从「生成中」回到可发送状态。
  }

  async function send(): Promise<void> {
    const text = input.value.trim()
    if (!text || busy.value) return // 空输入 / 连点：不产生空消息

    input.value = ''
    err.value = ''
    messages.value.push({ role: 'user', content: text })
    messages.value.push({ role: 'assistant', content: '' })
    busy.value = true
    controller = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        // slice(0, -1) 必须保留：排除刚 push 的空 assistant 占位，否则多轮语义会坏
        body: JSON.stringify({ messages: messages.value.slice(0, -1) })
      })

      // 不因 !res.ok 提前 return：后端 sseError() 也走同一条 SSE 流，
      // 错误信息以 data: {"error": "..."} 帧返回，下面照常读流即可。
      if (!res.body) throw new Error(`服务未返回响应体（HTTP ${res.status}）`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      // SSE 缓冲：一个 data: 行可能被拆到多个网络包，中文也可能跨包断字节
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // 未完整的一行留到下一包
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
      if ((e as Error)?.name === 'AbortError') {
        // 用户主动停止：不算失败，err 保持为空
      } else {
        err.value = `请求失败：${String(e)}`
      }
    } finally {
      busy.value = false
      controller = null
    }
  }

  // 离开页面自动断流，避免后台继续烧 token
  onUnmounted(() => abort())

  return { messages, input, busy, err, send, abort }
}
