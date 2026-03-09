import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { App } from '@/app/App';
import './index.css';

// Apply dark class to <html> so Radix portals (dialogs, tooltips, etc.)
// which render into document.body also inherit the dark theme.
document.documentElement.classList.add('dark');

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <TooltipProvider delayDuration={300}>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
