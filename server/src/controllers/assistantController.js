import { AppError } from '../utils/errors.js'
import { REPORT_CATEGORIES } from '../models/Report.js'
import { z } from 'zod'

const draftResultSchema = z.object({
  description: z.string().trim().min(10).max(500),
  category: z.enum(REPORT_CATEGORIES).nullable(),
  followUpQuestions: z.array(z.string().trim().min(3).max(160)).max(3),
}).strict()

export function assistantController({ ReportModel, aiAnalysis }) {
  return {
    chat: async (request, response) => {
      const messages = request.validatedBody.messages
      const latest = messages.at(-1)?.content || ''
      const asksStatus = /\b(status|progress|track|where is|update on|pending|unresolved|resolved|latest|details)\b/i.test(latest) && /\b(my|mine|report|complaint|case|issue)\b/i.test(latest)
      if (asksStatus) {
        const number = latest.match(/\b(SW-(?:\d{4}-)?\d{4,})\b/i)?.[1]?.toUpperCase()
        const ownership = request.user.role === 'citizen' ? { reporter: request.user.id } : request.user.role === 'worker' ? { assignedWorker: request.user.id } : {}
        const statusConstraint = /\b(pending|unresolved|open)\b/i.test(latest) ? { status: { $nin: ['resolved', 'rejected', 'duplicate'] } } : /\bresolved\b/i.test(latest) ? { status: 'resolved' } : {}
        const filter = { ...ownership, ...statusConstraint, ...(number ? { reportNumber: number } : {}) }
        const reports = await ReportModel.find(filter).select('reportNumber status category priority description createdAt location zone assignmentStatus resolvedAt').sort({ createdAt: -1 }).limit(number ? 1 : /\blatest|details\b/i.test(latest) ? 1 : 5).lean()
        if (!reports.length) return response.json({ success: true, data: { reply: number ? `I couldn’t find report ${number} in the records available to your account. Check the number or open your reports/tasks page.` : request.user.role === 'citizen' ? 'I couldn’t find a matching report in your account. You can submit one from Report an issue.' : 'I couldn’t find a matching report assigned to your account. Open Assigned tasks to review your work.' } })
        const lines = reports.map((report) => {
          const details = [`${report.reportNumber}: ${report.status.replaceAll('_', ' ')} (${report.category.replaceAll('_', ' ')})`, `submitted ${new Date(report.createdAt).toLocaleDateString('en-IN')}`]
          if (/\b(details|latest)\b/i.test(latest)) {
            if (report.priority) details.push(`${report.priority} priority`)
            if (report.description) details.push(`description: ${report.description.slice(0, 240)}`)
            if (report.location?.label) details.push(`location: ${report.location.label}`)
            if (report.assignmentStatus && report.assignmentStatus !== 'unassigned') details.push(`work ${String(report.assignmentStatus).replaceAll('_', ' ')}`)
            if (report.resolvedAt) details.push(`resolved ${new Date(report.resolvedAt).toLocaleDateString('en-IN')}`)
          }
          return details.join('; ')
        })
        return response.json({ success: true, data: { reply: `${number || /\blatest\b/i.test(latest) ? 'Report details' : 'Matching report status'}:\n${lines.join('\n')}\n${request.user.role === 'citizen' ? 'Open My reports' : request.user.role === 'worker' ? 'Open Assigned tasks' : 'Open Reports'} for the full record.` } })
      }
      if (asksStatus) return response.json({ success: true, data: { reply: 'I can help with sanitation questions and app guidance. Report status lookup is available to citizens for their own reports in My reports.' } })
      if (!aiAnalysis?.configured || !aiAnalysis.reply) throw new AppError(503, 'ASSISTANT_NOT_CONFIGURED', 'The civic assistant is unavailable right now. Please try again later.')
      // Assistant-generated history may contain a private, deterministic report-status
      // reply from an earlier turn. Never forward assistant history to Groq.
      const providerMessages = messages.filter(({ role, content }) => role === 'user' && !/\b(status|progress|track|where is|update on)\b/i.test(content) && !/\b(SW-(?:\d{4}-)?\d{4,})\b/i.test(content)).map(({ role, content }) => ({ role, content }))
      if (!providerMessages.length) return response.json({ success: true, data: { reply: 'I can help with sanitation questions, complaint drafting, and app guidance. You can check your own report status from My reports.' } })
      const result = await aiAnalysis.reply(providerMessages, request.user.role)
      if (result.status !== 'completed') throw new AppError(503, 'ASSISTANT_UNAVAILABLE', 'The civic assistant is temporarily unavailable. Please try again later.')
      response.json({ success: true, data: { reply: result.content } })
    },
    draft: async (request, response) => {
      if (!aiAnalysis?.configured || !aiAnalysis.draftComplaint) throw new AppError(503, 'ASSISTANT_NOT_CONFIGURED', 'AI drafting is unavailable. You can still write a report in the Report an issue form.')
      const result = await aiAnalysis.draftComplaint(request.validatedBody.description)
      if (result.status !== 'completed') throw new AppError(503, 'ASSISTANT_UNAVAILABLE', 'AI drafting is temporarily unavailable. You can still continue in the Report an issue form.')
      let parsed
      try { parsed = JSON.parse(result.content) } catch { throw new AppError(503, 'ASSISTANT_INVALID_RESPONSE', 'The assistant returned an unreadable draft. Please write the description in the report form.') }
      const draft = draftResultSchema.safeParse(parsed)
      if (!draft.success) throw new AppError(503, 'ASSISTANT_INVALID_RESPONSE', 'The assistant could not prepare a safe draft. Please write the description in the report form.')
      response.json({ success: true, data: { ...draft.data, note: 'Review and edit every detail. This draft has not been submitted.' } })
    },
  }
}
