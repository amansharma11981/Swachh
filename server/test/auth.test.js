import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { createApp } from '../src/app.js'

const config = {
  port: 5000, nodeEnv: 'test', jwtSecret: 'this-is-a-test-secret-that-is-at-least-32-characters-long', jwtExpiresIn: '2h',
  cookieMaxAge: 7_200_000, cookieName: 'swachhai_session', cookieSecure: false, clientOrigins: ['http://localhost:5173'],
}

class TestUser {
  constructor(values) { Object.assign(this, values); this._id ||= this.id }
  toObject() { const { id, ...rest } = this; return { ...rest, _id: this._id } }
  async verifyPassword(password) { return bcrypt.compare(password, this.passwordHash) }
  async save() { TestUser.records.set(String(this._id), this); return this }
}
TestUser.records = new Map()
TestUser.nextId = 1
TestUser.create = async (values) => {
  if ([...TestUser.records.values()].some((user) => user.email === values.email)) { const error = new Error('duplicate'); error.code = 11000; throw error }
  const user = new TestUser({ ...values, id: String(TestUser.nextId++), isActive: values.isActive ?? true, createdAt: new Date(), updatedAt: new Date() })
  await user.save(); return user
}
TestUser.findByEmail = async (email) => [...TestUser.records.values()].find((user) => user.email === email) || null
TestUser.findSafeById = async (id) => TestUser.records.get(String(id)) || null
TestUser.countDocuments = async (query) => [...TestUser.records.values()].filter((user) => Object.entries(query).every(([key, value]) => user[key] === value)).length
TestUser.find = (query = {}) => ({
  sort() { return this }, limit() { return this }, select() { return this },
  lean: async () => [...TestUser.records.values()].filter((user) => Object.entries(query).every(([key, value]) => (
    value && typeof value === 'object' && '$in' in value ? value.$in.includes(user[key]) : user[key] === value
  ))).map((user) => user.toObject()),
})

class TestAudit { static async create(values) { return values } }

function freshApp() {
  TestUser.records = new Map(); TestUser.nextId = 1
  return { app: createApp({ config, UserModel: TestUser, AuditModel: TestAudit, getDatabaseStatus: () => 'connected' }), model: TestUser }
}
const origin = (call) => call.set('Origin', config.clientOrigins[0])
const registerPayload = (overrides = {}) => ({ name: 'Aman Singh', email: 'Aman@Example.test', password: 'CleanCity2026!', confirmPassword: 'CleanCity2026!', ...overrides })

test('registration creates a citizen, hashes the password, and returns a safe session', async () => {
  const { app, model } = freshApp()
  const response = await origin(request(app).post('/api/v1/auth/register').send(registerPayload())).expect(201)
  assert.equal(response.body.data.user.email, 'aman@example.test')
  assert.equal(response.body.data.user.role, 'citizen')
  assert.equal('passwordHash' in response.body.data.user, false)
  assert.notEqual([...model.records.values()][0].passwordHash, 'CleanCity2026!')
  assert.equal(await bcrypt.compare('CleanCity2026!', [...model.records.values()][0].passwordHash), true)
  assert.match(response.headers['set-cookie'][0], /HttpOnly/i)
  assert.match(response.headers['set-cookie'][0], /SameSite=Lax/i)
})

test('registration validates inputs and refuses attempted role escalation', async () => {
  const { app, model } = freshApp()
  await origin(request(app).post('/api/v1/auth/register').send(registerPayload({ email: 'bad' }))).expect(400)
  await origin(request(app).post('/api/v1/auth/register').send(registerPayload({ password: 'Abcd123', confirmPassword: 'Abcd123' }))).expect(400)
  await origin(request(app).post('/api/v1/auth/register').send(registerPayload({ role: 'admin' }))).expect(400)
  assert.equal(model.records.size, 0)
})

test('worker and admin registration requests remain inactive until an admin approves them', async () => {
  const { app, model } = freshApp()
  const workerResponse = await origin(request(app).post('/api/v1/auth/register').send(registerPayload({ requestedRole: 'worker' }))).expect(202)
  assert.equal(workerResponse.body.data.approvalRequired, true)
  assert.equal(workerResponse.headers['set-cookie'], undefined)
  assert.equal(workerResponse.body.data.user.role, 'citizen')
  assert.equal(workerResponse.body.data.user.requestedRole, 'worker')
  assert.equal(workerResponse.body.data.user.approvalStatus, 'pending')
  assert.equal(workerResponse.body.data.user.isActive, false)
  const adminRequest = await origin(request(app).post('/api/v1/auth/register').send(registerPayload({ email: 'new-admin@example.test', requestedRole: 'admin' }))).expect(202)
  assert.equal(adminRequest.body.data.user.requestedRole, 'admin')
  assert.equal(model.records.size, 2)

  const administrator = await model.create({ name: 'Administrator', email: 'admin@example.test', passwordHash: await bcrypt.hash('SafeAdminPassword!', 12), role: 'admin' })
  const administratorToken = jwt.sign({}, config.jwtSecret, { subject: administrator.id, expiresIn: '2h', issuer: 'swachhai-api', audience: 'swachhai-web' })
  const requestAgent = request.agent(app)
  const queue = await origin(requestAgent.get('/api/v1/users/approval-requests').set('Cookie', `${config.cookieName}=${administratorToken}`)).expect(200)
  assert.equal(queue.body.data.requests.length, 2)
  await origin(requestAgent.patch(`/api/v1/users/${workerResponse.body.data.user.id}/approval`).set('Cookie', `${config.cookieName}=${administratorToken}`).send({ decision: 'approve' })).expect(200)
  const approvedWorker = model.records.get(workerResponse.body.data.user.id)
  assert.equal(approvedWorker.role, 'worker')
  assert.equal(approvedWorker.isActive, true)
  assert.equal(approvedWorker.approvalStatus, 'approved')
})

test('an eight-character password can register and then log in', async () => {
  const { app } = freshApp()
  const agent = request.agent(app)
  const payload = registerPayload({ password: 'Abcd123!', confirmPassword: 'Abcd123!' })
  await origin(agent.post('/api/v1/auth/register').send(payload)).expect(201)
  await origin(agent.post('/api/v1/auth/logout').send({})).expect(200)
  const login = await origin(agent.post('/api/v1/auth/login').send({ email: payload.email, password: payload.password })).expect(200)
  assert.equal(login.body.data.user.email, 'aman@example.test')
  assert.match(login.headers['set-cookie'][0], /HttpOnly/i)
  const session = await agent.get('/api/v1/auth/me').expect(200)
  assert.equal(session.body.data.user.email, 'aman@example.test')
})

test('duplicate email is safe and case-insensitive', async () => {
  const { app } = freshApp()
  await origin(request(app).post('/api/v1/auth/register').send(registerPayload())).expect(201)
  const duplicate = await origin(request(app).post('/api/v1/auth/register').send(registerPayload({ email: 'AMAN@example.test' }))).expect(409)
  assert.equal(duplicate.body.error.code, 'EMAIL_IN_USE')
})

test('login errors are generic for unknown users and wrong passwords; inactive users are rejected', async () => {
  const { app, model } = freshApp()
  const unknown = await origin(request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.test', password: 'wrong-password' })).expect(401)
  await model.create({ name: 'Aman Singh', email: 'aman@example.test', passwordHash: await bcrypt.hash('CleanCity2026!', 12), role: 'citizen' })
  const wrong = await origin(request(app).post('/api/v1/auth/login').send({ email: 'aman@example.test', password: 'wrong-password' })).expect(401)
  assert.equal(unknown.body.error.message, wrong.body.error.message)
  const inactive = await model.create({ name: 'Off User', email: 'off@example.test', passwordHash: await bcrypt.hash('CleanCity2026!', 12), role: 'citizen', isActive: false })
  await origin(request(app).post('/api/v1/auth/login').send({ email: inactive.email, password: 'CleanCity2026!' })).expect(401)
})

test('session restoration, profile updates, role protection, and repeated logout work', async () => {
  const { app } = freshApp()
  const agent = request.agent(app)
  await origin(agent.post('/api/v1/auth/register').send(registerPayload())).expect(201)
  const me = await agent.get('/api/v1/auth/me').expect(200)
  assert.equal(me.body.data.user.role, 'citizen')
  await origin(agent.patch('/api/v1/users/me').send({ name: 'Aman S.' })).expect(200)
  await origin(agent.patch('/api/v1/users/me').send({ role: 'admin' })).expect(400)
  await agent.get('/api/v1/users').expect(403)
  await origin(agent.post('/api/v1/auth/logout').send({})).expect(200)
  await origin(agent.post('/api/v1/auth/logout').send({})).expect(200)
  await agent.get('/api/v1/auth/me').expect(401)
})

test('worker is denied admin routes and admin can access user administration', async () => {
  const { app, model } = freshApp()
  const worker = await model.create({ name: 'Field Worker', email: 'worker@example.test', passwordHash: await bcrypt.hash('CleanCity2026!', 12), role: 'worker' })
  const admin = await model.create({ name: 'Project Admin', email: 'admin@example.test', passwordHash: await bcrypt.hash('CleanCity2026!', 12), role: 'admin' })
  const workerToken = jwt.sign({}, config.jwtSecret, { subject: worker.id, expiresIn: '2h', issuer: 'swachhai-api', audience: 'swachhai-web' })
  const adminToken = jwt.sign({}, config.jwtSecret, { subject: admin.id, expiresIn: '2h', issuer: 'swachhai-api', audience: 'swachhai-web' })
  await request(app).get('/api/v1/users').set('Cookie', `${config.cookieName}=${workerToken}`).expect(403)
  await request(app).get('/api/v1/users').set('Cookie', `${config.cookieName}=${adminToken}`).expect(200)
})

test('invalid and expired tokens are unauthorized; unsafe cross-origin mutations are blocked', async () => {
  const { app, model } = freshApp()
  const user = await model.create({ name: 'Aman Singh', email: 'aman@example.test', passwordHash: await bcrypt.hash('CleanCity2026!', 12), role: 'citizen' })
  const expired = jwt.sign({}, config.jwtSecret, { subject: user.id, expiresIn: -1, issuer: 'swachhai-api', audience: 'swachhai-web' })
  await request(app).get('/api/v1/auth/me').set('Cookie', `${config.cookieName}=bad-token`).expect(401)
  await request(app).get('/api/v1/auth/me').set('Cookie', `${config.cookieName}=${expired}`).expect(401)
  await request(app).post('/api/v1/auth/register').send(registerPayload()).expect(403)
  await request(app).post('/api/v1/auth/register').set('Origin', 'https://attacker.example').send(registerPayload()).expect(403)
})

test('health endpoint reports status without infrastructure details', async () => {
  const { app } = freshApp()
  const response = await request(app).get('/api/v1/health').expect(200)
  assert.equal(response.body.data.database, 'connected')
  assert.equal('mongoUri' in response.body.data, false)
})
