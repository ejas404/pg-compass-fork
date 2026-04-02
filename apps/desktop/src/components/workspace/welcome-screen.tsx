import { Compass } from "lucide-react";

export function WelcomeScreen() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="rounded-xl bg-muted p-4">
          <Compass className="size-10 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">
            Welcome to PG Compass
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Connect to a PostgreSQL database using the sidebar to start
            exploring your schemas and tables.
          </p>
        </div>
      </div>
    </div>
  );
}