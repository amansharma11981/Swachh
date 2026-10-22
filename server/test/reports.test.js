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

class TestUser {
  static records = new Map()
  static async findSafeById(id) { return this.records.get(String(id)) || null }
}
TestUser.records = new Map([
  [citizenId, { _id: citizenId, id: citizenId, name: 'Citizen One', role: 'citizen', isActive: true }],
  [secondCitizenId, { _id: secondCitizenId, id: secondCitizenId, name: 'Citizen Two', role: 'citizen', isActive: true }],
  [adminId, { _id: adminId, id: adminId, name: 'Admin', role: 'admin', isActive: true }],
])

const plain = (value) => {
  if (!value) return null
  const clone = { ...value }
  delete clone.save
  return structuredClone(clone)
}
const matches = (record, filter) => Object.entries(filter).every(([key, expected]) => expected && typeof expected === 'object' && '$in' in expected
  ? expected.$in.includes(record[key])
  : record[key] === expected)

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
    const query = { offset: 0, count: Number.POSITIVE_INFINITY, sort() { return this }, skip(value) { this.offset = value; return this }, limit(value) { this.count = value; return this }, lean: async () => this.records.filter((record) => matches(record, filter)).sort((a, b) => b.createdAt - a.createdAt).slice(query.offset, query.offset + query.count).map(plain) }
    return query
  }
  static async countDocuments(filter) { return this.records.filter((record) => matches(record, filter)).length }
  static findById(id) {
    const record = this.records.find((item) => String(item._id) === String(id)) || null
    return { lean: async () => plain(record), then(resolve, reject) { return Promise.resolve(record).then(resolve, reject) } }
  }
}

function tokenFor(id, role) {
  return jwt.sign({ role }, config.jwtSecret, { subject: id, issuer: 'swachhai-api', audience: 'swachhai-web', expiresIn: '2h' })
}

function freshApp({ storageEnabled = true, maxFileSizeBytes = config.maxImageSizeBytes } = {}) {
  TestReport.records = []; TestReport.failCreate = false; TestCounter.sequence = 0
  const removed = []
  const imageStorage = {
    enabled: storageEnabled,
    async upload(buffer, { contentType }) { return { provider: 'cloudinary', assetId: `test/${buffer.length}`, secureUrl: 'https://images.example.test/report.webp', contentType, size: buffer.length, uploadedAt: new Date() } },
    async remove(assetId) { removed.push(assetId) },
  }
  const app = createApp({
    config: { ...config, maxImageSizeBytes: maxFileSizeBytes }, UserModel: TestUser, ReportModel: TestReport, CounterModel: TestCounter, ZoneModel: TestZone,
    imageStorage, getDatabaseStatus: () => 'connected',
  })
  return { app, imageStorage, removed }
}

function asCitizen(call, id = citizenId) {
  return call.set('Origin', origin).set('Cookie', `${config.cookieName}=${tokenFor(id, 'citizen')}`)
}
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

test('status transition service records actor history and rejects citizen-style jumps', async () => {
  const report = { status: 'submitted', resolvedAt: null, statusHistory: [], save: async function save() { return this } }
  await assert.rejects(transitionReportStatus({ report, toStatus: 'resolved', actorId: adminId }), { code: 'INVALID_STATUS_TRANSITION' })
  const updated = await transitionReportStatus({ report, toStatus: 'under_review', actorId: adminId, note: 'Review started' })
  assert.equal(updated.status, 'under_review')
  assert.deepEqual(updated.statusHistory[0], { fromStatus: 'submitted', toStatus: 'under_review', actor: adminId, timestamp: updated.statusHistory[0].timestamp, note: 'Review started' })
})
