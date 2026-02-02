import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// I'll skip cn for now and use standard template literals if unsure, but usually 'lib/utils' or 'utils' has cn.
// Let's check where 'cn' comes from in other files. I'll peek at `components/ui/button.tsx` if I could, but I can't.
// Wait, `components/patterns/EmptyState.tsx` was created. Let me check imports there if available.
// Actually, I'll just use standard className string interpolation to be safe.

const routeLabels: Record<string, string> = {
    '': 'Home',
    'saved': 'Saved Proposals',
    'funding': 'Funding Explorer',
    'partners': 'Partners',
    'search': 'Search',
    'settings': 'Settings',
    'admin': 'Admin',
    'funding-schemes': 'Scheme Templates',
    'global-library': 'Knowledge Library',
    'proposals': 'Proposals',
    'summary': 'Summary',
    'test-export': 'Test Export'
};

interface BreadcrumbsProps {
    className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Don't show on dashboard/home if that is just '/'
    if (pathnames.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Breadcrumb" className={`mb-4 flex items-center text-sm text-muted-foreground ${className || ''}`}>
            <ol className="flex items-center gap-2">
                <li>
                    <Link
                        to="/"
                        className="flex items-center hover:text-foreground transition-colors"
                        aria-label="Home"
                    >
                        <Home className="h-4 w-4" />
                    </Link>
                </li>

                {pathnames.map((value, index) => {
                    const isLast = index === pathnames.length - 1;
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;

                    // Try to get a friendly label, fallback to proper casing of the path segment
                    let label = routeLabels[value] || value;

                    // If it looks like an ID (long alphanumeric), shorten or genericize
                    // Simple check: if it contains numbers and letters and is long, maybe showing "Details" or the ID shortened
                    if (value.length > 20 && /\d/.test(value)) {
                        label = 'Details';
                        // Ideally we'd look up the name, but for now this handles IDs gracefully
                    } else if (!routeLabels[value]) {
                        // Capitalize first letter
                        label = value.charAt(0).toUpperCase() + value.slice(1);
                    }

                    return (
                        <li key={to} className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                            {isLast ? (
                                <span className="font-medium text-foreground" aria-current="page">
                                    {label}
                                </span>
                            ) : (
                                <Link
                                    to={to}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
