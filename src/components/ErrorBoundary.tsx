import React, { ErrorInfo, ReactNode } from "react";
import ErrorScreen from "../screens/error-screen";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console or error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={() =>
            this.setState({
              hasError: false,
              error: undefined,
              errorInfo: undefined,
            })
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
