import React from 'react';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse relative overflow-hidden bg-slate-200/60 rounded ${className}`}
            role="status"
            aria-label="Loading..."
        >
            <div className="shimmer absolute inset-0" />
            <span className="sr-only">Loading...</span>
        </div>
    );
}

export function ProposalCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm premium-card">
            <Skeleton className="h-6 w-3/4 mb-4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 mb-2 rounded-md" />
            <Skeleton className="h-4 w-2/3 mb-4 rounded-md" />
            <div className="flex gap-2 mt-4">
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
        </div>
    );
}

export function PartnerCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm premium-card">
            <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="flex-1">
                    <Skeleton className="h-5 w-2/3 mb-2 rounded-md" />
                    <Skeleton className="h-4 w-1/2 mb-3 rounded-md" />
                    <Skeleton className="h-3 w-full mb-2 rounded-sm" />
                    <Skeleton className="h-3 w-4/5 rounded-sm" />
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
                    <Skeleton className="w-10 h-10 rounded" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
            ))}
        </div>
    );
}
