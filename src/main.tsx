import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MakeApp from './MakeApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MakeApp />
  </StrictMode>,
)
