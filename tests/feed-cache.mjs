import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source = readFileSync(new URL('../src/Feed.tsx', import.meta.url), 'utf8')
const helpers = source.slice(source.indexOf('type FeedSnapshot'), source.indexOf('export default function Feed'))
let calls = 0, now = 1, fail = false
const context = vm.createContext({ Date: { now: () => now }, fetch: async () => { calls++; return { ok: !fail, status: 503, json: async () => [{id: 1}] } } })
vm.runInContext(ts.transpileModule(helpers, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, context)
await Promise.all([context.readStories('/stories'), context.readStories('/stories')])
assert.equal(calls, 1)
await context.readStories('/stories'); assert.equal(calls, 1)
await context.readStories('/stories?q=energy'); assert.equal(calls, 2)
now += 300001
await context.readStories('/stories'); assert.equal(calls, 3)
fail = true; await assert.rejects(context.readStories('/failed'))
fail = false; await context.readStories('/failed'); assert.equal(calls, 5)
console.log('Feed cache: shared requests, repeated reads, separate queries, expiry and error retry passed.')
