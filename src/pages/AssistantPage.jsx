import { useState } from 'react'
import { Bot, Send, Sparkles, UserRound } from 'lucide-react'
import { assistantService } from '../features/assistant/assistantService.js'
import '../features/assistant/assistant.css'

const suggestions = ['How should I separate household waste?', 'Help me draft a cleanliness complaint.', 'How can I check my report status?']

export default function AssistantPage() {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
  return <section className="civic-assistant">
    <div className="eyebrow"><span className="eyebrow-line" />SWACHHAI / CIVIC ASSISTANT</div>
    <div className="dashboard-heading"><div><h1>Civic assistant<span className="accent-dot">.</span></h1><p>Get practical cleanliness guidance, draft a report, or check your own report status.</p></div><span className="assistant-mark"><Sparkles size={19} /> GROQ AI</span></div>
    <div className="assistant-privacy"><strong>Privacy note</strong><span>Your chat text is sent to Groq to generate replies. Don’t include passwords or sensitive personal information. Your report status is looked up securely from your account and report details are not sent to the AI provider.</span></div>
    <div className="assistant-chat" aria-label="Civic assistant conversation" aria-live="polite">
      {!messages.length && <div className="assistant-welcome"><span><Bot size={22} /></span><h2>How can I help?</h2><p>Ask about waste segregation, drafting a report, using SwachhAI, or your report status.</p><div className="assistant-suggestions">{suggestions.map((prompt) => <button key={prompt} type="button" onClick={() => send(prompt)} disabled={busy}>{prompt}</button>)}</div></div>}
      {messages.map((message, index) => <article className={`assistant-message assistant-message-${message.role}`} key={`${index}-${message.role}`}><span>{message.role === 'assistant' ? <Bot size={17} /> : <UserRound size={17} />}</span><p>{message.content}</p></article>)}
      {busy && <p className="assistant-thinking" role="status">Preparing a reply…</p>}
      {error && <p className="assistant-error" role="alert">{error}</p>}
    </div>
    <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); send() }}><label className="visually-hidden" htmlFor="assistant-message">Your message</label><textarea id="assistant-message" value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="Ask a question or describe the complaint you want to draft…" rows={2} disabled={busy} /><div><span>{draft.length}/1000</span><button type="submit" disabled={busy || !draft.trim()}><Send size={15} /> Send</button></div></form>
    <p className="assistant-footnote">AI replies can be incomplete. Review any drafted complaint before submitting it. Nothing is submitted automatically.</p>
  </section>
}
