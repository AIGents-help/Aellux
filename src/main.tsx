import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './useAuth'
import App from './App'
import { initAnalytics } from './analytics'
import { initErrorMonitoring, ErrorBoundary } from './errors'
import './index.css'
import './aellux-readability.css'
import './mobile.css'

// Boot error monitoring FIRST so it can catch errors in analytics init or render.
initErrorMonitoring();
// Boot analytics — captures landing pageview accurately.
initAnalytics();

// Last-resort fallback when the whole app crashes. Stays minimalist on purpose
// so a broken brand stylesheet can't take it down too.
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
      style={{
        padding: '10px 20px', fontSize: 14, background: '#0f1a0f', color: '#fff',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      Reload Aellux
    </button>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<CrashFallback />}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
