import test from 'node:test'
import assert from 'node:assert/strict'
import { assistantController } from '../src/controllers/assistantController.js'
import { reportController } from '../src/controllers/reportController.js'
import { createNotificationService } from '../src/services/notifications.js'

test('notifications use a recipient and event key upsert for idempotency', async () => {
  const writes = []
  const service = createNotificationService({ NotificationModel: { async updateOne(...args) { writes.push(args) } }, UserModel: {} })
  await service.notify('citizen-id', { eventKey: 'report:1:created', type: 'report_update', title: 'Report changed', message: 'Status changed.', href: '/app/reports/1' })
  await service.notify(null, { eventKey: 'ignored' })
  assert.equal(writes.length, 1)
  assert.deepEqual(writes[0][0], { recipient: 'citizen-id', eventKey: 'report:1:created' })
  assert.equal(writes[0][2].upsert, true)
})

test('assistant report tracking is filtered to the authenticated citizen and bypasses Groq', async () => {
  let filter
  let aiCalled = false
  const query = { select() { return this }, sort() { return this }, limit() { return this }, async lean() { return [{ reportNumber: 'SW-000001', status: 'in_progress', category: 'plastic_waste', createdAt: new Date('2026-10-01T00:00:00Z') }] } }
  const controller = assistantController({ ReportModel: { find(value) { filter = value; return query } }, aiAnalysis: { async reply() { aiCalled = true } } })
  let payload
  await controller.chat({ user: { id: 'signed-in-user', role: 'citizen' }, validatedBody: { messages: [{ role: 'user', content: 'What is my report status?' }] } }, { json(value) { payload = value } })
  assert.equal(String(filter.reporter), 'signed-in-user')
  assert.match(payload.data.reply, /SW-000001: in progress/)
  assert.equal(aiCalled, false)
})

test('report lookup by reference stays within the authenticated account', async () => {
  let filter
  const controller = assistantController({ ReportModel: { find(value) { filter = value; return { select() { return this }, sort() { return this }, limit() { return this }, async lean() { return [] } } } }, aiAnalysis: {} })
  let payload
  await controller.chat({ user: { id: 'citizen-2', role: 'citizen' }, validatedBody: { messages: [{ role: 'user', content: 'Check report SW-000001 status' }] } }, { json(value) { payload = value } })
  assert.deepEqual(filter, { reporter: 'citizen-2', reportNumber: 'SW-000001' })
  assert.match(payload.data.reply, /couldn’t find report/i)
})

test('assistant report-status history is not forwarded in a later Groq call', async () => {
  let providerMessages
  const controller = assistantController({ ReportModel: {}, aiAnalysis: { configured: true, async reply(messages) { providerMessages = messages; return { status: 'completed', content: 'Separate plastic by type where local facilities accept it.' } } } })
  let payload
  await controller.chat({ user: { id: 'citizen-2', role: 'citizen' }, validatedBody: { messages: [
    { role: 'user', content: 'What is my report status?' },
    { role: 'assistant', content: 'Your report status: SW-000001: in progress.' },
    { role: 'user', content: 'How should I dispose of plastic?' },
  ] } }, { json(value) { payload = value } })
  assert.deepEqual(providerMessages, [{ role: 'user', content: 'How should I dispose of plastic?' }])
  assert.match(payload.data.reply, /plastic/i)
})

test('admin analytics returns measured submission series and aggregates only sent to insight generation', async () => {
  let aggregateCall = 0
  let insightInput
  const reportModel = {
    async countDocuments() { return 12 },
    async aggregate() {
      aggregateCall += 1
      return [
        [{ _id: 'submitted', count: 5 }, { _id: 'resolved', count: 7 }],
        [{ _id: 'plastic_waste', count: 8 }],
        [{ _id: 'NIT More', count: 12 }],
        [{ _id: null, averageMs: 3_600_000, count: 7 }],
        [{ _id: '2026-10-26', count: 2 }],
      ][(aggregateCall - 1) % 5]
    },
  }
  const controller = reportController({ ReportModel: reportModel, aiAnalysis: { configured: true, async insights(value) { insightInput = value; return { status: 'completed', content: 'Eight recorded reports are plastic waste.' } } } })
  let metrics, ai
  await controller.adminMetrics({ query: {} }, { json(value) { metrics = value.data } })
  await controller.adminInsights({ query: { from: '2026-10-01', to: '2026-10-27' } }, { json(value) { ai = value.data } })
  assert.equal(metrics.total, 12)
  assert.deepEqual(metrics.dailySubmissions, [{ _id: '2026-10-26', count: 2 }])
  assert.equal(metrics.dailyWindow, 'last 30 days')
  assert.equal(ai.insights, 'Eight recorded reports are plastic waste.')
  assert.equal(insightInput.total, 12)
  assert.equal(Object.hasOwn(insightInput, 'descriptions'), false)
  assert.equal(Object.hasOwn(insightInput, 'reporters'), false)
})
