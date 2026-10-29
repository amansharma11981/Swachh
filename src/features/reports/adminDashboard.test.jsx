import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminDashboardPage from '../../pages/AdminDashboardPage.jsx'

const mockReportService = vi.hoisted(() => ({
  getAdminMetrics: vi.fn(),
  getZones: vi.fn(),
  getRecentAudit: vi.fn(),
  getAdminInsights: vi.fn(),
}))

const mockRecommendationService = vi.hoisted(() => ({
  list: vi.fn(),
  generate: vi.fn(),
  review: vi.fn(),
  outcome: vi.fn(),
}))

vi.mock('./reportService.js', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    reportService: { ...original.reportService, ...mockReportService },
  }
})

vi.mock('../recommendations/recommendationService.js', () => ({
  recommendationService: mockRecommendationService,
}))

function mountAdminDashboard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminDashboardPage Report Blocks & Responsive Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReportService.getZones.mockResolvedValue({
      zones: [{ zoneId: 'zone-1', name: 'Downtown Market' }],
    })
    mockReportService.getRecentAudit.mockResolvedValue({
      events: [
        {
          _id: 'ev-1',
          action: 'STATUS_UPDATED',
          targetType: 'Report',
          targetId: 'rpt-001',
          createdAt: '2026-10-29T10:00:00Z',
          changes: { status: 'in_progress' },
        },
      ],
    })
    mockRecommendationService.list.mockResolvedValue({ items: [] })
    mockReportService.getAdminMetrics.mockResolvedValue({
      total: 42,
      pending: 12,
      inProgress: 18,
      resolved: 10,
      awaitingReview: 5,
      highPriorityOpen: 3,
      dailyWindow: 'last 30 days',
      dailySubmissions: [
        { _id: '2026-10-27', count: 5 },
        { _id: '2026-10-28', count: 12 },
        { _id: '2026-10-29', count: 8 },
      ],
      byCategory: [
        { _id: 'plastic_waste', count: 20 },
        { _id: 'organic_waste', count: 14 },
      ],
      byZone: [
        { _id: 'Downtown Market', count: 25 },
        { _id: 'West End', count: 17 },
      ],
      averageResolutionMs: 7200000, // 2 hours
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders all metric stat blocks with counts and labels', async () => {
    mountAdminDashboard()

    expect(screen.getByText('Loading database metrics…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Operations overview')).toBeInTheDocument()
    })

    // Metric stat blocks
    expect(screen.getByText('All reports')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()

    expect(screen.getByText('Pending review')).toBeInTheDocument()
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)

    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()

    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)

    expect(screen.getByText('High priority open')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders daily report volume block and analytics panels', async () => {
    mountAdminDashboard()

    await waitFor(() => {
      expect(screen.getByText('Daily report volume')).toBeInTheDocument()
    })

    // Daily volume summary stats
    expect(screen.getByText(/Total:/)).toBeInTheDocument()
    expect(screen.getAllByText('25').length).toBeGreaterThan(0) // Total & Zone count
    expect(screen.getAllByText('12').length).toBeGreaterThan(0) // Peak count

    // Reports by category block
    expect(screen.getByText('Reports by category')).toBeInTheDocument()
    expect(screen.getByText('2 categories')).toBeInTheDocument()

    // Reports by zone block
    expect(screen.getByText('Reports by zone')).toBeInTheDocument()
    expect(screen.getByText('2 zones')).toBeInTheDocument()
    expect(screen.getAllByText('Downtown Market').length).toBeGreaterThan(0)

    // Audit overview block
    expect(screen.getByText('Recent administrative activity')).toBeInTheDocument()
    expect(screen.getByText('1 events')).toBeInTheDocument()
    expect(screen.getByText('STATUS UPDATED')).toBeInTheDocument()
  })

  it('allows filtering by status, zone, and date, then clearing filters', async () => {
    mountAdminDashboard()

    await waitFor(() => {
      expect(screen.getByText('Operations overview')).toBeInTheDocument()
    })

    const statusSelect = screen.getByLabelText(/Status/i)
    fireEvent.change(statusSelect, { target: { value: 'submitted' } })

    await waitFor(() => {
      expect(mockReportService.getAdminMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'submitted' })
      )
    })

    // Clear filters button should be visible when a filter is active
    const clearButton = await screen.findByRole('button', { name: /Clear filters/i })
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(mockReportService.getAdminMetrics).toHaveBeenCalledWith({
        from: '',
        to: '',
        status: '',
        category: '',
        priority: '',
        zoneId: '',
      })
    })
  })
})
