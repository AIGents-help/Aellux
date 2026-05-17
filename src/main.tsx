import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './useAuth'
import App from './App'
import { initAnalytics } from './analytics'
import { initErrorMonitoring, ErrorBoundary } from './errors'
import './index.css'
import './aellux-readability.css'
import './mobile.css'

// v1.3.1 — Build 2026-05-17

// Pre-React crash safety net — shows a visible message if the JS crashes
// before React can mount (e.g. a broken import at module level).
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && root.childElementCount === 0) {
    root.innerHTML = `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui;background:#f7f6f2;color:#0f1a0f;padding:24px;text-align:center;">
      <div style="font-size:18px;font-weight:500;margin-bottom:8px;">Aellux failed to load</div>
      <div style="font-size:13px;color:#4a5e4a;margin-bottom:16px;max-width:420px;">Error: ${e.message || 'Unknown'}</div>
      <button onclick="location.reload()" style="padding:10px 20px;font-size:14px;background:#0f1a0f;color:#fff;border:none;border-radius:8px;cursor:pointer;">Reload</button>
    </div>`;
  }
});

try { initErrorMonitoring(); } catch(e) { console.error('Sentry init failed:', e); }
try { initAnalytics(); } catch(e) { console.error('Analytics init failed:', e); }

const CrashFallback = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: '#f7f6f2', color: '#0f1a0f', padding: 24, textAlign: 'center',
  }}>
    <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Something went wrong.</div>
    <div style={{ fontSize: 14, color: '#4a5e4a', marginBottom: 20, maxWidth: 420 }}>
      Aellux ran into an unexpected error. Reloading usually fixes it.
    </div>
    <button
      onClick={() => window.location.reload()}
      style={{ padding: '10px 20px', fontSize: 14, background: '#0f1a0f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      Reload Aellux
    </button>
  </div>
);

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary fallback={<CrashFallback />}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch(e) {
  console.error('React mount failed:', e);
  const root = document.getElementById('root');
  if (root) root.innerHTML = `<div style="padding:40px;text-align:center;font-family:system-ui;">React failed to mount: ${String(e)}</div>`;
}
