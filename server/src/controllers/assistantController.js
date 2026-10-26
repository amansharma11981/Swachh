import { AppError } from '../utils/errors.js'

export function assistantController({ ReportModel, aiAnalysis }) {
  return {
    chat: async (request, response) => {
      const messages = request.validatedBody.messages
      const latest = messages.at(-1)?.content || ''
      const asksStatus = /\b(status|progress|track|where is|update on)\b/i.test(latest) && /\b(report|complaint|case|issue)\b/i.test(latest)
      if (asksStatus && request.user.role === 'citizen') {
        const number = latest.match(/\b(SW-(?:\d{4}-)?\d{4,})\b/i)?.[1]?.toUpperCase()
        const filter = { reporter: request.user.id, ...(number ? { reportNumber: number } : {}) }
        const reports = await ReportModel.find(filter).select('reportNumber status category createdAt').sort({ createdAt: -1 }).limit(number ? 1 : 5).lean()
        if (!reports.length) return response.json({ success: true, data: { reply: number ? `I couldn’t find report ${number} in your account. Check the report number or open My reports.` : 'I couldn’t find reports in your account yet. You can submit one from Report an issue.' } })
        const lines = reports.map((report) => `${report.reportNumber}: ${report.status.replaceAll('_', ' ')} (${report.category.replaceAll('_', ' ')}), submitted ${new Date(report.createdAt).toLocaleDateString('en-IN')}.`)
        return response.json({ success: true, data: { reply: `${number ? 'Your report status' : 'Your recent report statuses'}:\n${lines.join('\n')}\nOpen My reports for details.` } })
      }
      if (asksStatus) return response.json({ success: true, data: { reply: 'I can help with sanitation questions and app guidance. Report status lookup is available to citizens for their own reports in My reports.' } })
      if (!aiAnalysis?.configured || !aiAnalysis.reply) throw new AppError(503, 'ASSISTANT_NOT_CONFIGURED', 'The civic assistant is unavailable right now. Please try again later.')
      // Assistant-generated history may contain a private, deterministic report-status
      // reply from an earlier turn. Never forward assistant history to Groq.
      const providerMessages = messages.filter(({ role, content }) => role === 'user' && !/\b(status|progress|track|where is|update on)\b/i.test(content) && !/\b(SW-(?:\d{4}-)?\d{4,})\b/i.test(content)).map(({ role, content }) => ({ role, content }))
      if (!providerMessages.length) return response.json({ success: true, data: { reply: 'I can help with sanitation questions, complaint drafting, and app guidance. You can check your own report status from My reports.' } })
      const result = await aiAnalysis.reply(providerMessages)
      if (result.status !== 'completed') throw new AppError(503, 'ASSISTANT_UNAVAILABLE', 'The civic assistant is temporarily unavailable. Please try again later.')
      response.json({ success: true, data: { reply: result.content } })
    },
  }
}
