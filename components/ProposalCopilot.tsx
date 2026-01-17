import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Sparkles, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { serverUrl, publicAnonKey } from '../utils/supabase/info.tsx';

// Simple utility for conditional classnames
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface ProposalCopilotProps {
    proposalId: string;
    isOpen: boolean;
    onClose: () => void;
    onProposalUpdate?: () => void;
}

export function ProposalCopilot({ proposalId, isOpen, onClose, onProposalUpdate }: ProposalCopilotProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm your Proposal Copilot. I have full context of your project, budget, and partners. How can I help you refine this proposal today?",
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history for API (exclude welcome message if needed, or map it)
            const history = messages.slice(1).map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await fetch(`${serverUrl}/proposal-copilot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({
                    proposalId,
                    message: userMsg.content,
                    history
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Copilot error response:', errorData);
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, aiMsg]);

            // Check if the backend performed an action
            if (data.action) {
                if (onProposalUpdate) {
                    onProposalUpdate();
                }
            }

        } catch (error: any) {
            console.error('Copilot error:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Error: ${error.message || "I'm sorry, I encountered an error connecting to the server."} Please try again.`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-6 bottom-24 w-[420px] h-[650px] bg-background border border-border shadow-2xl z-50 flex flex-col rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-foreground">Proposal Copilot</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Online Assistant</p>
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-9 w-9 hover:bg-red-100 hover:text-red-600 transition-all rounded-xl border border-border bg-background group"
                >
                    <X className="h-5 w-5 text-slate-600 group-hover:text-red-600 transition-colors" />
                </Button>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-3 max-w-[90%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>
                            <div className={cn(
                                "rounded-lg p-3 text-sm",
                                msg.role === 'user'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 border border-border"
                            )}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 max-w-[90%]">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-2"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me to edit, analyze, or suggest..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
