import { Component } from "react";
import { Button } from "./ui/Button";

/** Last line of defence: a render error shows a calm screen, not a blank page. */
export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex h-dvh flex-col items-center justify-center gap-4 bg-canvas px-8 text-center text-ink">
        <h1 className="text-title2">Something went wrong</h1>
        <p className="max-w-[32ch] text-subhead text-ink-2">Your messages are safe. Reload to pick up where you left off.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }
}
