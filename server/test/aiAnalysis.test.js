import test from 'node:test'
import assert from 'node:assert/strict'
import { createAiAnalysis, signAnalysisToken, verifyAnalysisToken } from '../src/services/aiAnalysis.js'

const image = Buffer.from('verified image bytes')
const description = 'Garbage is accumulating beside a busy walkway.'
const analysis = { provider: 'groq', model: 'qwen/qwen3.8-27b', status: 'completed', suggestedCategory: 'general_garbage', suggestedPriority: 'high', summary: 'Loose waste is visible on the walkway.', priorityRationale: 'The litter covers a public path.', recommendedAction: 'Review and schedule collection.', confidence: null }

test('vision service sends the selected image as base64 and validates JSON without fabricating confidence', async () => {
  let sent
  const service = createAiAnalysis({ apiKey: 'server-secret', model: 'qwen/qwen3.8-27b', fetchImpl: async (url, options) => {
    sent = { url, options }
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ inconclusive: false, category: 'general_garbage', priority: 'high', summary: 'Loose waste is visible on the walkway.', priorityRationale: 'The litter covers a public path.', recommendedAction: 'Review and schedule collection.', confidence: 0.99 }) } }] }) }
  } })
  const output = await service.analyze({ buffer: image, contentType: 'image/png', description })
  const body = JSON.parse(sent.options.body)
  assert.equal(sent.url, 'https://api.groq.com/openai/v1/chat/completions')
  assert.equal(sent.options.headers.Authorization, 'Bearer server-secret')
  assert.equal(body.model, 'qwen/qwen3.8-27b')
  assert.equal(body.max_completion_tokens, 350)
  assert.equal(body.messages[0].content[1].image_url.url, `data:image/png;base64,${image.toString('base64')}`)
  assert.equal(output.provider, 'groq')
  assert.equal(output.suggestedCategory, 'general_garbage')
  assert.equal(output.priorityRationale, 'The litter covers a public path.')
  assert.equal(output.confidence, null)
})

test('analysis gracefully handles missing credentials and malformed provider output', async () => {
  let called = false
  const unconfigured = createAiAnalysis({ fetchImpl: async () => { called = true } })
  assert.equal((await unconfigured.analyze({ buffer: image, contentType: 'image/png', description })).reason, 'not_configured')
  assert.equal(called, false)
  const invalid = createAiAnalysis({ apiKey: 'key', fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"category":"not_a_category"}' } }] }) }) })
  assert.equal((await invalid.analyze({ buffer: image, contentType: 'image/png', description })).status, 'unavailable')
})

test('analysis token is short-lived and bound to the user, image, MIME type, and description', () => {
  const secret = 'signing-secret-long-enough-for-hmac'
  const now = Date.now()
  const token = signAnalysisToken({ analysis, userId: 'citizen-1', buffer: image, contentType: 'image/png', description, secret, now })
  const valid = { userId: 'citizen-1', buffer: image, contentType: 'image/png', description, secret, now }
  assert.deepEqual(verifyAnalysisToken(token, valid), analysis)
  assert.equal(verifyAnalysisToken(token, { ...valid, userId: 'citizen-2' }), null)
  assert.equal(verifyAnalysisToken(token, { ...valid, buffer: Buffer.from('other image') }), null)
  assert.equal(verifyAnalysisToken(token, { ...valid, contentType: 'image/jpeg' }), null)
  assert.equal(verifyAnalysisToken(token, { ...valid, description: 'changed description' }), null)
  assert.equal(verifyAnalysisToken(token, { ...valid, now: now + 6 * 60_000 }), null)
  assert.equal(verifyAnalysisToken(`${token.slice(0, -1)}x`, valid), null)
})
