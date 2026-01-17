import React, { useState } from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info.tsx';

interface AiSectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    proposalId: string;
    sectionKey: string;
    sectionTitle: string;
    currentContent: string;
    onUpdate: (newContent: string) => void;
}

export function AiSectionDialog({
    isOpen,
    onClose,
    proposalId,
    sectionKey,
    sectionTitle,
    currentContent,
    onUpdate
}: AiSectionDialogProps) {
    const [instruction, setInstruction] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAiEdit = async () => {
        if (!instruction.trim()) return;

        setIsGenerating(true);
        const toastId = toast.loading('AI is working on your section...');

        try {
            const response = await fetch(`${serverUrl}/ai-edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                    proposalId,
                    sectionKey,
                    sectionTitle,
                    currentContent,
                    instruction
                })
            });

            if (!response.ok) throw new Error('AI Edit failed');

            const data = await response.json();
            if (data.newContent) {
                onUpdate(data.newContent);
                toast.success('Section updated by AI!', { id: toastId });
                setInstruction('');
                onClose();
            } else {
                throw new Error('No content returned from AI');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to edit section', { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-amber-500/20">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-full bg-amber-500/10">
                            <span className="text-amber-500"><Sparkles size={20} /></span>
                        </div>
                        <DialogTitle className="text-xl font-bold">AI Section Editor</DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                        Instruct the AI how to rewrite <span className="font-bold text-amber-600">"{sectionTitle}"</span>.
                        It has full context of the current content.
                    </p>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What should the AI do?</label>
                        <Textarea
                            placeholder="e.g., Make it more professional, add more statistics about the target group, or focus on the digital transformation aspect..."
                            className="min-h-[120px] resize-none focus-visible:ring-amber-500/30"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            disabled={isGenerating}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                    <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAiEdit}
                        disabled={isGenerating || !instruction.trim()}
                        className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 border-none"
                    >
                        {isGenerating ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                        {isGenerating ? 'Generating...' : 'Apply AI Edit'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
