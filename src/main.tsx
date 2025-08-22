
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Remove loading indicator once React has mounted
setTimeout(() => {
  document.body.classList.add('app-ready');
}, 100);
