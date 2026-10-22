import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  createReport: vi.fn(), getZones: vi.fn(), getDashboard: vi.fn(), getMyReports: vi.fn(), getReport: vi.fn(),
}))

vi.mock('./reportService.js', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, reportService: { ...original.reportService, ...mocks } }
})

import ReportFormPage from '../../pages/ReportFormPage.jsx'
import CitizenDashboardPage from '../../pages/CitizenDashboardPage.jsx'
import MyReportsPage from '../../pages/MyReportsPage.jsx'
import ReportDetailPage from '../../pages/ReportDetailPage.jsx'

const testImage = () => new File([new Uint8Array([137, 80, 78, 71])], 'street.png', { type: 'image/png' })

function mount(element, initialPath = '/', routePath = '/') {
  return render(<MemoryRouter initialEntries={[initialPath]}><Routes>
    <Route path={routePath} element={element} />
  </Routes></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getZones.mockResolvedValue({ zones: [{ zoneId: 'nit-more', name: 'NIT More Street-Food Lane', boundaryVerified: false }], imageUploadEnabled: true })
  mocks.getDashboard.mockResolvedValue({ stats: { total: 2, awaitingReview: 1, inProgress: 1, resolved: 0 }, recent: [] })
  mocks.getMyReports.mockResolvedValue({ items: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } })
  mocks.getReport.mockResolvedValue({ report: { reportNumber: 'SW-000001', category: 'plastic_waste', description: 'Plastic waste along the walking path.', location: { label: 'North gate', source: 'manual' }, images: [], status: 'submitted', priority: 'normal', statusHistory: [{ toStatus: 'submitted', timestamp: '2026-10-01T10:00:00Z', note: 'Report submitted by citizen' }], createdAt: '2026-10-01T10:00:00Z', id: 'abc' } })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('citizen reporting UI', () => {
  it('previews a selected image, removes it, and reports unsupported files', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-image') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const user = userEvent.setup()
    const { container } = mount(<ReportFormPage />)
    const fileInput = container.querySelector('input[type="file"]')
    await user.upload(fileInput, testImage())
    expect(await screen.findByAltText('Preview of the selected report image')).toHaveAttribute('src', 'blob:test-image')
    await user.click(screen.getByRole('button', { name: /remove selected image/i }))
    expect(screen.queryByAltText('Preview of the selected report image')).not.toBeInTheDocument()
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['bad'], 'photo.svg', { type: 'image/svg+xml' })] } })
    expect(await screen.findByText('Choose a JPEG, PNG, or WebP image.')).toBeInTheDocument()
  })

  it('explains location permission denial and leaves manual location available', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success, failure) => failure({ code: 1 }) } })
    const user = userEvent.setup()
    mount(<ReportFormPage />)
    await user.click(screen.getByRole('button', { name: /use my current location/i }))
    expect(await screen.findByText(/permission was denied/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/place or nearby landmark/i)).toBeEnabled()
  })

  it('submits a complete report and only shows success after the API confirms it', async () => {
    mocks.createReport.mockImplementation(async (_data, onProgress) => {
      onProgress(42)
      return { report: { id: 'report-id-1', reportNumber: 'SW-000042' } }
    })
    const user = userEvent.setup()
    const { container } = mount(<ReportFormPage />)
    await user.upload(container.querySelector('input[type="file"]'), testImage())
    await user.selectOptions(screen.getByLabelText('Issue category'), 'plastic_waste')
    await user.type(screen.getByLabelText(/Description/), 'Plastic packaging is scattered beside the walkway.')
    await user.type(screen.getByLabelText('Place or nearby landmark'), 'Near the north gate')
    await user.selectOptions(screen.getByLabelText(/pilot zone/i), 'nit-more')
    await user.click(screen.getByRole('button', { name: /submit report/i }))
    expect(await screen.findByText('SW-000042')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /track this report/i })).toHaveAttribute('href', '/app/reports/report-id-1')
    expect(mocks.createReport).toHaveBeenCalledOnce()
    const formData = mocks.createReport.mock.calls[0][0]
    expect(formData.get('category')).toBe('plastic_waste')
    expect(formData.get('zoneId')).toBe('nit-more')
  })

  it('shows upload progress and prevents a second submission while pending', async () => {
    let finishUpload
    mocks.createReport.mockImplementation(async (_data, onProgress) => {
      onProgress(42)
      return new Promise((resolve) => { finishUpload = () => resolve({ report: { id: 'pending-report', reportNumber: 'SW-000043' } }) })
    })
    const user = userEvent.setup()
    const { container } = mount(<ReportFormPage />)
    await user.upload(container.querySelector('input[type="file"]'), testImage())
    await user.selectOptions(screen.getByLabelText('Issue category'), 'other')
    await user.type(screen.getByLabelText(/Description/), 'A collection of waste is blocking the public walkway.')
    await user.type(screen.getByLabelText('Place or nearby landmark'), 'Beside the north gate')
    await user.click(screen.getByRole('button', { name: /submit report/i }))
    expect(await screen.findByLabelText('Image upload progress')).toHaveValue(42)
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
    expect(mocks.createReport).toHaveBeenCalledOnce()
    finishUpload()
    expect(await screen.findByText('SW-000043')).toBeInTheDocument()
  })

  it('retains form values after an API upload failure', async () => {
    mocks.createReport.mockRejectedValue(new Error('Storage upload failed. Try again.'))
    const user = userEvent.setup()
    const { container } = mount(<ReportFormPage />)
    await user.upload(container.querySelector('input[type="file"]'), testImage())
    await user.selectOptions(screen.getByLabelText('Issue category'), 'other')
    await user.type(screen.getByLabelText(/Description/), 'Overflowing litter remains by the side entrance.')
    await user.type(screen.getByLabelText('Place or nearby landmark'), 'Side entrance')
    await user.click(screen.getByRole('button', { name: /submit report/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage upload failed.')
    expect(screen.getByLabelText(/Description/)).toHaveValue('Overflowing litter remains by the side entrance.')
    expect(screen.getByAltText('Preview of the selected report image')).toBeInTheDocument()
  })

  it('renders dashboard counts and report-history filters from API data', async () => {
    const user = userEvent.setup()
    const dashboard = mount(<CitizenDashboardPage />)
    expect(await screen.findByText('Reports submitted')).toBeInTheDocument()
    expect(dashboard.container).toHaveTextContent('2')
    cleanup()
    mount(<MyReportsPage />)
    await waitFor(() => expect(mocks.getMyReports).toHaveBeenCalledWith({ page: 1, limit: 10, status: undefined }))
    await user.click(screen.getByRole('tab', { name: 'Under review' }))
    await waitFor(() => expect(mocks.getMyReports).toHaveBeenLastCalledWith({ page: 1, limit: 10, status: 'under_review' }))
  })

  it('shows only the safe unavailable state for a report the API will not reveal', async () => {
    mocks.getReport.mockRejectedValue(new Error('The requested resource was not found'))
    mount(<ReportDetailPage />, '/app/reports/private-id', '/app/reports/:id')
    expect(await screen.findByRole('heading', { name: /report unavailable/i })).toBeInTheDocument()
    expect(screen.getByText(/does not exist or is not available to your account/i)).toBeInTheDocument()
  })

  it('renders only the status events and location details returned by the API', async () => {
    mount(<ReportDetailPage />, '/app/reports/abc', '/app/reports/:id')
    expect(await screen.findByText('Report submitted by citizen')).toBeInTheDocument()
    expect(screen.getByText('North gate')).toBeInTheDocument()
    expect(screen.queryByText(/resolved/i)).not.toBeInTheDocument()
  })

  it('disables submission and explains missing image storage configuration', async () => {
    mocks.getZones.mockResolvedValue({ zones: [], imageUploadEnabled: false })
    mount(<ReportFormPage />)
    expect(await screen.findByText(/administrator to configure Cloudinary storage/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit report/i })).toBeDisabled()
  })
})
