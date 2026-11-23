import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion'
import { ThemeProvider } from './shared/ui/theme-provider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
)
