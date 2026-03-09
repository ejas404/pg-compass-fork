import { Sidebar } from '@/components/sidebar/Sidebar';
import { Workspace } from '@/components/workspace/Workspace';
import { ConnectionProvider } from '@/hooks/use-connections';
import { SettingsProvider } from '@/hooks/use-settings';
import { WorkspaceProvider } from '@/hooks/use-workspace';
import { Toaster } from '@/components/ui/sonner';
import { registerDefaultRenderers } from '@/components/workspace/renderers/default-renderers';
import { registerPgVectorRenderers } from '@/components/workspace/renderers/pgvector-renderers';
import { registerPostGISRenderers } from '@/components/workspace/renderers/postgis-renderers';

registerDefaultRenderers();
registerPgVectorRenderers();
registerPostGISRenderers();

export function App() {
  return (
    <SettingsProvider>
      <ConnectionProvider>
        <WorkspaceProvider>
          <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
            <Sidebar />
            <Workspace />
          </div>
        </WorkspaceProvider>
        <Toaster position="bottom-right" />
      </ConnectionProvider>
    </SettingsProvider>
  );
}
