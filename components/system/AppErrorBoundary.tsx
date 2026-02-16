
import React, { ReactNode } from 'react';

// Added explicit interfaces for better type inference in class components
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  stack?: string;
}

// Updated class declaration to extend React.Component directly to ensure props and state are correctly typed
export class AppErrorBoundary extends React.Component<Props, State> {
  // Added comment: Initialize state explicitly
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: any) {
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

    // Added comment: Correctly access children from the component's props
    return this.props.children;
  }
}
