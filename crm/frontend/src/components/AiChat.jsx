import { useState, useRef, useEffect } from 'react'
import { aiApi } from '../services/api'
import { Sparkles, Send, X, Minus } from 'lucide-react'

const HINTS = [
  "Bugun nechta o'quvchi keldi?",
  "Qancha guruh faol?",
  "Jami o'quvchilar soni?",
  "Kim ko'p dars qoldirgan?",
]

export default function AiChat() {
  const [open,    setOpen]    = useState(false)
  const [mini,    setMini]    = useState(false)
  const [input,   setInput]   = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const inputRef  = useRef()

  useEffect(() => {
    if (open && !mini) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, open, mini])

  useEffect(() => {
    if (open && !mini) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open, mini])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setHistory(h => [...h, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const { data } = await aiApi.chat({ message: msg, history: history.slice(-6) })
      setHistory(h => [...h, { role: 'assistant', content: data.reply }])
    } catch (e) {
      const err = e?.response?.data?.detail || 'Xato yuz berdi'
      setHistory(h => [...h, { role: 'assistant', content: `❌ ${err}` }])
    } finally {
      setLoading(false)
    }
  }

  /* Yopiq holat — pastki o'ng burchakda tugma */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}
      >
        <Sparkles className="w-4 h-4" />
        AI Yordamchi
      </button>
    )
  }

  /* Ochiq holat — panel */
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col rounded-2xl border border-slate-100 bg-white"
      style={{
        width: 360,
        height: mini ? 48 : 520,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(99,102,241,0.18)',
        transition: 'height 0.2s',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0 cursor-pointer select-none"
        onClick={() => setMini(v => !v)}
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">AI Yordamchi</p>
          {!mini && <p className="text-xs text-slate-400">element CRM</p>}
        </div>
        <button onClick={e => { e.stopPropagation(); setMini(v => !v) }}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
          <Minus className="w-4 h-4" />
        </button>
        <button onClick={e => { e.stopPropagation(); setOpen(false); setHistory([]) }}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!mini && (
        <>
          {/* Xabarlar */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Salom! Yordam bera olaman</p>
                  <p className="text-xs text-slate-400 mt-1">Platforma haqida savol bering</p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  {HINTS.map(h => (
                    <button key={h} onClick={() => send(h)}
                      className="text-left text-xs px-3 py-2 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 transition-colors">
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white mr-2 mt-0.5 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-500 text-white rounded-tr-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white mr-2 mt-0.5 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Savol yozing..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 flex items-center justify-center text-white transition-colors shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs text-slate-300 mt-1.5">Claude AI · element CRM</p>
          </div>
        </>
      )}
    </div>
  )
}
