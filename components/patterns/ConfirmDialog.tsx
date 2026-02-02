import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
    confirmLabel?: string;
    cancelLabel?: string;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    variant = 'default',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel'
}: ConfirmDialogProps) {

    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] gap-6">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        {variant === 'destructive' && (
                            <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
                            {variant === 'destructive' && (
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Permanent Action</p>
                            )}
                        </div>
                    </div>
                    <DialogDescription className="pt-2 text-slate-500 leading-relaxed">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-medium">
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        className={`rounded-xl font-bold shadow-lg ${variant === 'destructive' ? 'shadow-red-50' : 'shadow-blue-50'}`}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
