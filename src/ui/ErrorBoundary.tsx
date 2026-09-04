/**
 * Error boundary scoped to one fan-out unit.
 *
 * Fleet queries every project independently, so a project the user cannot read
 * — or one whose dataset was renamed — must fail inside its own card and leave
 * the rest of the view intact.
 */
import {Component, type ErrorInfo, type ReactNode} from 'react'

interface Props {
  children: ReactNode
  fallback: (error: unknown) => ReactNode
}

interface State {
  error: unknown
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {error: null}

  static getDerivedStateFromError(error: unknown): State {
    return {error}
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Surfaced in the console so a failing project is debuggable without
    // hunting through the UI.
    console.error('[fleet] render failed', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) return this.props.fallback(this.state.error)
    return this.props.children
  }
}
