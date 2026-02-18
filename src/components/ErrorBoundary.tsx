import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
                    <div className="text-center max-w-md">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h1
                            className="text-2xl font-bold text-gray-800 mb-3"
                            style={{ fontFamily: 'Amiri, serif' }}
                        >
                            حدث خطأ غير متوقع
                        </h1>
                        <p
                            className="text-gray-600 mb-6"
                            style={{ fontFamily: 'Noto Sans Arabic, sans-serif' }}
                        >
                            نعتذر عن هذا الخطأ. يرجى إعادة تحميل الصفحة.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
                            style={{ fontFamily: 'Noto Sans Arabic, sans-serif' }}
                        >
                            إعادة تحميل الصفحة
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
