import { spawn } from 'node:child_process'

const children = new Set()
let stopping = false

function stop(code) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) {
    if (!child.pid) continue
    if (process.platform === 'win32') child.kill('SIGTERM')
    else process.kill(-child.pid, 'SIGTERM')
  }
}

function run(args) {
  const child = spawn('npm', args, { stdio: 'inherit', detached: process.platform !== 'win32' })
  children.add(child)
  child.on('error', (error) => {
    console.error(error.message)
    stop(1)
  })
  child.on('exit', () => children.delete(child))
  return child
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

console.log('Auth uses cloud D1 fontes-auth; changes appear in Cloudflare Studio.')
for (const script of ['dev:auth', 'dev:local']) {
  run(['run', script]).on('exit', (code) => stop(code ?? 1))
}
