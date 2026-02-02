import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';

interface InfoTooltipProps {
    content: string;
    className?: string;
}

export function InfoTooltip({ content, className }: InfoTooltipProps) {
    return (
        <Tooltip content={content}>
            <span className={`inline-flex items-center justify-center cursor-help text-muted-foreground hover:text-foreground transition-colors ${className || ''}`}>
                <Info className="w-4 h-4" />
                <span className="sr-only">More information</span>
            </span>
        </Tooltip>
    );
}
