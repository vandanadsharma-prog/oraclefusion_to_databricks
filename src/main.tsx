
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Missing root element: <div id="root"></div>');
}

const root = createRoot(rootEl);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  render() {
    if (this.state.error) {
      const msg =
        this.state.error instanceof Error
          ? this.state.error.stack || this.state.error.message
          : String(this.state.error);
      return (
        <div
          style={{
            padding: 16,
            fontFamily: 'ui-monospace,Consolas,monospace',
            fontSize: 12,
            color: '#b91c1c',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 8,
            margin: 16,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {`Render error:\n\n${msg}`}
        </div>
      );
    }
    return this.props.children;
  }
}

root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
  
