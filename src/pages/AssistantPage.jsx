import { useState } from 'react'
import { Bot, RotateCcw, Send, Sparkles, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { assistantService } from '../features/assistant/assistantService.js'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { REPORT_CATEGORIES } from '../features/reports/reportService.js'
import '../features/assistant/assistant.css'
import '../features/assistant/draft.css'

const suggestions = ['How should I separate household waste?', 'Help me draft a cleanliness complaint.', 'How can I check my report status?']

export default function AssistantPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complaintInput, setComplaintInput] = useState('')
  const [complaintDraft, setComplaintDraft] = useState(null)
  const [draftBusy, setDraftBusy] = useState(false)
  const [draftError, setDraftError] = useState('')
  const send = async (value = draft) => {
    const content = value.trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next); setDraft(''); setError(''); setBusy(true)
    try {
      const result = await assistantService.chat(next.slice(-8))
      setMessages([...next, { role: 'assistant', content: result.reply }])
    } catch (e) { setMessages(next); setError(e.message || 'The assistant could not reply. Try again.') }
    finally { setBusy(false) }
  }
  const prepareComplaint = async (event) => {
    event.preventDefault()
    if (complaintInput.trim().length < 10 || draftBusy) return
    setDraftBusy(true); setDraftError(''); setComplaintDraft(null)
    try { setComplaintDraft(await assistantService.draft(complaintInput.trim())) }
    catch (e) { setDraftError(e.message || 'Could not prepare a draft. You can still write your report directly.') }
    finally { setDraftBusy(false) }
  }
  return <section className="civic-assistant">
    <div className="eyebrow"><span className="eyebrow-line" />SWACHHAI / CIVIC ASSISTANT</div>
    <div className="dashboard-heading"><div><h1>Civic assistant<span className="accent-dot">.</span></h1><p>Get practical cleanliness guidance, draft a report, or check your own report status.</p></div><span className="assistant-mark"><Sparkles size={19} /> GROQ AI</span></div>
    <div className="assistant-privacy"><strong>Privacy note</strong><span>Your chat text is sent to Groq to generate replies. Don’t include passwords or sensitive personal information. Your report status is looked up securely from your account and report details are not sent to the AI provider.</span></div>
    <div className="assistant-chat" role="log" aria-label="Civic assistant conversation" aria-live="polite" aria-relevant="additions text">
      {!messages.length && <div className="assistant-welcome"><span><Bot size={22} /></span><h2>How can I help?</h2><p>Ask about waste segregation, drafting a report, using SwachhAI, or your report status.</p><div className="assistant-suggestions">{suggestions.map((prompt) => <button key={prompt} type="button" onClick={() => send(prompt)} disabled={busy}>{prompt}</button>)}</div></div>}
      {messages.map((message, index) => <article className={`assistant-message assistant-message-${message.role}`} key={`${index}-${message.role}`}><span>{message.role === 'assistant' ? <Bot size={17} /> : <UserRound size={17} />}</span><p>{message.content}</p></article>)}
      {busy && <p className="assistant-thinking" role="status">Preparing a reply…</p>}
      {error && <p className="assistant-error" role="alert">{error}</p>}
    </div>
    <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); send() }}><label className="visually-hidden" htmlFor="assistant-message">Your message</label><textarea id="assistant-message" value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="Ask a question or describe the complaint you want to draft…" rows={2} disabled={busy} /><div><span>{draft.length}/1000</span><button type="submit" disabled={busy || !draft.trim()}><Send size={15} /> Send</button></div></form>
    <button type="button" className="assistant-reset" onClick={() => { setMessages([]); setError('') }} disabled={!messages.length && !error}><RotateCcw size={14} /> Clear conversation</button>
    {user?.role === 'citizen' && <section className="assistant-draft-panel" aria-labelledby="assistant-draft-title"><div><span className="demo-label">OPTIONAL AI TOOL</span><h2 id="assistant-draft-title">Prepare a report draft</h2><p>Describe what you observed. The assistant suggests editable wording and a category; you must review it and submit through the normal report form.</p></div><form onSubmit={prepareComplaint}><label htmlFor="complaint-draft-input">What cleanliness issue did you observe?</label><textarea id="complaint-draft-input" value={complaintInput} maxLength={1000} minLength={10} onChange={(event) => setComplaintInput(event.target.value)} rows={3} placeholder="For example: I noticed bags of mixed waste beside the walkway near my hostel…" /><div><span>{complaintInput.length}/1000</span><button type="submit" disabled={draftBusy || complaintInput.trim().length < 10}>{draftBusy ? 'Preparing…' : 'Prepare draft'}</button></div></form>{draftError && <p role="alert" className="assistant-error">{draftError}</p>}{complaintDraft && <div className="assistant-draft-result" aria-live="polite"><h3>Review this draft</h3><p>{complaintDraft.description}</p><p><strong>Suggested category:</strong> {REPORT_CATEGORIES.find(([value]) => value === complaintDraft.category)?.[1] || 'Choose a category in the report form'}</p>{complaintDraft.followUpQuestions?.length > 0 && <div><strong>Details to check before submitting</strong><ul>{complaintDraft.followUpQuestions.map((question) => <li key={question}>{question}</li>)}</ul></div>}<p className="assistant-footnote">{complaintDraft.note}</p><button type="button" onClick={() => navigate('/app/report', { state: { assistantDraft: { description: complaintDraft.description, category: complaintDraft.category || '' } } })}>Continue to report form</button></div>}</section>}
    <p className="assistant-footnote">AI replies can be incomplete. Review any drafted complaint before submitting it. Nothing is submitted automatically.</p>
  </section>
}
