import React from 'react';
import { Check } from 'lucide-react';

// I'll stick to a safe utility function embedded here or minimal className logic to avoid import errors, until I'm 100% sure of the utils path.
// Actually, 'ProposalCopilot.tsx' had `import { Button } from '@/components/ui/button';` so `@/` alias IS likely configured.
// But 'Breadcrumbs.tsx' error was `Cannot find module '../../lib/utils'`.
// Let's assume `@/lib/utils` is safe if `@/components` works. 
// However, to be ultra-safe and avoid round-trips fixing imports:
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

export interface StepItem {
    id: string;
    label: string;
    description?: string;
}

interface ProgressStepsProps {
    steps: StepItem[];
    currentStepId: string;
    className?: string;
}

export function ProgressSteps({ steps, currentStepId, className }: ProgressStepsProps) {
    const currentIndex = steps.findIndex((s) => s.id === currentStepId);

    return (
        <nav aria-label="Progress" className={cn('w-full', className)}>
            <ol role="list" className="flex items-center w-full">
                {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = step.id === currentStepId;
                    const isLast = index === steps.length - 1;

                    return (
                        <li key={step.label} className={cn("relative flex items-center", isLast ? "flex-none" : "flex-1")}>
                            {/* Step indicator */}
                            <div className="group flex items-center">
                                <span className="flex items-center px-6 py-4 text-sm font-medium">
                                    <span
                                        className={cn(
                                            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                                            isCompleted ? "bg-primary text-white" : "",
                                            isCurrent ? "border-2 border-primary bg-white text-primary" : "",
                                            !isCompleted && !isCurrent ? "border-2 border-slate-200 bg-transparent text-slate-500" : ""
                                        )}
                                    >
                                        {isCompleted ? (
                                            <Check className="h-6 w-6" aria-hidden="true" />
                                        ) : (
                                            <span>{index + 1}</span>
                                        )}
                                    </span>
                                    <div className="ml-4 flex min-w-0 flex-col">
                                        <span
                                            className={cn(
                                                "text-sm font-bold uppercase tracking-wide",
                                                isCompleted || isCurrent ? "text-primary/90" : "text-slate-500"
                                            )}
                                        >
                                            {step.label}
                                        </span>
                                        {step.description && (
                                            <span className="text-sm text-slate-500 hidden md:block">{step.description}</span>
                                        )}
                                    </div>
                                </span>
                            </div>

                            {/* Connector line */}
                            {!isLast && (
                                <div className="absolute top-1/2 left-0 right-0 hidden w-full -translate-y-1/2 md:block pointer-events-none" aria-hidden="true">
                                    {/* This is a bit tricky to implement perfectly with flex-1 on simple flow. 
                       Let's do a simpler visual connector outside the text block.
                   */}
                                </div>
                            )}
                            {!isLast && (
                                <div className="flex-1 hidden md:block w-full h-0.5 mx-4 bg-slate-200" aria-hidden="true">
                                    <div
                                        className={cn("h-0.5 bg-primary transition-all duration-500 ease-in-out", isCompleted ? "w-full" : "w-0")}
                                    />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>

            {/* Mobile-optimized view (simple text status) */}
            <div className="md:hidden mt-2 px-2">
                <p className="text-sm font-medium text-slate-600">
                    Step {currentIndex + 1} of {steps.length}: <span className="text-slate-900 font-bold">{steps[currentIndex]?.label}</span>
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
                    />
                </div>
            </div>
        </nav>
    );
}
