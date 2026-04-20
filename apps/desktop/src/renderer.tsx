import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import "./polyfills";
import { App } from '@/app/App';
import { registerDefaultRenderers } from '@/components/workspace/renderers/default-renderers';
import { registerPgVectorRenderers } from '@/components/workspace/renderers/pgvector-renderers';
import { registerPostGISRenderers } from '@/components/workspace/renderers/postgis-renderers';
import { registerDefaultEditors } from '@/components/workspace/renderers/edit-registry';
import { registerPostGISEditor } from '@/components/workspace/renderers/postgis-editor';
import './index.css';

registerDefaultRenderers();
registerPgVectorRenderers();
registerPostGISRenderers();
registerDefaultEditors();
registerPostGISEditor();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <TooltipProvider delayDuration={300}>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
