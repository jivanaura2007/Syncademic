import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getActiveTheme, applyTheme } from './services/theme';

// Initialize and apply persistent background color and theme variables
applyTheme(getActiveTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

