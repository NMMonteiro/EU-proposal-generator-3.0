import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'default' | 'outline' | 'ghost';
    };
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = ''
}: EmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 ${className}`}
            role="status"
            aria-live="polite"
        >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4 shadow-sm">
                <Icon className="w-8 h-8 text-slate-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {title}
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mb-6 leading-relaxed">
                {description}
            </p>
            {action && (
                <Button
                    onClick={action.onClick}
                    variant={action.variant || 'default'}
                    className="shadow-sm"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
}
