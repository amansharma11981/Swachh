import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import mongoose from 'mongoose'
import { AuditLog } from '../src/models/AuditLog.js'
import { createApp } from '../src/app.js'
import { recommendationPeriod, buildRecommendationEvidence } from '../src/services/recommendationService.js'
import { recommendationController } from '../src/controllers/recommendationController.js'
import { assistantController } from '../src/controllers/assistantController.js'

test('recommendation period defaults to thirty days and rejects invalid ranges', () => {
  const now = new Date('2026-10-27T12:00:00.000Z')
  const period = recommendationPeriod({}, now)
  assert.equal(period.end.toISOString(), now.toISOString())
  assert.equal(period.start.toISOString(), '2026-09-27T12:00:00.000Z')
  assert.equal(period.previousEnd.toISOString(), period.start.toISOString())
  assert.throws(() => recommendationPeriod({ from: '2026-10-28', to: '2026-10-27' }, now), /reporting period/i)
  assert.throws(() => recommendationPeriod({ from: 'invalid' }, now), /invalid/i)
})

test('recommendation evidence computes unresolved counts independently of the selected status', async () => {
  const countFilters = []
  const ReportModel = {
    countDocuments(filter) { countFilters.push(filter); return Promise.resolve([5, 3, 4, 4][countFilters.length - 1]) },
    aggregate() { return Promise.resolve([]) },
  }
  const snapshot = await buildRecommendationEvidence({ ReportModel, filters: { status: 'resolved' }, now: new Date('2026-10-27T12:00:00Z') })
  assert.equal(snapshot.total, 5)
  assert.equal(snapshot.evidence.find(({ key }) => key === 'unresolved_reports').value, 4)
  assert.equal(countFilters[2].status.$nin.includes('resolved'), true)
})

test('recommendations save only model text grounded in supplied aggregate evidence', async () => {
  let saved
  let sentToModel
  const evidenceKey = 'total_reports'
  const ReportModel = { countDocuments: (() => { let index = 0; return async () => [3, 0, 2, 0][index++] })(), aggregate: async () => [] }
  const RecommendationModel = { create: async (value) => (saved = { _id: 'run-1', ...value }) }
  const aiAnalysis = {
    configured: true, model: 'test-model',
    async recommendations(snapshot) {
      sentToModel = snapshot
      return { status: 'completed', content: JSON.stringify({ recommendations: [{ title: 'Review recurring litter', observation: 'Several reports describe litter in a recorded area.', interpretation: 'Repeated submissions may reflect a recurring service need.', suggestedAction: 'Ask the assigned team to inspect the documented area.', limitation: 'Reports do not measure total waste or prove a cause.', priority: 'normal', evidenceKeys: [evidenceKey] }] }) }
    },
  }
  const response = { status(code) { this.code = code; return this }, json(body) { this.body = body; return body } }
  await recommendationController({ ReportModel, RecommendationModel, aiAnalysis }).generate({ validatedBody: {}, user: { id: 'admin-1' } }, response)
  assert.equal(response.code, 201)
  assert.equal(sentToModel.evidence.some(({ key }) => key === evidenceKey), true)
  assert.deepEqual(saved.recommendations[0].evidence.map(({ key }) => key), [evidenceKey])
  assert.equal(saved.generatedBy, 'admin-1')
})

test('unsupported numeric AI claims are rejected before recommendation persistence', async () => {
  let persisted = false
  const ReportModel = { countDocuments: (() => { let index = 0; return async () => [3, 0, 2, 0][index++] })(), aggregate: async () => [] }
  const RecommendationModel = { create: async () => { persisted = true } }
  const aiAnalysis = { configured: true, async recommendations() { return { status: 'completed', content: JSON.stringify({ recommendations: [{ title: 'Review 20 reports', observation: 'Several reports describe litter in a recorded area.', interpretation: 'Repeated submissions may reflect a recurring service need.', suggestedAction: 'Ask the assigned team to inspect the documented area.', limitation: 'Reports do not measure total waste or prove a cause.', priority: 'normal', evidenceKeys: ['total_reports'] }] }) } } }
  const response = { status() { return this }, json() {} }
  await assert.rejects(recommendationController({ ReportModel, RecommendationModel, aiAnalysis }).generate({ validatedBody: {}, user: { id: 'admin-1' } }, response), { code: 'AI_INVALID_RESPONSE' })
  assert.equal(persisted, false)
})

test('assistant complaint drafting returns a reviewable draft without creating a report', async () => {
  let reportCreated = false
  const controller = assistantController({
    ReportModel: { create: async () => { reportCreated = true } },
    aiAnalysis: { configured: true, async draftComplaint() { return { status: 'completed', content: JSON.stringify({ description: 'A pile of mixed waste is visible beside a walkway.', category: 'other', followUpQuestions: ['Where exactly is it located?'] }) } } },
  })
  const response = { json(body) { this.body = body; return body } }
  await controller.draft({ validatedBody: { description: 'There is waste on the walkway' } }, response)
  assert.equal(response.body.data.description, 'A pile of mixed waste is visible beside a walkway.')
  assert.match(response.body.data.note, /not been submitted/i)
  assert.equal(reportCreated, false)
})

test('recommendation history endpoint is restricted to active administrators', async () => {
  const config = { port: 5000, nodeEnv: 'test', jwtSecret: 'test-secret-with-at-least-thirty-two-characters-long', jwtExpiresIn: '2h', cookieMaxAge: 7200000, cookieName: 'swachhai_session', cookieSecure: false, clientOrigins: ['http://localhost:5173'] }
  const users = new Map([
    ['citizen-1', { _id: 'citizen-1', name: 'Citizen', email: 'citizen@example.test', role: 'citizen', isActive: true }],
    ['worker-1', { _id: 'worker-1', name: 'Worker', email: 'worker@example.test', role: 'worker', isActive: true }],
    ['admin-1', { _id: 'admin-1', name: 'Admin', email: 'admin@example.test', role: 'admin', isActive: true }],
  ])
  class TestUser { static async findSafeById(id) { return users.get(id) || null } }
  const app = createApp({ config, UserModel: TestUser, getDatabaseStatus: () => 'connected', imageStorage: {}, RecommendationModel: { find() { return { sort() { return this }, skip() { return this }, limit() { return this }, lean: async () => [] } }, countDocuments: async () => 0 } })
  const session = (id) => jwt.sign({}, config.jwtSecret, { subject: id, expiresIn: '2h', issuer: 'swachhai-api', audience: 'swachhai-web' })
  await request(app).get('/api/v1/recommendations/admin').set('Cookie', `${config.cookieName}=${session('citizen-1')}`).expect(403)
  await request(app).get('/api/v1/recommendations/admin').set('Cookie', `${config.cookieName}=${session('worker-1')}`).expect(403)
  const allowed = await request(app).get('/api/v1/recommendations/admin').set('Cookie', `${config.cookieName}=${session('admin-1')}`).expect(200)
  assert.deepEqual(allowed.body.data.items, [])
})

test('recommendation review events are accepted by the append-only audit schema', async () => {
  const actor = new mongoose.Types.ObjectId()
  const target = new mongoose.Types.ObjectId()
  const event = new AuditLog({ actor, action: 'recommendation_reviewed', targetType: 'RecommendationRun', targetId: target, changes: { status: 'accepted', feedbackLength: 0, actionTakenRecorded: false } })
  await assert.doesNotReject(event.validate())
  const zoneEvent = new AuditLog({ actor, action: 'zone_geofence_updated', targetType: 'Zone', targetId: target, changes: { zoneId: 'campus-west', radiusMeters: 750 } })
  await assert.doesNotReject(zoneEvent.validate())
})

test('recommendation review preserves its recorded action date when the action text is unchanged', async () => {
  const actionTakenAt = new Date('2026-10-01T00:00:00.000Z')
  const run = { _id: '507f1f77bcf86cd799439011', status: 'reviewed', actionTaken: 'Street sweep', actionTakenAt, async save() { return this } }
  let auditEvent
  const controller = recommendationController({
    ReportModel: {}, RecommendationModel: { async findById() { return run } }, aiAnalysis: {},
    AuditModel: { async create(event) { auditEvent = event } },
  })
  const response = { json(body) { this.body = body; return body } }
  await controller.review({ params: { id: run._id }, validatedBody: { status: 'accepted', feedback: 'Approved for action', actionTaken: 'Street sweep' }, user: { id: new mongoose.Types.ObjectId() } }, response)
  assert.equal(run.actionTakenAt, actionTakenAt)
  assert.equal(auditEvent.action, 'recommendation_reviewed')
  assert.equal(auditEvent.targetType, 'RecommendationRun')
  assert.equal(response.body.data.run.status, 'accepted')
})

test('recommendation outcome compares matched status filters in both periods', async () => {
  const actionTakenAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const run = { _id: '507f1f77bcf86cd799439012', actionTakenAt, filters: { status: 'resolved' }, period: { start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } }
  const filters = []
  const controller = recommendationController({
    ReportModel: { countDocuments(filter) { filters.push(filter); return Promise.resolve(2) } },
    RecommendationModel: { findById() { return { lean: async () => run } } }, aiAnalysis: {},
  })
  const response = { json(body) { this.body = body; return body } }
  await controller.outcome({ params: { id: run._id } }, response)
  assert.equal(filters.length, 2)
  assert.equal(filters[0].status, 'resolved')
  assert.equal(filters[1].status, 'resolved')
  assert.equal(response.body.data.interpretation.includes('does not establish'), true)
})

test('admins can save an approximate zone geofence and other roles cannot change it', async () => {
  const config = { port: 5000, nodeEnv: 'test', jwtSecret: 'test-secret-with-at-least-thirty-two-characters-long', jwtExpiresIn: '2h', cookieMaxAge: 7200000, cookieName: 'swachhai_session', cookieSecure: false, clientOrigins: ['http://localhost:5173'] }
  const users = new Map([
    ['citizen-1', { _id: 'citizen-1', name: 'Citizen', email: 'citizen@example.test', role: 'citizen', isActive: true }],
    ['admin-1', { _id: 'admin-1', name: 'Admin', email: 'admin@example.test', role: 'admin', isActive: true }],
  ])
  class TestUser { static async findSafeById(id) { return users.get(id) || null } }
  const zone = { _id: new mongoose.Types.ObjectId(), zoneId: 'campus-west', name: 'Campus west', description: 'Pilot area', isActive: true, boundaryVerified: false, geofence: null }
  const ZoneModel = {
    find() { return { sort() { return this }, lean: async () => [zone] } },
    findOneAndUpdate(filter, update) { Object.assign(zone, update.$set); return { lean: async () => zone } },
  }
  let auditEvent
  const app = createApp({ config, UserModel: TestUser, ZoneModel, AuditModel: { async create(event) { auditEvent = event } }, imageStorage: { enabled: false }, getDatabaseStatus: () => 'connected' })
  const session = (id) => jwt.sign({}, config.jwtSecret, { subject: id, expiresIn: '2h', issuer: 'swachhai-api', audience: 'swachhai-web' })
  const patch = { latitude: 25.62, longitude: 85.17, radiusMeters: 750 }
  await request(app).patch('/api/v1/reports/admin/zones/campus-west/geofence').set('Origin', config.clientOrigins[0]).set('Cookie', `swachhai_session=${session('citizen-1')}`).send(patch).expect(403)
  const saved = await request(app).patch('/api/v1/reports/admin/zones/campus-west/geofence').set('Origin', config.clientOrigins[0]).set('Cookie', `swachhai_session=${session('admin-1')}`).send(patch).expect(200)
  assert.equal(saved.body.data.zone.geofence.radiusMeters, 750)
  assert.equal(auditEvent.action, 'zone_geofence_updated')
  assert.equal(auditEvent.targetType, 'Zone')
})
