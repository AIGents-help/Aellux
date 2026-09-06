// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Thread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  userId: string;
  isPro: boolean;
  OrbComponent?: React.ComponentType<{ state: string; size?: number }>;
}

const QUICK_QUESTIONS = [
  'Is what you\'re seeing in my markers reversible?',
  'Could any of my supplements be causing a false positive?',
  'What happens if I change nothing for a year?',
  'What\'s the one thing most likely to move my biological age?',
  'Do any of my active supplements conflict with each other?',
];

export default function SphereAdvisor({ userId, isPro, OrbComponent }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadThreads = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/sphere-threads?userId=${userId}`);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch { /* non-fatal */ }
  }, [userId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const openThread = async (threadId: string) => {
    setActiveThreadId(threadId);
    setSidebarOpen(false);
    setError(null);
    try {
      const res = await fetch(`/api/sphere-threads?userId=${userId}&threadId=${threadId}`);
      const data = await res.json();
      setMessages((data.messages || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
    } catch {
      setError('Could not load that conversation.');
    }
  };

  const startNewThread = () => {
    setActiveThreadId(null);
    setMessages([]);
    setError(null);
    setSidebarOpen(false);
  };

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || streaming) return;
    if (!isPro) { setError('Aellux Sphere is a Pro feature — full conversational access to everything Aellux knows about you.'); return; }

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: q }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/sphere-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: isPro ? 'pro' : 'free', threadId: activeThreadId, message: q }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error('No response stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let resolvedThreadId = activeThreadId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        for (const evt of events) {
          const eventMatch = evt.match(/^event: (.+)$/m);
          const dataMatch = evt.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const eventName = eventMatch[1];
          let data: any = {};
          try { data = JSON.parse(dataMatch[1]); } catch { continue; }

          if (eventName === 'thread' && data.threadId) {
            resolvedThreadId = data.threadId;
            setActiveThreadId(data.threadId);
          } else if (eventName === 'delta' && data.text) {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === 'assistant') last.content += data.text;
              return next;
            });
          } else if (eventName === 'error') {
            setError(data.message || 'Something went wrong.');
          } else if (eventName === 'complete') {
            loadThreads();
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Connection lost.');
    }
    setStreaming(false);
  }, [streaming, isPro, userId, activeThreadId, loadThreads]);

  const S = {
    label: { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', fontWeight: 500 },
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 520, gap: 0 }}>
      {/* ── Thread sidebar ── */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', paddingRight: 16, marginRight: 20,
        display: sidebarOpen ? 'block' : undefined,
      }} className="aellux-sphere-sidebar">
        <button onClick={startNewThread} style={{
          width: '100%', textAlign: 'left', fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--brand-dim)',
          background: 'var(--brand-ghost)', border: '1px solid var(--brand-border)', borderRadius: 'var(--r-md)',
          padding: '10px 14px', cursor: 'pointer', marginBottom: 16, fontWeight: 500,
        }}>
          + New conversation
        </button>
        <p style={{ ...S.label, marginBottom: 8 }}>Past conversations</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 480, overflowY: 'auto' }}>
          {threads.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No conversations yet.</p>}
          {threads.map(t => (
            <button key={t.id} onClick={() => openThread(t.id)} style={{
              textAlign: 'left', fontSize: 13.5, fontFamily: 'var(--font-body)', padding: '8px 10px', borderRadius: 'var(--r-sm)',
              border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              background: activeThreadId === t.id ? 'var(--bg-sunken)' : 'transparent',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {t.title || 'Untitled'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conversation ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 560 }}>
            {OrbComponent && <div style={{ marginBottom: 20 }}><OrbComponent state={streaming ? 'thinking' : 'idle'} size={72} /></div>}
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', marginBottom: 10, fontStyle: 'italic' }}>
              Ask Aellux directly.
            </p>
            <p style={{ fontSize: 15, color: 'var(--text-tertiary)', lineHeight: 1.7, marginBottom: 24 }}>
              Sphere already has your labs, your active supplements, your symptom journal, and every analysis Aellux has already run on you. Ask about reversibility, interactions, false positives, or anything else — no context to re-explain.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => send(q)} style={{
                  textAlign: 'left', fontSize: 14.5, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)',
                  background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)',
                  padding: '11px 15px', cursor: 'pointer',
                }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 16 }}>
            {messages.map((m, i) => (
              <div key={m.id || i} style={{ marginBottom: 20, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%',
                  background: m.role === 'user' ? 'var(--brand-ghost)' : 'var(--bg-surface)',
                  border: m.role === 'user' ? '1px solid var(--brand-border)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--r-lg)',
                  padding: '13px 17px',
                  fontFamily: m.role === 'assistant' ? 'var(--font-display)' : 'var(--font-body)',
                  fontStyle: m.role === 'assistant' ? 'italic' : 'normal',
                  fontSize: m.role === 'assistant' ? 17 : 15,
                  lineHeight: 1.7,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  boxShadow: m.role === 'assistant' ? 'var(--shadow-card)' : 'none',
                }}>
                  {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13.5, color: 'var(--accent-elevated)', marginBottom: 12, fontFamily: 'var(--font-body)' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            style={{
              flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-md)',
              color: 'var(--text-primary)', fontSize: 15, fontFamily: 'var(--font-body)', padding: '13px 16px', outline: 'none',
            }}
            placeholder="Ask about reversibility, interactions, false positives, anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            disabled={streaming}
          />
          <button
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            style={{
              fontSize: 15, color: 'var(--text-inverse)', background: streaming ? 'var(--text-tertiary)' : 'var(--brand-dim)',
              border: 'none', borderRadius: 'var(--r-md)', padding: '13px 22px', cursor: streaming ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 500, whiteSpace: 'nowrap',
            }}
          >
            {streaming ? '···' : 'Ask →'}
          </button>
        </div>
        {!isPro && (
          <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 8 }}>
            Aellux Sphere is a Pro feature. Upgrade for full conversational access to your data.
          </p>
        )}
      </div>
    </div>
  );
}
