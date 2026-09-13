import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/workspaceCache.ts', import.meta.url), 'utf8').replace(/^import .*\n/gm, '')
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const storage = new Map()
let now = 1000, calls = 0, fail = false
function fixture() {
 const context = vm.createContext({ exports: {}, API: 'https://api.example', Date: { now: () => now }, sessionStorage: {
  getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key),
 }, onboardingRequest: async () => {
  calls++
  if (fail) throw new Error('offline')
  return { workspaces: [{ id: 'workspace', name: 'Workspace', slug: 'workspace' }] }
 } })
 vm.runInContext(javascript, context)
 return context.exports
}
const cache = fixture()
const key = cache.workspaceCacheKey('user-a', 'session-a')
await Promise.all([cache.loadWorkspaces(key), cache.loadWorkspaces(key)])
assert.equal(calls, 1, 'concurrent opens share one request')
await cache.loadWorkspaces(key)
assert.equal(calls, 1, 'reopening reads memory')
await fixture().loadWorkspaces(key)
assert.equal(calls, 1, 'page reload reads tab storage')
await cache.loadWorkspaces(cache.workspaceCacheKey('user-b', 'session-b'))
assert.equal(calls, 2, 'accounts do not share cached memberships')
await cache.loadWorkspaces(cache.workspaceCacheKey('user-a', 'new-session'))
assert.equal(calls, 3, 'a new login does not reuse the previous session')
now += 300001
await cache.loadWorkspaces(key)
assert.equal(calls, 4, 'expired memberships refresh')
cache.invalidateWorkspaces(key)
assert.equal(fixture().cachedWorkspaces(key), null, 'invalidation clears persistent cache')
fail = true
await assert.rejects(cache.loadWorkspaces(key))
fail = false
await cache.loadWorkspaces(key)
assert.equal(calls, 6, 'failed requests can be retried')
console.log('Workspace cache: deduplication, reload, isolation, expiry, invalidation and retry passed.')
