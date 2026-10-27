import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";

export function NotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That address doesn’t lead anywhere."
        action={
          <Link to="/chat" className="press mt-1 inline-flex h-11 items-center rounded-control bg-accent px-5 text-subhead font-semibold text-accent-fg">
            Back to messages
          </Link>
        }
      />
    </div>
  );
}
