import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './mobile.css';
import App from './App.tsx';
import { initializeTaxService } from './services/taxService';

// Initialize tax service (preload tax table data)
initializeTaxService();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter
      basename={import.meta.env.PROD ? '/household-budget' : undefined}
    >
      <App />
    </BrowserRouter>
  </StrictMode>
);
