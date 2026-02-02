import React from 'react';
import { Badge } from '../ui/badge';
import { CheckCircle, Clock, AlertCircle, XCircle, HelpCircle } from 'lucide-react';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending' | 'active' | 'inactive';

// Helper to map generic status strings to our visual variants
const getStatusConfig = (status: string) => {
    const s = status.toLowerCase();

    if (s.includes('success') || s.includes('complete') || s === 'active' || s === 'published' || s === 'approved') {
        return { variant: 'success' as const, icon: CheckCircle };
    }
    if (s.includes('warn') || s.includes('pending') || s.includes('progress') || s === 'draft') {
        return { variant: 'warning' as const, icon: Clock };
    }
    if (s.includes('error') || s.includes('fail') || s === 'rejected' || s === 'inactive') {
        return { variant: 'destructive' as const, icon: XCircle };
    }
    if (s.includes('info') || s === 'new') {
        return { variant: 'default' as const, icon: AlertCircle };
    }

    return { variant: 'secondary' as const, icon: HelpCircle };
};

interface StatusBadgeProps {
    status: string;
    label?: string;
    className?: string;
    showIcon?: boolean;
}

export function StatusBadge({ status, label, className, showIcon = true }: StatusBadgeProps) {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

    return (
        <Badge variant={config.variant} className={`gap-1.5 ${className || ''}`}>
            {showIcon && <Icon className="w-3.5 h-3.5" />}
            {displayLabel}
        </Badge>
    );
}
