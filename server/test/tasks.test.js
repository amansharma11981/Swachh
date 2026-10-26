import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'

const config = {
  port: 5000, nodeEnv: 'test', jwtSecret: 'worker-task-test-secret-with-at-least-thirty-two-characters', jwtExpiresIn: '2h',
  cookieMaxAge: 7_200_000, cookieName: 'swachhai_session', cookieSecure: false, clientOrigins: ['http://localhost:5173'], maxImageSizeBytes: 5 * 1024 * 1024,
}
const origin = config.clientOrigins[0]
const adminId = new mongoose.Types.ObjectId().toString()
const workerId = new mongoose.Types.ObjectId().toString()
const otherWorkerId = new mongoose.Types.ObjectId().toString()
const citizenId = new mongoose.Types.ObjectId().toString()
const otherCitizenId = new mongoose.Types.ObjectId().toString()
const inactiveWorkerId = new mongoose.Types.ObjectId().toString()
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1sAAAAASUVORK5CYII=', 'base64')

const users = new Map([
  [adminId, { _id: adminId, id: adminId, name: 'Operations Admin', email: 'admin@test.invalid', role: 'admin', isActive: true }],
  [workerId, { _id: workerId, id: workerId, name: 'Worker One', email: 'worker@test.invalid', role: 'worker', isActive: true }],
  [otherWorkerId, { _id: otherWorkerId, id: otherWorkerId, name: 'Worker Two', email: 'worker2@test.invalid', role: 'worker', isActive: true }],
  [citizenId, { _id: citizenId, id: citizenId, name: 'Citizen One', email: 'citizen@test.invalid', role: 'citizen', isActive: true }],
  [inactiveWorkerId, { _id: inactiveWorkerId, id: inactiveWorkerId, name: 'Inactive Worker', email: 'inactive@test.invalid', role: 'worker', isActive: false }],
])

const matches = (record, filter) => Object.entries(filter).every(([key, expected]) => {
  if (expected && typeof expected === 'object' && '$in' in expected) return expected.$in.includes(record[key])
  if (expected instanceof RegExp) return expected.test(String(record[key] || ''))
  return String(record[key] ?? '') === String(expected ?? '')
})
const clone = (value) => {
  if (!value || typeof value !== 'object') return value
  const { save, ...plain } = value
  return structuredClone(plain)
}

class TestUser {
  static async findSafeById(id) { return users.get(String(id)) || null }
  static find(filter) {
    const rows = [...users.values()].filter((user) => matches(user, filter))
    const query = { offset: 0, count: 50, sort() { return this }, select() { return this }, skip(n) { this.offset = n; return this }, limit(n) { this.count = n; return this }, lean() { return Promise.resolve(rows.slice(this.offset, this.offset + this.count).map(clone)) } }
    return query
  }
  static async countDocuments(filter) { return [...users.values()].filter((user) => matches(user, filter)).length }
}

class TestReport {
  static records = []
  static async create(values) {
    const record = { _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date(), updatedAt: new Date(), priority: 'normal', assignmentStatus: 'unassigned', statusHistory: [], assignmentHistory: [], progressNotes: [], completionEvidence: [], ...clone(values) }
    record.save = async function save() { this.updatedAt = new Date(); return this }
    this.records.push(record)
    return record
  }
  static findById(id) {
    const record = this.records.find((item) => String(item._id) === String(id)) || null
    return { lean: async () => record ? clone(record) : null, then(resolve, reject) { return Promise.resolve(record).then(resolve, reject) } }
  }
  static find(filter) {
    const rows = this.records.filter((record) => matches(record, filter))
    const query = { offset: 0, count: 50, sort() { return this }, select() { return this }, skip(n) { this.offset = n; return this }, limit(n) { this.count = n; return this }, lean: async () => rows.slice(this.offset, this.offset + this.count).map(clone) }
    return query
  }
  static async countDocuments(filter) { return this.records.filter((record) => matches(record, filter)).length }
}
class TestAudit {
  static records = []
  static async create(values) { const event = { ...values, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date() }; this.records.push(event); return event }
}
class TestNotification { static async updateOne() { return { upsertedCount: 1 } } }

function token(id) { return jwt.sign({}, config.jwtSecret, { subject: id, issuer: 'swachhai-api', audience: 'swachhai-web', expiresIn: '2h' }) }
function auth(call, id) { return call.set('Origin', origin).set('Cookie', `${config.cookieName}=${token(id)}`) }
function freshApp() {
  TestReport.records = []; TestAudit.records = []
  const storage = {
    enabled: true,
    async upload(buffer, { contentType }) { return { provider: 'cloudinary', assetId: `completion/${buffer.length}`, secureUrl: 'https://images.example.test/completion.webp', contentType, size: buffer.length, uploadedAt: new Date() } },
    async remove() {},
  }
  const app = createApp({ config, UserModel: TestUser, ReportModel: TestReport, AuditModel: TestAudit, NotificationModel: TestNotification, imageStorage: storage, getDatabaseStatus: () => 'connected' })
  return { app, storage }
}
async function report(values = {}) {
  return TestReport.create({ reportNumber: `SW-${TestReport.records.length + 1}`, reporter: citizenId, description: 'Garbage has accumulated beside the public walkway.', category: 'general_garbage', location: { label: 'Near the north entrance', source: 'manual' }, images: [{ provider: 'cloudinary', assetId: 'source/image', secureUrl: 'https://images.example.test/report.webp', contentType: 'image/png', size: 100 }], status: 'submitted', ...values })
}

test('task APIs enforce roles and workers only see their assigned reports', async () => {
  const { app } = freshApp()
  const own = await report({ status: 'assigned', assignedWorker: workerId })
  await report({ status: 'assigned', assignedWorker: otherWorkerId })
  await request(app).get('/api/v1/tasks/admin/queue').set('Cookie', `${config.cookieName}=${token(workerId)}`).expect(403)
  await auth(request(app).get('/api/v1/tasks/worker/dashboard'), workerId).expect(200).then((res) => assert.equal(res.body.data.stats.assigned, 1))
  await auth(request(app).get(`/api/v1/tasks/worker/tasks/${own._id}`), workerId).expect(200)
  await auth(request(app).get(`/api/v1/tasks/worker/tasks/${own._id}`), otherWorkerId).expect(404)
  await auth(request(app).get('/api/v1/tasks/worker/tasks?page=1&limit=1'), workerId).expect(200).then((res) => assert.equal(res.body.data.pagination.total, 1))
  await auth(request(app).get('/api/v1/tasks/worker/tasks?q=SW-1'), workerId).expect(200).then((res) => assert.equal(res.body.data.pagination.total, 1))
  await auth(request(app).get('/api/v1/tasks/worker/tasks?q=.*'), workerId).expect(400)
  await auth(request(app).get('/api/v1/tasks/worker/dashboard'), citizenId).expect(403)
  await auth(request(app).get('/api/v1/tasks/admin/workers'), workerId).expect(403)
  await auth(request(app).get('/api/v1/tasks/admin/workers'), adminId).expect(200).then((res) => {
    assert.equal(res.body.data.pagination.total, 2)
    assert.equal(res.body.data.items.find((entry) => entry.id === workerId).activeTasks, 1)
  })
})

test('admins assign active workers, record history, and repeated assignment stays idempotent', async () => {
  const { app } = freshApp()
  const item = await report({ status: 'under_review' })
  const body = { workerId, priority: 'high', dueAt: null, reason: '' }
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send({ ...body, workerId: citizenId }), adminId).expect(400)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send({ ...body, workerId: inactiveWorkerId }), adminId).expect(400)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send({ ...body, workerId: otherCitizenId }), adminId).expect(400)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send(body), workerId).expect(403)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send(body), adminId).expect(200)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send(body), adminId).expect(200)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send({ ...body, priority: 'urgent' }), adminId).expect(200)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send({ ...body, priority: 'urgent' }), adminId).expect(200)
  assert.equal(item.assignedWorker, workerId)
  assert.equal(item.priority, 'urgent')
  assert.equal(item.assignmentHistory.length, 2)
  assert.equal(item.assignmentHistory[1].action, 'assignment_updated')
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send({ ...body, workerId: otherWorkerId, priority: 'urgent' }), adminId).expect(400)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/assign`).send({ ...body, workerId: otherWorkerId, priority: 'urgent', reason: 'Move to another worker due to capacity.' }), adminId).expect(200)
  assert.equal(item.assignedWorker, otherWorkerId)
  assert.equal(item.assignmentHistory.at(-1).action, 'reassigned')
  await auth(request(app).get(`/api/v1/tasks/admin/${item._id}/history`), adminId).expect(200).then((res) => {
    assert.equal(res.body.data.history.length, 3)
    assert.equal(res.body.data.history[0].actorName, 'Operations Admin')
    assert.equal(res.body.data.history[0].toWorkerName, 'Worker One')
  })
})

test('workers accept only their tasks, add validated notes and evidence, then submit for verification', async () => {
  const { app } = freshApp()
  const item = await report({ status: 'assigned', assignedWorker: workerId, assignedAt: new Date(), assignmentStatus: 'active' })
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/accept`).send({}), otherWorkerId).expect(404)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/evidence`).attach('image', png, { filename: 'evidence.png', contentType: 'image/png' }), otherWorkerId).expect(404)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/accept`).send({}), workerId).expect(200)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/notes`).send({ body: 'Cleared the walkway and checked nearby bins.' }), workerId).expect(201)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/submit`).send({}), workerId).expect(400)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/evidence`).attach('image', Buffer.from('not-image'), { filename: 'evidence.jpg', contentType: 'image/jpeg' }), workerId).expect(415)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/evidence`).attach('image', png, { filename: 'evidence.png', contentType: 'image/png' }), workerId).expect(201)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/submit`).send({}), workerId).expect(200)
  assert.equal(item.status, 'submitted_for_verification')
  assert.equal(item.progressNotes.length, 1)
  assert.equal(item.completionEvidence.length, 1)
  assert.ok(item.assignmentHistory.some((event) => event.action === 'submitted_for_verification'))
})

test('only administrators can verify completion and return work with a reason', async () => {
  const { app } = freshApp()
  const item = await report({ status: 'submitted_for_verification', assignedWorker: workerId, assignmentStatus: 'submitted_for_verification', completionEvidence: [{ provider: 'cloudinary', assetId: 'evidence/1', secureUrl: 'https://images.example.test/evidence.webp', contentType: 'image/png', size: 100 }] })
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/approve`).send({}), workerId).expect(403)
  await auth(request(app).post(`/api/v1/tasks/admin/${item._id}/return`).send({ reason: 'The surrounding area still needs one more cleanup pass.' }), adminId).expect(200)
  assert.equal(item.status, 'in_progress')
  assert.equal(item.assignmentStatus, 'needs_work')
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/submit`).send({}), workerId).expect(400)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/evidence`).attach('image', png, { filename: 'new-evidence.png', contentType: 'image/png' }), workerId).expect(201)
  await auth(request(app).post(`/api/v1/tasks/worker/tasks/${item._id}/submit`).send({}), workerId).expect(200)
  const second = await report({ status: 'submitted_for_verification', assignedWorker: workerId, assignmentStatus: 'submitted_for_verification', completionEvidence: [{ provider: 'cloudinary', assetId: 'evidence/2', secureUrl: 'https://images.example.test/evidence2.webp', contentType: 'image/png', size: 100 }] })
  await auth(request(app).post(`/api/v1/tasks/admin/${second._id}/approve`).send({}), adminId).expect(200)
  assert.equal(second.status, 'resolved')
  assert.equal(second.assignmentStatus, 'completed')
})
