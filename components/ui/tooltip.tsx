import React, { useState } from 'react';

// Simple Tailwind-based Tooltip without external deps
// This mimics the 'radix' primitive structure loosely but simplified

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

interface TooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    delayDuration?: number;
}

export function Tooltip({ children, content, delayDuration = 200 }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();

    const show = () => {
        const id = setTimeout(() => setIsVisible(true), delayDuration);
        setTimeoutId(id);
    };

    const hide = () => {
        clearTimeout(timeoutId);
        setIsVisible(false);
    };

    return (
        <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
            {children}
            {isVisible && (
                <div
                    role="tooltip"
                    className="absolute z-50 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md shadow-md animate-in fade-in zoom-in-95 duration-200 bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap"
                >
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                </div>
            )}
        </div>
    );
}
