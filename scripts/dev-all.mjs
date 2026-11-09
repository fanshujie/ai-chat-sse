// dev:all 启动器：用 node 直接启动两个子进程，完全不经 cmd.exe / shell。
// 背景：部分 Windows 环境 PATH 异常时，concurrently 启动子 shell 会报 spawn cmd.exe ENOENT。
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const node = process.execPath

const tasks = [
  { name: 'API', args: ['node_modules/tsx/dist/cli.mjs', 'watch', 'server/index.ts'] },
  { name: 'WEB', args: ['node_modules/vite/bin/vite.js'] },
]

// 干跑验证（cmd）：set DEV_ALL_DRY=1 && node scripts/dev-all.mjs（只打印、不启动、不占端口）
if (process.env.DEV_ALL_DRY === '1') {
  console.log(`cwd = ${root}`)
  for (const t of tasks) console.log(`[${t.name}] ${node} ${t.args.join(' ')}`)
  process.exit(0)
}

const children = []
let stopping = false

function shutdown(code = 0) {
  if (stopping) return
  stopping = true
  for (const c of children) c.kill()
  process.exit(code)
}

console.log('启动 API(3001) + WEB(5173)，Ctrl+C 停止…')

for (const t of tasks) {
  const child = spawn(node, t.args, { cwd: root, stdio: 'inherit', env: process.env })
  children.push(child)
  child.on('error', (err) => {
    console.error(`[${t.name}] 启动失败：${err.message}`)
    shutdown(1)
  })
  child.on('exit', (code) => {
    console.log(`[${t.name}] 已退出，code=${code}`)
    shutdown(code ?? 0)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
