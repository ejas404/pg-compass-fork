import { Sidebar } from '@/components/sidebar/Sidebar';
import { Workspace } from '@/components/workspace/Workspace';

export function App() {
  return (
    <div className="dark flex h-full w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <Workspace />
    </div>
  );
}
