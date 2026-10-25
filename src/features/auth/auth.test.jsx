import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthProvider.jsx'
import AuthPage from '../../pages/AuthPage.jsx'
import ProtectedRoute from '../../components/auth/ProtectedRoute.jsx'
import AppLayout from '../../layouts/AppLayout.jsx'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function response(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data }
}

function mount(path) {
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><Routes>
    <Route path="/login" element={<AuthPage mode="login" title="Sign in" />} />
    <Route path="/register" element={<AuthPage mode="register" title="Create account" />} />
    <Route path="/forbidden" element={<div>Forbidden page</div>} />
    <Route path="/app" element={<ProtectedRoute roles={['citizen']}><AppLayout area="app" /></ProtectedRoute>}><Route index element={<div>Citizen dashboard</div>} /></Route>
    <Route path="/worker" element={<ProtectedRoute roles={['worker']}><div>Worker dashboard</div></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute roles={['admin']}><div>Admin dashboard</div></ProtectedRoute>} />
    <Route path="/private" element={<ProtectedRoute roles={['admin']}><div>Private content</div></ProtectedRoute>} />
    <Route path="/" element={<div>Public homepage</div>} />
  </Routes></AuthProvider></MemoryRouter>)
}

const api = (urlPart, method = 'GET') => fetch.mock.calls.find(([url, options]) => url.includes(urlPart) && (options?.method || 'GET') === method)

describe('browser authentication', () => {
  it('blocks a protected route until a session is restored', async () => {
    fetch.mockResolvedValue(response(401, { error: { message: 'Not signed in' } }))
    mount('/private')
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.queryByText('Private content')).not.toBeInTheDocument()
  })

  it('rejects a mismatched password before sending registration', async () => {
    fetch.mockResolvedValue(response(401, { error: { message: 'Not signed in' } }))
    mount('/register')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Full name'), 'Aman Singh')
    await user.type(screen.getByLabelText('Email address'), 'aman@example.test')
    await user.type(screen.getByLabelText('Password'), 'CleanCity2026!')
    await user.type(screen.getByLabelText('Confirm password'), 'DifferentPassword!')
    await user.click(screen.getByRole('button', { name: /create citizen account/i }))
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(api('/auth/register', 'POST')).toBeUndefined()
  })

  it('creates an account with an eight-character password and enters the citizen workspace', async () => {
    fetch.mockImplementation(async (url) => url.includes('/auth/me')
      ? response(401, { error: { message: 'Not signed in' } })
      : response(201, { data: { user: { id: 'c1', name: 'Aman Singh', role: 'citizen' } } }))
    mount('/register')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Full name'), 'Aman Singh')
    await user.type(screen.getByLabelText('Email address'), 'aman@example.test')
    await user.type(screen.getByLabelText('Password'), 'Abcd123!')
    await user.type(screen.getByLabelText('Confirm password'), 'Abcd123!')
    await user.click(screen.getByRole('button', { name: /create citizen account/i }))
    expect(await screen.findByText(/Citizen dashboard/)).toBeInTheDocument()
    expect(api('/auth/register', 'POST')?.[1].body).toContain('Abcd123!')
  })

  it('shows a failed login and keeps the user on the form', async () => {
    fetch.mockImplementation(async (url, options) => url.includes('/auth/me')
      ? response(401, { error: { message: 'Not signed in' } })
      : response(401, { error: { message: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS' } }))
    mount('/login')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email address'), 'aman@example.test')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('routes a successful login to the dashboard for the returned role', async () => {
    fetch.mockImplementation(async (url, options) => url.includes('/auth/me')
      ? response(401, { error: { message: 'Not signed in' } })
      : response(200, { data: { user: { id: 'w1', name: 'Worker One', role: 'worker' } } }))
    mount('/login')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email address'), 'worker@example.test')
    await user.type(screen.getByLabelText('Password'), 'valid-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Worker dashboard')).toBeInTheDocument()
  })

  it('sends a role mismatch to the forbidden page', async () => {
    fetch.mockResolvedValue(response(200, { data: { user: { id: 'c1', name: 'Citizen', role: 'citizen' } } }))
    mount('/admin')
    expect(await screen.findByText('Forbidden page')).toBeInTheDocument()
    expect(screen.queryByText('Admin dashboard')).not.toBeInTheDocument()
  })

  it('calls logout, clears the session, and returns to the public page', async () => {
    fetch.mockImplementation(async (url, options) => url.includes('/auth/me')
      ? response(200, { data: { user: { id: 'c1', name: 'Citizen', role: 'citizen' } } })
      : response(200, { data: { message: 'Signed out' } }))
    mount('/app')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /sign out/i }))
    expect(await screen.findByText('Public homepage')).toBeInTheDocument()
    expect(api('/auth/logout', 'POST')).toBeDefined()
  })
})
