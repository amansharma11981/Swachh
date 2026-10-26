import { badRequest } from '../utils/errors.js'

const terminal = ['resolved', 'rejected', 'duplicate']
const maxPeriodMs = 366 * 24 * 60 * 60 * 1000

function dateBound(value, end = false) {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw badRequest('Invalid reporting period')
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCDate(date.getUTCDate() + 1)
  return date
}

export function recommendationPeriod(filters, now = new Date()) {
  const to = dateBound(filters.to, true) || new Date(now)
  const from = dateBound(filters.from) || new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (from >= to || to - from > maxPeriodMs) throw badRequest('Choose a reporting period up to 366 days long')
  const duration = to.getTime() - from.getTime()
  return { start: from, end: to, previousStart: new Date(from.getTime() - duration), previousEnd: from }
}

function reportFilter(filters, start, end) {
  return {
    createdAt: { $gte: start, $lt: end },
    ...(filters.zoneId ? { 'zone.zoneId': filters.zoneId } : {}),
    ...(filters.status ? { status: filters.status === 'in_progress' ? { $in: ['assigned', 'in_progress', 'submitted_for_verification', 'reopened'] } : filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
  }
}

function compact(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 70) || 'unspecified' }

export async function buildRecommendationEvidence({ ReportModel, filters, now }) {
  const period = recommendationPeriod(filters, now)
  const currentFilter = reportFilter(filters, period.start, period.end)
  const previousFilter = reportFilter(filters, period.previousStart, period.previousEnd)
  const unresolvedFilter = { ...currentFilter, status: { $nin: terminal } }
  const locatedUnresolved = { ...unresolvedFilter, 'location.point': { $exists: true } }
  const [total, previousTotal, unresolvedTotal, statusRows, categoryRows, zoneRows, unresolvedCategoryRows, unresolvedZoneRows, priorityRows, resolutionRows, hotspotRows, locatedTotal] = await Promise.all([
    ReportModel.countDocuments(currentFilter),
    ReportModel.countDocuments(previousFilter),
    ReportModel.countDocuments(unresolvedFilter),
    ReportModel.aggregate([{ $match: currentFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ReportModel.aggregate([{ $match: currentFilter }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ReportModel.aggregate([{ $match: currentFilter }, { $group: { _id: { $ifNull: ['$zone.name', 'Unspecified area'] }, zoneId: { $first: '$zone.zoneId' }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ReportModel.aggregate([{ $match: unresolvedFilter }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ReportModel.aggregate([{ $match: unresolvedFilter }, { $group: { _id: { $ifNull: ['$zone.name', 'Unspecified area'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ReportModel.aggregate([{ $match: { ...unresolvedFilter, priority: { $in: ['high', 'urgent'] } } }, { $group: { _id: '$priority', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ReportModel.aggregate([{ $match: { ...currentFilter, resolvedAt: { $type: 'date' }, createdAt: { $gte: period.start, $lt: period.end, $type: 'date' } } }, { $project: { duration: { $subtract: ['$resolvedAt', '$createdAt'] } } }, { $group: { _id: null, averageMs: { $avg: '$duration' }, count: { $sum: 1 } } }]),
    ReportModel.aggregate([{ $match: locatedUnresolved }, { $project: { latitude: { $arrayElemAt: ['$location.point.coordinates', 1] }, longitude: { $arrayElemAt: ['$location.point.coordinates', 0] } } }, { $group: { _id: { lat: { $floor: { $divide: ['$latitude', 0.002] } }, lng: { $floor: { $divide: ['$longitude', 0.002] } } }, count: { $sum: 1 }, latitude: { $avg: '$latitude' }, longitude: { $avg: '$longitude' } } }, { $match: { count: { $gte: 3 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ReportModel.countDocuments({ ...currentFilter, 'location.point': { $exists: true } }),
  ])

  const evidence = []
  const put = (key, label, value) => evidence.push({ key, label, value })
  put('total_reports', 'Reports submitted in selected period', total)
  put('unresolved_reports', 'Unresolved reports in selected period', unresolvedTotal)
  put('located_reports', 'Reports with recorded coordinates', locatedTotal)
  if (previousTotal > 0) {
    put('previous_period_reports', 'Reports in immediately preceding equal-length period', previousTotal)
    put('period_volume_change_percent', 'Observed report-count change between equal-length periods (percent)', Math.round(((total - previousTotal) / previousTotal) * 100))
  }
  const statusCounts = Object.fromEntries(statusRows.map((row) => [row._id, row.count]))
  for (const row of statusRows) put(`status_${compact(row._id)}`, `Reports with status ${String(row._id).replaceAll('_', ' ')}`, row.count)
  for (const row of categoryRows) put(`category_${compact(row._id)}`, `Reports categorized as ${String(row._id).replaceAll('_', ' ')}`, row.count)
  for (const row of unresolvedCategoryRows) put(`unresolved_category_${compact(row._id)}`, `Unresolved ${String(row._id).replaceAll('_', ' ')} reports`, row.count)
  for (const row of zoneRows) put(`zone_${compact(row._id)}`, `Reports in area ${row._id}`, row.count)
  for (const row of unresolvedZoneRows) put(`unresolved_zone_${compact(row._id)}`, `Unresolved reports in area ${row._id}`, row.count)
  for (const row of priorityRows) put(`priority_${compact(row._id)}`, `Unresolved reports with ${row._id} priority`, row.count)
  if (resolutionRows[0]?.count) put('average_resolution_hours', 'Average time to resolve among reports with recorded resolution timestamps (hours)', Math.round(resolutionRows[0].averageMs / 3_600_000 * 10) / 10)
  hotspotRows.forEach((row, index) => {
    put(`located_grid_${index + 1}`, `Approximate ${Number(row.latitude).toFixed(3)}, ${Number(row.longitude).toFixed(3)} grid cell: unresolved located reports; grid is about 0.002 degrees`, row.count)
  })
  return { period: { start: period.start, end: period.end, previousStart: period.previousStart, previousEnd: period.previousEnd }, total, previousTotal, locatedTotal, sufficientEvidence: total >= 3, statusCounts, evidence, filters: { category: filters.category || '', zoneId: filters.zoneId || '', priority: filters.priority || '', status: filters.status || '' } }
}
