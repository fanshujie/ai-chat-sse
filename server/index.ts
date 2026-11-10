import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const KEY = process.env.DEEPSEEK_API_KEY
const BASE = 'https://api.deepseek.com'
// 模型名会随官方升级变化（2026-11 官方为 deepseek-flash / deepseek-v4-pro）
// 统一放 .env，官方改名时只改一行，不用动代码。
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash'

// 从 data/prompts.md 顶部读取 system prompt（D2 起由你维护）
// function systemPrompt(): string {
//   try {
//     return fs.readFileSync('data/prompts.md', 'utf-8').slice(0, 800)
//   } catch {
//     return '你是一个有帮助的 AI 助手。'
//   }
// }
const PROMPTS_FILE = path.resolve(process.cwd(), 'data/prompts.md')
const CONFIG_FILE = path.resolve(process.cwd(), 'data/prompt-config.json')

type Parts = { role: string; fewShot: string; json: string }
type Config = { variant: string; temperature: number; disableThinking: boolean; jsonMode: boolean }

const DEFAULT_CONFIG: Config = {
  variant: 'role', temperature: 0.3, disableThinking: true, jsonMode: false
}

function parsePrompts(): Parts {
  const text = fs.readFileSync(PROMPTS_FILE, 'utf-8')
  const parts: Parts = { role: '', fewShot: '', json: '' }
  for (const block of text.split(/^## /m)) {
    const lines = block.split('\n')
    const title = lines.shift() || ''
    const body = lines
      .filter(l => !/^\s*<!--/.test(l) && !/-->\s*$/.test(l))
      .join('\n')
      .trim()
    if (title.startsWith('1.')) parts.role = body
    else if (title.startsWith('2.')) parts.fewShot = body
    else if (title.startsWith('3.')) parts.json = body
  }
  return parts
}

function loadConfig(): Config {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) }
  } catch (e) {
    console.warn('[config] 读取失败，使用默认值：', String(e))
    return DEFAULT_CONFIG
  }
}

function buildSystem(variant: string, parts: Parts): string | null {
  if (variant === 'none') return null
  if (variant === 'fewshot') return parts.role + '\n\n' + parts.fewShot
  if (variant === 'json') return parts.role + '\n\n' + parts.json
  return parts.role
}

function sseError(res: express.Response, msg: string) {
  console.error('[chat error]', msg)
  res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
  res.end()
}

// SSE 流式对话：DeepSeek 的 stream 响应原样转发给前端
app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  if (!KEY || KEY.startsWith('sk-你的')) {
    sseError(res, '缺少 DEEPSEEK_API_KEY：把 .env.example 复制为 .env 并填入真实 key')
    return
  }

  // const userMessages = req.body.messages ?? []
  // const messages = [
  //   { role: 'system', content: systemPrompt() },
  //   ...userMessages
  // ]

  const cfg = loadConfig()
  const parts = parsePrompts()
  const sys = buildSystem(cfg.variant, parts)
  const messages = [
    ...(sys ? [{ role: 'system' as const, content: sys }] : []),
    ...(req.body.messages ?? [])
  ]
  console.log('[chat]', {
    variant: cfg.variant,
    temperature: cfg.temperature,
    thinking: cfg.disableThinking ? 'off' : 'on',
    jsonMode: cfg.jsonMode
  })

  try {
    const upstream = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        temperature: cfg.temperature,
        reasoning_effort: cfg.disableThinking ? 'none' : undefined,
        response_format: (cfg.jsonMode || cfg.variant === 'json')
          ? { type: 'json_object' }
          : undefined
      })
    })

    // 关键：401 / 400 / 余额不足时把错误明确送回前端，而不是把错误 JSON 当流吞掉导致白屏
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '')
      sseError(res, `DeepSeek ${upstream.status}: ${detail.slice(0, 400)}`)
      return
    }

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }
    res.write(decoder.decode())
  } catch (e) {
    sseError(res, String(e))
    return
  }
  res.end()
})

app.listen(3001, () => console.log(`✅ API server on http://localhost:3001 | model=${MODEL}`))
