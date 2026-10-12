import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Dynamic canonical link injection for SPA SEO
if (typeof document !== 'undefined') {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', window.location.origin + window.location.pathname);
}

createRoot(document.getElementById('root')!).render(<App />);
