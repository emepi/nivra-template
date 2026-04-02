import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DAppKitProvider } from '@mysten/dapp-kit-react'
import { dAppKit } from './dapp-kit.ts'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DAppKitProvider dAppKit={dAppKit}>
      <App />
    </DAppKitProvider>
  </StrictMode>,
)
