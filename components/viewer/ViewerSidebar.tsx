import { FileText, Users, Calendar, Euro, AlertTriangle, LayoutGrid, ChevronDown, Paperclip } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { DisplaySection } from '../../utils/proposal-assembly';

interface ViewerSidebarProps {
    sections: DisplaySection[];
    activeTab: string;
    onTabChange: (tab: string) => void;
    currentSectionId?: string;
    onSectionClick: (id: string) => void;
    logicMode?: 'standard' | 'mobility' | 'lumpsum' | string;
}

export function ViewerSidebar({
    sections,
    activeTab,
    onTabChange,
    currentSectionId,
    onSectionClick,
    logicMode = 'standard'
}: ViewerSidebarProps) {
    const mainTabs = [
        { id: 'narrative', label: 'Proposal Narrative', icon: FileText },
        { id: 'partners', label: 'Partnership', icon: Users },
        { id: 'budget', label: 'Financial Plan', icon: Euro },
        { id: 'timeline', label: logicMode === 'mobility' ? 'Mobility Activities' : 'Work Plan', icon: Calendar },
        { id: 'risks', label: 'Risk Analysis', icon: AlertTriangle },
        { id: 'annexes', label: 'Annexes', icon: Paperclip },
    ];

    return (
        <aside className="w-80 border-r bg-muted/30 hidden lg:flex flex-col sticky top-16 h-[calc(100vh-64px)] overflow-hidden">
            <div className="p-4 border-b bg-background/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span className="text-primary"><LayoutGrid className="w-3.5 h-3.5" /></span>
                    Structure
                </h3>
            </div>

            <ScrollArea className="flex-1 px-3 py-4">
                <div className="space-y-6">
                    {/* Main Logical View Tabs */}
                    <div className="space-y-1">
                        {mainTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${activeTab === tab.id
                                    ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                                    }`}
                            >
                                <span className={`shrink-0 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                    <tab.icon className="w-4.5 h-4.5" />
                                </span>
                                {tab.label}
                                {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Narrative Structure (Sticky Sidebar Style) */}
                    {activeTab === 'narrative' && (
                        <div className="space-y-4 pt-4 border-t border-border/50">
                            <h4 className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Document Outline</h4>
                            <div className="space-y-0.5">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => onSectionClick(section.id)}
                                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-all flex items-start gap-2 group ${currentSectionId === section.id
                                            ? 'bg-accent text-accent-foreground font-semibold border-l-2 border-primary pl-2.5'
                                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                                            } ${section.level > 1 ? 'ml-4 opacity-80' : ''}`}
                                    >
                                        <div className="mt-1 w-1 h-1 rounded-full bg-border group-hover:bg-primary/50 shrink-0" />
                                        <span className="truncate">
                                            {logicMode === 'mobility'
                                                ? section.title.replace(/WP\s*(\d+)/gi, "Activity $1").replace(/Work\s*Package\s*(\d+)/gi, "Activity $1")
                                                : section.title
                                            }
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background/50 text-[10px] text-muted-foreground font-medium flex items-center justify-between">
                <span>Last saved: Just now</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/20 text-primary/70">Synced</Badge>
            </div>
        </aside>
    );
}
