import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthSessionProvider } from './context/AuthSessionContext.tsx';
import { WebSocketProvider } from './context/webSocketContext.tsx';

createRoot(document.getElementById('root')!).render(
  <AuthSessionProvider>
    <WebSocketProvider>
      <App />
    </WebSocketProvider>
  </AuthSessionProvider>
)
