
import React, { ReactNode } from 'react';

// Using optional children in Props to fix "Property 'children' is missing" errors in main.tsx
interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  stack?: string;
}

/**
 * AppErrorBoundary handles runtime errors and prevents total system failure.
 * Updated to use React.Component and explicit property declaration to resolve 
 * "Property 'state' does not exist on type 'AppErrorBoundary'" errors.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  // Explicitly define state property for the class to ensure it's tracked by TypeScript
  public state: State = {
    hasError: false,
    message: ''
  };

  constructor(props: Props) {
    super(props);
    // Initialize state in constructor as well for base class consistency
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: any): State {
    return {
      hasError: true,
      message: String(err?.message || err || 'Erro desconhecido'),
      stack: String(err?.stack || '')
    };
  }

  componentDidCatch(err: any) {
    try {
      localStorage.setItem(
        'cm_last_boot_error',
        JSON.stringify({
          message: String(err?.message || err),
          stack: String(err?.stack || '')
        })
      );
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', padding: 16, fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', paddingTop: 24 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>
              Falha ao iniciar o app
            </h1>
            <pre style={{
              whiteSpace: 'pre-wrap',
              background: '#0b1220',
              padding: 12,
              borderRadius: 12,
              overflow: 'auto',
              fontSize: 12,
              lineHeight: 1.5,
              border: '1px solid #1e293b'
            }}>
              {this.state.message}
              {"\n\n"}
              {this.state.stack || ''}
            </pre>

            <button
              style={{
                marginTop: 12,
                padding: '12px 20px',
                borderRadius: 12,
                background: '#2563eb',
                color: 'white',
                fontWeight: 800,
                border: 0,
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontSize: 12
              }}
              onClick={() => location.reload()}
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    // Correctly return children from props, ensuring null fallback if undefined
    return this.props.children || null;
  }
}
