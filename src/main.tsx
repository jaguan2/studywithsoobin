import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Inter was always in the font stack but never actually loaded — self-hosted
// via @fontsource so it's bundled into dist/ and works in the offline exe.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
