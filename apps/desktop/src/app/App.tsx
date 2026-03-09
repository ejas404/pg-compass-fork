import { Sidebar } from '@/components/sidebar/Sidebar';
import { Workspace } from '@/components/workspace/Workspace';
import { ConnectionProvider } from '@/hooks/use-connections';
import { Toaster } from '@/components/ui/sonner';

export function App() {
  return (
    <ConnectionProvider>
      <div className="dark flex h-full w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <Workspace />
      </div>
      <Toaster position="bottom-right" />
    </ConnectionProvider>
  );
}
