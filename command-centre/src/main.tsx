import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/layout.css';

// Theme bootstrap — runs before the app paints so a stored override never flashes.
(function () {
  let t = 'light';
  try { t = localStorage.getItem('unires.theme') || 'light'; } catch { /* noop */ }
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
