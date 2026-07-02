
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

interface Props {
  children: React.ReactNode;
  onRetry: () => void;
}

export function APIErrorBoundary({ children, onRetry }: Props) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h3 className="font-semibold tracking-tight">Something went wrong</h3>
          <p className="text-sm text-muted-foreground">Failed to load data</p>
        </div>
        <Button onClick={onRetry}>Try Again</Button>
      </div>
    </div>
  );
}
