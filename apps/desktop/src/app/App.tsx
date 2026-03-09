import { Sidebar } from '@/components/sidebar/Sidebar';
import { Workspace } from '@/components/workspace/Workspace';
import { ConnectionProvider } from '@/hooks/use-connections';
import { SettingsProvider } from '@/hooks/use-settings';
import { Toaster } from '@/components/ui/sonner';

export function App() {
  return (
    <SettingsProvider>
      <ConnectionProvider>
        <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
          <Sidebar />
          <Workspace />
        </div>
        <Toaster position="bottom-right" />
      </ConnectionProvider>
    </SettingsProvider>
  );
}
