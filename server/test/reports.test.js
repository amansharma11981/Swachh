import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { transitionReportStatus } from '../src/services/reportService.js'

const config = {
  port: 5000, nodeEnv: 'test', jwtSecret: 'report-test-secret-with-more-than-thirty-two-characters', jwtExpiresIn: '2h',
  cookieMaxAge: 7_200_000, cookieName: 'swachhai_session', cookieSecure: false, clientOrigins: ['http://localhost:5173'], maxImageSizeBytes: 5 * 1024 * 1024,
}
const origin = 'http://localhost:5173'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1sAAAAASUVORK5CYII=', 'base64')
const citizenId = new mongoose.Types.ObjectId().toString()
const secondCitizenId = new mongoose.Types.ObjectId().toString()
const adminId = new mongoose.Types.ObjectId().toString()
const workerId = new mongoose.Types.ObjectId().toString()

class TestUser {
  static records = new Map()
  static async findSafeById(id) { return this.records.get(String(id)) || null }
  static find(filter) { const rows = [...this.records.values()].filter((user) => matches(user, filter)); return { select() { return this }, lean: async () => rows.map((user) => ({ _id: user._id })) } }
}
TestUser.records = new Map([
  [citizenId, { _id: citizenId, id: citizenId, name: 'Citizen One', role: 'citizen', isActive: true }],
  [secondCitizenId, { _id: secondCitizenId, id: secondCitizenId, name: 'Citizen Two', role: 'citizen', isActive: true }],
  [adminId, { _id: adminId, id: adminId, name: 'Admin', role: 'admin', isActive: true }],
  [workerId, { _id: workerId, id: workerId, name: 'Worker', role: 'worker', isActive: true }],
])

const plain = (value) => {
  if (!value) return null
  const clone = { ...value }
  delete clone.save
  return structuredClone(clone)
}
const getPath = (record, path) => path.split('.').reduce((value, key) => value?.[key], record)
const matches = (record, filter) => Object.entries(filter).every(([key, expected]) => {
  if (key === '$or') return expected.some((branch) => matches(record, branch))
  const actual = getPath(record, key)
  if (expected instanceof RegExp) return expected.test(String(actual || ''))
  if (expected && typeof expected === 'object') {
    if ('$exists' in expected) return (actual !== undefined) === expected.$exists
    if ('$in' in expected && !expected.$in.includes(actual)) return false
    if ('$ne' in expected && String(actual) === String(expected.$ne)) return false
    if ('$nin' in expected && expected.$nin.includes(actual)) return false
    if ('$gte' in expected && !(new Date(actual) >= new Date(expected.$gte))) return false
    if ('$lte' in expected && !(new Date(actual) <= new Date(expected.$lte))) return false
    return true
  }
  return String(actual ?? '') === String(expected ?? '')
})

class TestZone {
  static records = [
    { zoneId: 'nit-more', name: 'NIT More Street-Food Lane', isActive: true, boundaryVerified: false },
  ]
  static findOne(filter) { return { lean: async () => plain(this.records.find((zone) => matches(zone, filter))) } }
  static find(filter) { return { sort() { return this }, lean: async () => this.records.filter((zone) => matches(zone, filter)).map(plain) } }
}

class TestCounter {
  static sequence = 0
  static async findOneAndUpdate() { return { sequence: ++this.sequence } }
}

class TestAudit {
  static records = []
  static async create(values) { const event = { ...values, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date() }; this.records.push(event); return event }
  static find() { const query = { sort() { return this }, limit() { return this }, lean: async () => this.records }; return query }
}
class TestNotification { static async updateOne() { return { upsertedCount: 1 } } }

class TestReport {
  static records = []
  static failCreate = false
  static async create(values) {
    if (this.failCreate) throw new Error('simulated database write failure')
    const report = { ...values, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date(), updatedAt: new Date() }
    report.save = async function save() { this.updatedAt = new Date(); return this }
    this.records.push(report)
    return report
  }
  static find(filter) {
    const query = { offset: 0, count: Number.POSITIVE_INFINITY, sort() { return this }, select() { return this }, skip(value) { this.offset = value; return this }, limit(value) { this.count = value; return this }, lean: async () => this.records.filter((record) => matches(record, filter)).sort((a, b) => b.createdAt - a.createdAt).slice(query.offset, query.offset + query.count).map(plain) }
    return query
  }
  static async countDocuments(filter) { return this.records.filter((record) => matches(record, filter)).length }
  static findById(id) {
    const record = this.records.find((item) => String(item._id) === String(id)) || null
    return { select() { return this }, lean: async () => plain(record), then(resolve, reject) { return Promise.resolve(record).then(resolve, reject) } }
  }
}

function tokenFor(id, role) {
  return jwt.sign({ role }, config.jwtSecret, { subject: id, issuer: 'swachhai-api', audience: 'swachhai-web', expiresIn: '2h' })
}

function freshApp({ storageEnabled = true, maxFileSizeBytes = config.maxImageSizeBytes, aiAnalysisService } = {}) {
  TestReport.records = []; TestReport.failCreate = false; TestCounter.sequence = 0; TestAudit.records = []
  const removed = []
  const imageStorage = {
    enabled: storageEnabled,
    async upload(buffer, { contentType }) { return { provider: 'cloudinary', assetId: `test/${buffer.length}`, secureUrl: 'https://images.example.test/report.webp', contentType, size: buffer.length, uploadedAt: new Date() } },
    async remove(assetId) { removed.push(assetId) },
  }
  const app = createApp({
    config: { ...config, maxImageSizeBytes: maxFileSizeBytes }, UserModel: TestUser, ReportModel: TestReport, CounterModel: TestCounter, ZoneModel: TestZone, AuditModel: TestAudit, NotificationModel: TestNotification,
    imageStorage, getDatabaseStatus: () => 'connected', ...(aiAnalysisService ? { aiAnalysisService } : {}),
  })
  return { app, imageStorage, removed }
}

function asCitizen(call, id = citizenId) {
  return call.set('Origin', origin).set('Cookie', `${config.cookieName}=${tokenFor(id, 'citizen')}`)
}
function asRole(call, id, role) { return call.set('Origin', origin).set('Cookie', `${config.cookieName}=${tokenFor(id, role)}`) }
function submitReport(app, { id = citizenId, attach = true, fields = {} } = {}) {
  const call = asCitizen(request(app).post('/api/v1/reports'), id)
  if (attach) call.attach('image', png, { filename: 'issue.png', contentType: 'image/png' })
  const values = {
    description: 'Waste is accumulating beside the public walkway near the entrance.',
    category: 'general_garbage', locationLabel: 'Near the north entrance', source: 'manual', latitude: '25.62', longitude: '85.17',
    ...fields,
  }
  for (const [key, value] of Object.entries(values)) call.field(key, value)
  return call
}

test('citizen report creation stores validated data, initial status history, coordinates, and zone', async () => {
  const { app } = freshApp()
  const response = await submitReport(app, { fields: { zoneId: 'nit-more' } }).expect(201)
  const report = response.body.data.report
  assert.match(report.reportNumber, /^SW-000001$/)
  assert.equal(report.reporter, citizenId)
  assert.equal(report.status, 'submitted')
  assert.equal(report.priority, 'normal')
  assert.deepEqual(report.location.point.coordinates, [85.17, 25.62])
  assert.deepEqual(report.zone, { zoneId: 'nit-more', name: 'NIT More Street-Food Lane', boundaryVerified: false })
  assert.equal(report.statusHistory.length, 1)
  assert.equal(report.statusHistory[0].toStatus, 'submitted')
  assert.equal(report.statusHistory[0].actor, citizenId)
  assert.equal('passwordHash' in report, false)
})

test('report creation requires authentication and an attached real supported image', async () => {
  const { app } = freshApp()
  await request(app).post('/api/v1/reports').set('Origin', origin).expect(401)
  await submitReport(app, { attach: false }).expect(400)
  await submitReport(app, { fields: { description: 'too short' } }).expect(400)
  const spoofedImage = asCitizen(request(app).post('/api/v1/reports')).attach('image', Buffer.from('not an image'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
  await spoofedImage.field('description', 'A sufficiently detailed description of a cleanliness problem.')
    .field('category', 'general_garbage').field('locationLabel', 'Near the north entrance').expect(415)
  assert.equal(TestReport.records.length, 0)
})

test('image limits, coordinates, zones, and untrusted report fields are rejected', async () => {
  const sizeApp = freshApp({ maxFileSizeBytes: 64 }).app
  await submitReport(sizeApp).expect(400)
  const { app } = freshApp()
  await submitReport(app, { fields: { latitude: '91' } }).expect(400)
  await submitReport(app, { fields: { latitude: '25.6', longitude: '' } }).expect(400)
  await submitReport(app, { fields: { zoneId: 'made-up-zone' } }).expect(400)
  await submitReport(app, { fields: { reporter: secondCitizenId } }).expect(400)
  await submitReport(app, { fields: { status: 'resolved' } }).expect(400)
  assert.equal(TestReport.records.length, 0)
})

test('report creation rejects unavailable storage and cleans up an uploaded orphan on database failure', async () => {
  const unavailable = freshApp({ storageEnabled: false })
  await submitReport(unavailable.app).expect(503)
  const failing = freshApp()
  TestReport.failCreate = true
  await submitReport(failing.app).expect(500)
  assert.equal(failing.removed.length, 1)
})

test('citizens only see their own reports; history pagination and status filtering work', async () => {
  const { app } = freshApp()
  const create = async (id, status, reportNumber) => {
    const report = await TestReport.create({ reportNumber, reporter: id, description: 'A sufficiently detailed issue description.', category: 'plastic_waste', location: { label: 'Near campus', source: 'manual' }, images: [], status, priority: 'normal', statusHistory: [] })
    return report
  }
  const ownOne = await create(citizenId, 'submitted', 'SW-000010')
  await create(citizenId, 'assigned', 'SW-000009')
  await create(citizenId, 'resolved', 'SW-000011')
  await create(secondCitizenId, 'submitted', 'SW-000012')
  await asCitizen(request(app).get('/api/v1/reports/my?page=1&limit=1')).expect(200).then((response) => {
    assert.equal(response.body.data.items.length, 1)
    assert.equal(response.body.data.pagination.total, 3)
    assert.equal(response.body.data.pagination.pages, 3)
  })
  const filtered = await asCitizen(request(app).get('/api/v1/reports/my?status=resolved')).expect(200)
  assert.deepEqual(filtered.body.data.items.map((report) => report.reportNumber), ['SW-000011'])
  const active = await asCitizen(request(app).get('/api/v1/reports/my?status=in_progress')).expect(200)
  assert.deepEqual(active.body.data.items.map((report) => report.reportNumber), ['SW-000009'])
  await asCitizen(request(app).get('/api/v1/reports/my?status=not-a-status')).expect(400)
  await asCitizen(request(app).get(`/api/v1/reports/${ownOne._id}`)).expect(200)
  await asCitizen(request(app).get(`/api/v1/reports/${ownOne._id}`), secondCitizenId).expect(404)
  await asCitizen(request(app).get('/api/v1/reports')).expect(403)
})

test('dashboard totals come from persisted records and only admins may list all reports', async () => {
  const { app } = freshApp()
  await TestReport.create({ reportNumber: 'SW-20', reporter: citizenId, status: 'submitted', createdAt: new Date(), description: 'Description for the first report.', category: 'other', location: { label: 'Block A', source: 'manual' }, images: [], statusHistory: [] })
  await TestReport.create({ reportNumber: 'SW-21', reporter: citizenId, status: 'in_progress', createdAt: new Date(), description: 'Description for the second report.', category: 'other', location: { label: 'Block B', source: 'manual' }, images: [], statusHistory: [] })
  await TestReport.create({ reportNumber: 'SW-22', reporter: secondCitizenId, status: 'resolved', createdAt: new Date(), description: 'Description from another account.', category: 'other', location: { label: 'Block C', source: 'manual' }, images: [], statusHistory: [] })
  const stats = await asCitizen(request(app).get('/api/v1/reports/dashboard')).expect(200)
  assert.deepEqual(stats.body.data.stats, { total: 2, awaitingReview: 1, inProgress: 1, resolved: 0 })
  assert.equal(stats.body.data.recent.length, 2)
  const admin = request(app).get('/api/v1/reports').set('Cookie', `${config.cookieName}=${tokenFor(adminId, 'admin')}`)
  await admin.expect(200)
})

test('map endpoint returns only role-authorized reports and omits reporter identity', async () => {
  const { app } = freshApp()
  const first = await submitReport(app).expect(201)
  await submitReport(app, { id: secondCitizenId }).expect(201)
  const assigned = await TestReport.create({ reportNumber: 'SW-WORKER', reporter: secondCitizenId, assignedWorker: workerId, description: 'Waste is gathered near the service entrance.', category: 'general_garbage', location: { label: 'Service entry', source: 'manual', point: { type: 'Point', coordinates: [85.18, 25.63] } }, images: [], status: 'assigned', priority: 'normal' })
  const citizenMap = await asCitizen(request(app).get('/api/v1/reports/map')).expect(200)
  assert.equal(citizenMap.body.data.total, 1)
  assert.equal(citizenMap.body.data.items[0].id, first.body.data.report.id)
  assert.equal('reporter' in citizenMap.body.data.items[0], false)
  const workerMap = await asRole(request(app).get('/api/v1/reports/map'), workerId, 'worker').expect(200)
  assert.deepEqual(workerMap.body.data.items.map((item) => item.id), [String(assigned._id)])
  const adminMap = await asRole(request(app).get('/api/v1/reports/map'), adminId, 'admin').expect(200)
  assert.equal(adminMap.body.data.total, 3)
})

test('admin moderation validates workflow, persists corrections, hides internal notes from citizens, and audits changes', async () => {
  const { app } = freshApp()
  const created = await submitReport(app).expect(201)
  const id = created.body.data.report.id
  const payload = { category: 'public_area_litter', priority: 'high', status: 'under_review', note: 'Please confirm the exact affected area.' }
  await asCitizen(request(app).patch(`/api/v1/reports/admin/${id}/moderate`).send(payload)).expect(403)
  const reviewed = await asRole(request(app).patch(`/api/v1/reports/admin/${id}/moderate`).send(payload), adminId, 'admin').expect(200)
  assert.equal(reviewed.body.data.report.category, 'public_area_litter')
  assert.equal(reviewed.body.data.report.priority, 'high')
  assert.equal(reviewed.body.data.report.status, 'under_review')
  assert.equal(reviewed.body.data.report.moderationNotes.length, 1)
  assert.equal(TestAudit.records[0].action, 'report_moderated')
  const citizenDetail = await asCitizen(request(app).get(`/api/v1/reports/${id}`)).expect(200)
  assert.equal('moderationNotes' in citizenDetail.body.data.report, false)
  await asRole(request(app).patch(`/api/v1/reports/admin/${id}/moderate`).send({ status: 'resolved' }), adminId, 'admin').expect(409)
})

test('AI analysis is opt-in, signed to the image and description, and remains separate from approved report values', async () => {
  const analysis = { provider: 'groq', model: 'qwen/qwen3.8-27b', status: 'completed', suggestedCategory: 'plastic_waste', suggestedPriority: 'high', summary: 'Loose plastic litter is visible beside the path.', priorityRationale: 'Several pieces are spread over a public walkway.', recommendedAction: 'Review the affected path and arrange collection.', confidence: null }
  const aiAnalysisService = { configured: true, async analyze(input) { assert.equal(input.contentType, 'image/png'); assert.equal(input.description, 'Waste has gathered beside the public walkway.'); return analysis } }
  const { app } = freshApp({ aiAnalysisService })
  const result = await asCitizen(request(app).post('/api/v1/reports/analyze')).attach('image', png, { filename: 'issue.png', contentType: 'image/png' }).field('description', 'Waste has gathered beside the public walkway.').expect(200)
  assert.equal(result.body.data.analysis.suggestedCategory, 'plastic_waste')
  assert.equal(result.body.data.analysis.confidence, null)
  const description = 'Waste has gathered beside the public walkway.'
  const created = await submitReport(app, { fields: { description, analysisToken: result.body.data.analysisToken, category: 'other' } }).expect(201)
  assert.equal(created.body.data.report.category, 'other')
  assert.equal(created.body.data.report.priority, 'normal')
  assert.equal(created.body.data.report.aiAnalysis.suggestedCategory, 'plastic_waste')
  const stale = await submitReport(app, { fields: { description: 'A different description for the same image.', analysisToken: result.body.data.analysisToken } }).expect(201)
  assert.equal('aiAnalysis' in stale.body.data.report, false)
})

test('missing AI configuration returns a manual-submission fallback', async () => {
  const { app } = freshApp()
  await asCitizen(request(app).post('/api/v1/reports/analyze')).attach('image', png, { filename: 'issue.png', contentType: 'image/png' }).field('description', 'Waste is present near this entrance.').expect(503)
  await submitReport(app).expect(201)
})

test('status transition service records actor history and rejects citizen-style jumps', async () => {
  const report = { status: 'submitted', resolvedAt: null, statusHistory: [], save: async function save() { return this } }
  await assert.rejects(transitionReportStatus({ report, toStatus: 'resolved', actorId: adminId }), { code: 'INVALID_STATUS_TRANSITION' })
  const updated = await transitionReportStatus({ report, toStatus: 'under_review', actorId: adminId, note: 'Review started' })
  assert.equal(updated.status, 'under_review')
  assert.deepEqual(updated.statusHistory[0], { fromStatus: 'submitted', toStatus: 'under_review', actor: adminId, timestamp: updated.statusHistory[0].timestamp, note: 'Review started' })
})
