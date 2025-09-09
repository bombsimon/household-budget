import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './mobile.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter
        basename={import.meta.env.PROD ? '/household-budget' : undefined}
      >
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
