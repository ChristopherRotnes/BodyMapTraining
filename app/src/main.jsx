import './styles/carbon.scss';
import './styles/carbon-tokens.css';
import './styles/app.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './theme.jsx'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import DevErrorOverlay from './components/DevErrorOverlay.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      {import.meta.env.DEV && <DevErrorOverlay />}
    </ThemeProvider>
  </StrictMode>,
)
