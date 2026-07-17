import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./polyfills";
import { App } from "@/app/app";
import { registerDefaultRenderers } from "@/components/workspace/renderers/default-renderers";
import { registerPgVectorRenderers } from "@/components/workspace/renderers/pgvector-renderers";
import { registerPostGISRenderers } from "@/components/workspace/renderers/postgis-renderers";
import { registerDefaultEditors } from "@/components/workspace/renderers/edit-registry";
import { registerPostGISEditor } from "@/components/workspace/renderers/postgis-editor";
import "./index.css";

registerDefaultRenderers();
registerPgVectorRenderers();
registerPostGISRenderers();
registerDefaultEditors();
registerPostGISEditor();

function RendererReadySignal() {
  useEffect(() => {
    console.info("[pg-compass] renderer-mounted");
  }, []);
  return null;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <TooltipProvider delayDuration={300}>
      <RendererReadySignal />
      <App />
    </TooltipProvider>
  </StrictMode>,
);
