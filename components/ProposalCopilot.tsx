import React, { useState, useRef, useEffect } from 'react';
import { HiPaperAirplane, HiCpuChip, HiXMark, HiSparkles, HiOutlineArrowPath, HiUser } from 'react-icons/hi2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { serverUrl, publicAnonKey } from '../utils/supabase/info.tsx';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ProposalCopilotProps {
    isOpen: boolean;
    onClose: () => void;
    proposalId: string;
    onProposalUpdate: () => void;
}

export function ProposalCopilot({ isOpen, onClose, proposalId, onProposalUpdate }: ProposalCopilotProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am your EU Proposal Copilot. I can help you rewrite sections, update project metadata (like title or start date), or answer questions about your proposal. What would you like to do?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${serverUrl}/proposal-copilot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                    proposalId,
                    message: userMsg,
                    history: messages
                })
            });

            if (!res.ok) throw new Error('Failed to get response');
            const data = await res.json();

            setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);

            if (data.action) {
                onProposalUpdate();
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error processing your request." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Card className="fixed bottom-24 right-6 w-[400px] h-[600px] shadow-2xl flex flex-col z-[100] border-primary/20 bg-background/95 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                        <HiSparkles size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold">Proposal Copilot</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] opacity-80 font-medium">Active Intelligence</span>
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 text-primary-foreground hover:bg-white/20 rounded-full"
                >
                    <HiXMark size={20} />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                                m.role === 'user' ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                            )}>
                                {m.role === 'user' ? <HiUser size={16} /> : <HiCpuChip size={16} />}
                            </div>
                            <div className={cn(
                                "p-3 rounded-2xl text-sm max-w-[85%] shadow-sm",
                                m.role === 'user'
                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                    : "bg-muted/80 backdrop-blur-sm text-foreground rounded-tl-none border border-border/50"
                            )}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                                <HiCpuChip size={16} />
                            </div>
                            <div className="bg-muted/50 border border-border rounded-2xl p-3 flex items-center gap-2">
                                <HiOutlineArrowPath size={16} className="animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground font-medium">Synthesizing...</span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-muted/30">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me to rewrite a section or update metadata..."
                        className="flex-1 bg-background border-primary/10 focus-visible:ring-primary shadow-sm"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLoading || !input.trim()}
                        className="bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all"
                    >
                        <HiPaperAirplane size={18} />
                    </Button>
                </form>
            </div>
        </Card>
    );
}
