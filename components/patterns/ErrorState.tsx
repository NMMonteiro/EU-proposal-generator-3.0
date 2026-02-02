import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';

type ErrorSeverity = 'error' | 'warning' | 'info' | 'success';

interface ErrorStateProps {
    severity?: ErrorSeverity;
    title: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    technicalDetails?: string;
    className?: string;
}

const severityConfig = {
    error: {
        icon: XCircle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500',
        titleColor: 'text-red-900',
        textColor: 'text-red-700',
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-500',
        titleColor: 'text-yellow-900',
        textColor: 'text-yellow-700',
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-500',
        titleColor: 'text-blue-900',
        textColor: 'text-blue-700',
    },
    success: {
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-500',
        titleColor: 'text-green-900',
        textColor: 'text-green-700',
    },
};

export function ErrorState({
    severity = 'error',
    title,
    message,
    action,
    technicalDetails,
    className = ''
}: ErrorStateProps) {
    const [showDetails, setShowDetails] = React.useState(false);
    const config = severityConfig[severity];
    const Icon = config.icon;

    return (
        <div
            className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
            role="alert"
            aria-live="assertive"
        >
            <div className={`w-full max-w-md rounded-lg border ${config.borderColor} ${config.bgColor} p-6 shadow-sm`}>
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm`}>
                        <Icon className={`w-6 h-6 ${config.iconColor}`} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-semibold ${config.titleColor} mb-2`}>
                            {title}
                        </h3>
                        <p className={`text-sm ${config.textColor} leading-relaxed mb-4`}>
                            {message}
                        </p>

                        {technicalDetails && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className={`text-xs font-medium ${config.textColor} hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${severity}-500 rounded`}
                                    aria-expanded={showDetails}
                                >
                                    {showDetails ? 'Hide' : 'Show'} technical details
                                </button>
                                {showDetails && (
                                    <pre className={`mt-2 text-xs ${config.textColor} bg-white p-3 rounded border ${config.borderColor} overflow-x-auto`}>
                                        {technicalDetails}
                                    </pre>
                                )}
                            </div>
                        )}

                        {action && (
                            <Button
                                onClick={action.onClick}
                                variant="outline"
                                size="sm"
                                className="shadow-sm"
                            >
                                {action.label}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
