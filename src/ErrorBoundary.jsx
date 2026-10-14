import React from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config'; //  المسار الصحيح
import { ensureFirebaseSession } from './utils/firebaseSession';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, errorInfo) {
    console.error('الخطأ:', error);
    console.error('مكان الخطأ:', errorInfo);

    try {
      const errorId = `ERR-${Date.now()}`;

      // ضمان جلسة (مجهولة إن لزم) قبل الكتابة — القواعد تشترط isSignedIn() للسجلات
      try { await ensureFirebaseSession(); } catch { /* تُحاول الكتابة على أي حال */ }

      await addDoc(collection(db, 'error_logs'), {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        time: serverTimestamp()
      });

      this.setState({ errorId });
    } catch (e) {
      console.error('فشل تسجيل الخطأ في Firestore:', e);
    }
  }

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  retryRender = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      showDetails: false
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'Tajawal',
            direction: 'rtl',
            background: 'var(--rz-ink)',
            color: 'var(--rz-ivory)',
            minHeight: '100vh'
          }}
        >
          <h2 style={{ color: 'var(--rz-primary)' }}> حدث خطأ غير متوقع</h2>

          <p
            style={{
              color: 'var(--rz-primary)',
              background: 'var(--rz-cream-4)',
              padding: '1rem',
              borderRadius: '8px',
              marginTop: '1rem'
            }}
          >
            {this.state.error?.message || 'حدث خطأ غير معروف'}
          </p>

          {this.state.errorId && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              رقم الخطأ: <strong>{this.state.errorId}</strong>
            </p>
          )}

          <button
            onClick={this.toggleDetails}
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1.2rem',
              cursor: 'pointer',
              background: 'var(--rz-primary)',
              color: 'var(--rz-white)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}
          >
            {this.state.showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>

          {this.state.showDetails && (
            <pre
              style={{
                textAlign: 'left',
                maxHeight: 250,
                overflow: 'auto',
                background: 'var(--rz-ink)',
                padding: 10,
                marginTop: '1rem',
                borderRadius: '8px',
                color: 'var(--rz-ivory)'
              }}
            >
              {this.state.error?.stack}
            </pre>
          )}

          <div style={{ marginTop: '2rem' }}>
            <button
              onClick={this.retryRender}
              style={{
                padding: '0.8rem 1.5rem',
                cursor: 'pointer',
                background: 'var(--rz-primary)',
                color: 'var(--rz-white)',
                border: 'none',
                borderRadius: '8px',
                marginRight: '10px'
              }}
            >
              إعادة المحاولة
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.8rem 1.5rem',
                cursor: 'pointer',
                background: 'var(--rz-ink)',
                color: 'var(--rz-white)',
                border: 'none',
                borderRadius: '8px'
              }}
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;