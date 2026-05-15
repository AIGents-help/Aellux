import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './useAuth'
import App from './App'
import { initAnalytics } from './analytics'
import './index.css'
import './aellux-readability.css'
import './mobile.css'

// Boot analytics before render — captures landing pageview accurately
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
