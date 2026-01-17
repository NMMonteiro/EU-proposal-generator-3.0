import React from 'react';
import { ArrowLeft, Download, Share2, Settings, Edit, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ViewerHeaderProps {
    title: string;
    schemeName?: string;
    onBack: () => void;
    onExport: () => void;
    isExporting: boolean;
    onSettingsOpen: () => void;
    onAiEditOpen: () => void;
    onCopilotOpen: () => void;
}

export function ViewerHeader({
    title,
    schemeName,
    onBack,
    onExport,
    isExporting,
    onSettingsOpen,
    onAiEditOpen,
    onCopilotOpen
}: ViewerHeaderProps) {
    return (
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-accent transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate max-w-[400px]">
                            {title || 'Untitled Proposal'}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="font-medium px-2 py-0 text-[10px] uppercase tracking-wider bg-primary/10 text-primary border-none">
                                {schemeName || 'Generic Scheme'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Draft v2.0</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onCopilotOpen} className="hidden sm:flex gap-2 border-primary/20 hover:bg-primary/5 transition-all text-primary font-semibold">
                        <MessageSquare className="w-4 h-4" />
                        Copilot
                    </Button>
                    <Button variant="outline" size="sm" onClick={onAiEditOpen} className="hidden sm:flex gap-2 hover:bg-amber-500/5 hover:border-amber-500/20 transition-all text-amber-600 font-semibold border-amber-500/20">
                        <Sparkles className="w-4 h-4" />
                        AI Editor
                    </Button>
                    <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                    <Button variant="outline" size="sm" onClick={onSettingsOpen} className="hidden sm:flex gap-2 bg-background/50 backdrop-blur-sm border-white/10 hover:border-primary/50 transition-all font-medium">
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
                    <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                        <Share2 className="w-4 h-4" />
                        Share
                    </Button>
                    <Button size="sm" onClick={onExport} disabled={isExporting} className="gap-2 bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all font-semibold">
                        <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                        {isExporting ? 'Exporting...' : 'Export DOCX'}
                    </Button>
                </div>
            </div>
        </header>
    );
}
