import React, { useState, useEffect } from 'react';
import {
    Building2,
    Globe,
    CheckCircle2,
    LayoutDashboard,
    Edit3,
    Plus,
    Users,
    Sparkles,
    Pencil,
    Search,
    Euro
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Partner } from '../types/partner';

// Helper to transform wide tables into responsive card lists
export function transformWideTables(html: string): string {
    if (!html || typeof window === 'undefined') return html;
    if (!html.includes('<table')) return html;

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tables = doc.querySelectorAll('table');
        let modified = false;

        tables.forEach(table => {
            const rows = Array.from(table.rows);
            if (rows.length === 0) return;

            const cellsPerRow = rows.map(r => r.cells.length);
            const maxCols = Math.max(...cellsPerRow);

            // PATTERN 1: Vertical Key-Value Table (1-col table where rows alternate between Question? and Answer)
            if (maxCols === 1 && rows.length >= 2) {
                const isKeyValue = rows.some(r => r.textContent?.trim().endsWith('?'));
                if (isKeyValue) {
                    modified = true;
                    const container = doc.createElement('div');
                    container.className = "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 my-6 bg-secondary/10 p-4 rounded-xl border border-border/40 not-prose";

                    for (let i = 0; i < rows.length; i++) {
                        const content = rows[i].textContent?.trim() || "";
                        if (!content) continue;

                        const itemDiv = doc.createElement('div');
                        itemDiv.className = "flex flex-col gap-1";

                        // If it ends with ? or looks like a label, make it bold/small
                        if (content.endsWith('?') || content.endsWith(':') || (i < rows.length - 1 && rows[i + 1].textContent?.length! > content.length * 2)) {
                            const label = doc.createElement('span');
                            label.className = "text-[10px] uppercase font-bold text-primary/70 tracking-wider";
                            label.textContent = content;
                            itemDiv.appendChild(label);

                            // Try to peek next row for the value
                            if (i < rows.length - 1 && !rows[i + 1].textContent?.trim().endsWith('?')) {
                                const value = doc.createElement('span');
                                value.className = "text-sm text-foreground/90 font-medium";
                                value.textContent = rows[i + 1].textContent?.trim() || "---";
                                itemDiv.appendChild(value);
                                i++; // Skip next
                            }
                        } else {
                            const value = doc.createElement('span');
                            value.className = "text-sm text-foreground/90 font-medium";
                            value.textContent = content;
                            itemDiv.appendChild(value);
                        }
                        container.appendChild(itemDiv);
                    }
                    table.replaceWith(container);
                    return;
                }
            }

            // PATTERN 2: Standard Wide Tables
            let headers: string[] = [];
            const thead = table.querySelector('thead');
            if (thead && thead.rows.length > 0) {
                headers = Array.from(thead.rows[0].cells).map(c => c.textContent?.trim() || "");
            } else {
                headers = Array.from(rows[0].cells).map(c => c.textContent?.trim() || "");
            }

            if (headers.length <= 4) return; // Only transform wide tables or handled key-value

            const dataRows = Array.from(table.querySelectorAll('tr')).filter(tr =>
                !tr.parentElement || tr.parentElement.tagName !== 'THEAD'
            );

            if (!thead && dataRows.length > 0 && headers.join('|') === Array.from(dataRows[0].cells).map(c => c.textContent?.trim() || "").join('|')) {
                dataRows.shift();
            }

            modified = true;
            const container = doc.createElement('div');
            container.className = "space-y-4 my-6 not-prose";

            dataRows.forEach((tr, idx) => {
                const cells = Array.from(tr.cells);
                const title = cells[0]?.textContent?.trim() || `Item ${idx + 1}`;

                const card = doc.createElement('div');
                card.className = "bg-card/50 border border-border/60 rounded-lg p-4 shadow-sm";

                const headerDiv = doc.createElement('div');
                headerDiv.className = "font-semibold text-base mb-3 text-primary border-b border-border/40 pb-2";
                headerDiv.textContent = title;
                card.appendChild(headerDiv);

                const contentGrid = doc.createElement('div');
                contentGrid.className = "grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

                cells.forEach((cell, cIdx) => {
                    if (cIdx === 0) return;

                    const label = headers[cIdx] || `Column ${cIdx + 1}`;
                    const value = cell.innerHTML.trim();
                    if (!value) return;

                    const fieldDiv = doc.createElement('div');
                    fieldDiv.className = "flex flex-col text-sm";

                    const labelSpan = doc.createElement('span');
                    labelSpan.className = "font-medium text-muted-foreground text-[10px] uppercase tracking-wider mb-1";
                    labelSpan.textContent = label;

                    const valueDiv = doc.createElement('div');
                    valueDiv.className = "text-foreground/90 text-xs break-words";
                    valueDiv.innerHTML = value;

                    fieldDiv.appendChild(labelSpan);
                    fieldDiv.appendChild(valueDiv);
                    contentGrid.appendChild(fieldDiv);
                });
                card.appendChild(contentGrid);
                container.appendChild(card);
            });

            table.replaceWith(container);
        });

        if (modified) return doc.body.innerHTML;
        return html;
    } catch (e) {
        console.error("Error transforming tables", e);
        return html;
    }
}

interface ResponsiveSectionContentProps {
    id?: string;
    title?: string;
    content: string;
    description?: string;
    level?: number;
    onEdit?: () => void;
    onAiEdit?: () => void;
    key?: React.Key;
}

export const ResponsiveSectionContent = ({
    id,
    title,
    content,
    description,
    level = 1,
    onEdit,
    onAiEdit
}: ResponsiveSectionContentProps) => {
    const [processed, setProcessed] = useState(content);

    useEffect(() => {
        setProcessed(transformWideTables(content));
    }, [content]);

    return (
        <div id={id} className="group relative">
            <div className="flex items-center justify-between mb-2">
                <div>
                    {title && (
                        <h2 className={`${level === 1 ? 'text-2xl font-bold' : 'text-xl font-semibold'} text-foreground/90`}>
                            {title}
                        </h2>
                    )}
                    {description && <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{description}</p>}
                </div>
                <div className="flex gap-1">
                    {onAiEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onAiEdit}
                            className="h-8 w-8 text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:text-amber-700 transition-all shadow-sm"
                            title="Edit with AI"
                        >
                            <Sparkles className="w-4 h-4 shrink-0" />
                        </Button>
                    )}
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onEdit}
                            className="h-8 w-8 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:text-blue-700 transition-all shadow-sm"
                            title="Manual Edit"
                        >
                            <Pencil className="w-4 h-4 shrink-0" />
                        </Button>
                    )}
                </div>
            </div>
            <div className={`prose prose-slate max-w-none text-muted-foreground/90 leading-relaxed ${level > 1 ? 'pl-4 border-l border-border/40' : ''}`} dangerouslySetInnerHTML={{ __html: processed }} />
        </div>
    );
};

export const DynamicWorkPackageSection = ({ workPackages, limitToIndex, currency, overrideWP, onlyOverview, logicMode = 'standard' }: { workPackages: any[], limitToIndex?: number, currency: string, overrideWP?: any, onlyOverview?: boolean, logicMode?: string }) => {
    if ((!workPackages || workPackages.length === 0) && !overrideWP) {
        return <div className="p-4 text-center text-muted-foreground italic border border-dashed rounded-lg">No {logicMode === 'mobility' ? 'activities' : 'work packages'} defined yet.</div>;
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Overview Mode: Show a summary table
    if (onlyOverview) {
        return (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="py-2 px-4 w-16">ID</th>
                            <th className="py-2 px-4">{logicMode === 'mobility' ? 'Activity' : 'Work Package'} Title</th>
                            <th className="py-2 px-4 text-right">Budget</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {workPackages.filter(wp => !!wp && !!wp.name).map((wp, idx) => {
                            const wpBudget = (wp.activities || []).reduce((sum: number, act: any) => sum + (act.estimatedBudget || 0), 0);
                            return (
                                <tr key={idx} className="bg-white/50 hover:bg-white transition-colors">
                                    <td className="py-2 px-4 font-bold text-primary">{logicMode === 'mobility' ? 'A' : 'WP'}{idx + 1}</td>
                                    <td className="py-2 px-4 font-medium text-slate-700">{wp.name}</td>
                                    <td className="py-2 px-4 text-right font-mono text-slate-500">{formatCurrency(wpBudget)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    const displayWPs = overrideWP
        ? [overrideWP]
        : (limitToIndex !== undefined ? [workPackages[limitToIndex]].filter(Boolean) : workPackages);

    if (displayWPs.length === 0) return null;

    return (
        <div className="space-y-6">
            {displayWPs.filter(wp => !!wp && !!wp.name).map((wp, i) => {
                const actualIndex = limitToIndex !== undefined ? limitToIndex : i;
                const wpBudget = (wp.activities || []).reduce((sum: number, act: any) => sum + (act.estimatedBudget || 0), 0);

                return (
                    <Card key={actualIndex} className="bg-card/30 border-border/40">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
                                        {logicMode === 'mobility' ? 'Activity' : 'WP'} {actualIndex + 1}
                                    </Badge>
                                    <CardTitle className="text-lg">{wp.name}</CardTitle>
                                    {logicMode === 'mobility' && wp.activityType && (
                                        <Badge variant="secondary" className="mt-1 text-[10px] uppercase">
                                            {wp.activityType.replace(/_/g, ' ')}
                                        </Badge>
                                    )}
                                </div>
                                {(wpBudget > 0 || wp.participants > 0) && (
                                    <div className="flex flex-col items-end gap-1">
                                        {wpBudget > 0 && (
                                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                {formatCurrency(wpBudget)}
                                            </Badge>
                                        )}
                                        {logicMode === 'mobility' && wp.participants > 0 && (
                                            <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {wp.participants} Pax | {wp.duration} Days
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="prose prose-invert prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: wp.description }} />

                            {/* Standard Sub-Activities Grid */}
                            {logicMode === 'standard' && wp.activities && wp.activities.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <span className="text-primary"><LayoutDashboard className="w-4 h-4" /></span>
                                        Tasks
                                    </h3>
                                    <div className="grid gap-3">
                                        {wp.activities.map((act: any, aIdx: number) => (
                                            <div key={aIdx} className="bg-slate-50/80 border border-slate-100 rounded-lg p-4 text-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-slate-800">
                                                        {actualIndex + 1}.{aIdx + 1} {act.name}
                                                    </span>
                                                    {act.estimatedBudget > 0 && (
                                                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                                                            {formatCurrency(act.estimatedBudget)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-slate-600 leading-relaxed text-xs" dangerouslySetInnerHTML={{ __html: act.description }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {wp.deliverables && wp.deliverables.length > 0 && (
                                <div className="bg-secondary/20 rounded-lg p-4 mt-6">
                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-3">Expected Deliverables / Outcomes</h5>
                                    <ul className="space-y-2">
                                        {wp.deliverables.map((del: string, dIdx: number) => (
                                            <li key={dIdx} className="flex items-start gap-2 text-xs">
                                                <span className="text-emerald-500 mt-0.5 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /></span>
                                                <span className="text-slate-600">{del}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export const MobilityActivitiesSection = ({ activities, currency }: { activities: any[], currency: string }) => {
    if (!activities || activities.length === 0) {
        return <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-muted-foreground italic">No mobility activities defined yet.</div>;
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="space-y-8">
            {activities.map((act, idx) => (
                <Card key={idx} className="border-border/60 shadow-sm overflow-hidden bg-card/50">
                    <CardHeader className="bg-primary/5 border-b border-border/40 py-4 px-6 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                                A{idx + 1}
                            </div>
                            <CardTitle className="text-lg font-bold">
                                {act.name.replace(/^(?:WP|Work[\s_-]*Packages?|Work[\s_-]*Plan)[\s_-]*\d+\s*[:\.-]*/i, '').trim() || act.name}
                            </CardTitle>
                        </div>
                        {act.activityType && (
                            <Badge variant="outline" className="border-primary/30 text-primary uppercase text-[10px] tracking-wider font-bold h-6 px-3">
                                {act.activityType.replace(/_/g, ' ')}
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-border/40">
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Participants</span>
                                <div className="flex items-center gap-2 text-foreground/90 font-bold">
                                    <Users className="w-4 h-4 text-primary" />
                                    {act.participants || 0} Pax
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Duration</span>
                                <div className="text-foreground/90 font-bold">
                                    {act.duration || 0} Days
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Destination</span>
                                <div className="flex items-center gap-2 text-foreground/90 font-bold">
                                    <Globe className="w-4 h-4 text-primary" />
                                    {act.destinationCountry || '---'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Budget Est.</span>
                                <div className="text-emerald-600 font-bold">
                                    {formatCurrency((act.activities || []).reduce((sum: number, a: any) => sum + (a.estimatedBudget || 0), 0))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase text-primary/70 tracking-widest">Activity Description & Learning Outcomes</h4>
                            <div className="prose prose-slate prose-sm max-w-none text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: act.description }} />
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border/20">
                            {act.fewerOpportunities > 0 && <Badge variant="secondary" className="gap-1 bg-amber-50 text-amber-700 border-amber-200"><Sparkles className="w-3 h-3" /> {act.fewerOpportunities} Fewer Opp.</Badge>}
                            {act.greenTravel && <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">🌱 Green Travel</Badge>}
                            {act.blendedMobility && <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">💻 Blended</Badge>}
                            {act.accompanyingPersons > 0 && <Badge variant="secondary" className="gap-1 bg-slate-50 text-slate-700 border-slate-200"><Users className="w-3 h-3" /> {act.accompanyingPersons} Accompanying</Badge>}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export const DynamicBudgetSection = ({
    budget,
    currency,
    limit,
    onRebalance
}: {
    budget: any[],
    currency: string,
    limit?: number,
    onRebalance?: (limit: number) => void
}) => {
    if (!budget || budget.length === 0) return null;
    if (!budget || budget.length === 0) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const total = budget.reduce((sum, item) => sum + (item.cost || 0), 0);

    return (
        <div className="space-y-4">
            <div className="border rounded-xl overflow-hidden border-border/40 bg-card/20">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-secondary/40">
                        <tr className="border-b border-border/40">
                            <th className="text-left py-3 px-4 font-semibold text-foreground/70 w-1/2">Item & Description</th>
                            <th className="text-right py-3 px-4 font-semibold text-foreground/70">Cost</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                        {budget.filter(item => !!item && !!item.item).map((item, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4">
                                    <div className="font-medium text-foreground/90">{item.item}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-primary/90">
                                    {formatCurrency(item.cost)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-primary/5">
                        <tr className="font-bold border-t border-primary/20">
                            <td className="py-3 px-4 text-foreground/90">Total Estimated Budget</td>
                            <td className="py-3 px-4 text-right font-mono text-primary">
                                {formatCurrency(total)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export const MobilityBudgetSection = ({
    budget,
    currency,
    mobilityMetadata,
    activities = [],
    proposalId
}: {
    budget: any[],
    currency: string,
    mobilityMetadata?: any,
    activities?: any[],
    proposalId?: string
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Group budget items by type for mobility
    const categories = [
        { key: 'organis', label: 'Organisational Support', icon: Building2 },
        { key: 'travel', label: 'Travel', icon: Globe },
        { key: 'individual', label: 'Individual Support', altKey: 'subsistence', icon: Users },
        { key: 'inclusion', label: 'Inclusion Support', icon: CheckCircle2 },
        { key: 'fees', label: 'Course Fees', altKey: 'course', icon: LayoutDashboard },
        { key: 'linguistic', label: 'Linguistic Support', icon: Sparkles },
        { key: 'preparatory', label: 'Preparatory Visits', icon: Search },
    ];

    const total = budget.reduce((sum, item) => sum + (Number(item.cost) || Number(item.total) || 0), 0);
    const matchedIds = new Set<number>();

    // Helper to match items to categories
    const getItemsForCategory = (cat: any) => {
        return budget.filter((item, idx) => {
            const name = (item.item || item.name || "").toLowerCase();
            const desc = (item.description || "").toLowerCase();
            const category = (item.category || "").toLowerCase();

            const isMatch = name.includes(cat.key) ||
                desc.includes(cat.key) ||
                category.includes(cat.key) ||
                (cat.altKey && (name.includes(cat.altKey) || desc.includes(cat.altKey) || category.includes(cat.altKey)));

            if (isMatch) matchedIds.add(idx);
            return isMatch;
        });
    };

    if (budget.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-muted/20 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary"><LayoutDashboard className="w-6 h-6" /></span>
                </div>
                <div className="max-w-md">
                    <h3 className="text-lg font-bold text-foreground">No Budget Items Detected</h3>
                    <p className="text-muted-foreground text-sm mt-2">
                        The financial plan is currently empty. If you just ran a SQL script, please ensure it targeted the correct Proposal ID:
                    </p>
                    <code className="block mt-3 p-2 bg-black/5 rounded font-mono text-xs break-all border border-border/20">
                        {proposalId || "Unknown ID"}
                    </code>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="text-[10px] uppercase font-bold text-primary/70 tracking-wider">Total Grant Requested</div>
                        <div className="text-3xl font-black text-primary mt-1">{formatCurrency(total)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Budget Summary Table (Replicating PDF Page 21) */}
            <Card className="border-border/60 shadow-sm overflow-hidden bg-card/50">
                <CardHeader className="bg-primary/5 py-3 px-4 border-b border-border/40">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4 text-primary" />
                        Project Budget Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse" style={{ minWidth: '800px' }}>
                        <thead className="bg-slate-50 border-b border-border/40">
                            <tr>
                                <th className="py-2 px-4 font-bold text-[10px] text-muted-foreground uppercase tracking-wider sticky left-0 bg-slate-50 z-10">Activity Type</th>
                                {categories.map(cat => (
                                    <th key={cat.key} className="py-2 px-2 font-bold text-[10px] text-muted-foreground text-right uppercase tracking-wider whitespace-nowrap">
                                        {cat.label.replace(' Support', '').replace(' Individual', 'Indiv.').replace('Preparatory Visits', 'Prep. Visits')}
                                    </th>
                                ))}
                                <th className="py-2 px-4 font-bold text-[10px] text-primary text-right bg-primary/5 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {(activities.length > 0 ? activities : [{ name: 'Mobility Project' }]).map((act, idx) => {
                                const actName = typeof act === 'string' ? act : (act.name?.replace(/^(?:WP|Work[\s_-]*Packages?|Work[\s_-]*Plan)[\s_-]*\d+\s*[:\.-]*/i, '').trim() || 'Mobility Activity');
                                let rowTotal = 0;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-2 px-4 font-medium text-slate-700 text-xs sticky left-0 bg-white/80 backdrop-blur-sm z-10">{actName}</td>
                                        {categories.map(cat => {
                                            const catItems = budget.filter(b => {
                                                const bName = (b.item || "").toLowerCase();
                                                const bDesc = (b.description || "").toLowerCase();
                                                const isCatMatch = bName.includes(cat.key) ||
                                                    bDesc.includes(cat.key) ||
                                                    (cat.altKey && (bName.includes(cat.altKey) || bDesc.includes(cat.altKey)));

                                                if (!isCatMatch) return false;

                                                // If multiple activities, try to match activity context (relaxed)
                                                if (activities.length > 1) {
                                                    const cleanActName = actName.toLowerCase();
                                                    // Match if activity name is in description or vice versa
                                                    // OR if they share a significant word (like 'Spain', 'Finland', 'Job')
                                                    const significantWords = cleanActName.split(/\s+/).filter(w => w.length > 4);
                                                    return bDesc.includes(cleanActName) ||
                                                        cleanActName.includes(bDesc) ||
                                                        significantWords.some(w => bDesc.includes(w) || bName.includes(w));
                                                }
                                                return true;
                                            });
                                            const cost = catItems.reduce((sum, b) => sum + (Number(b.cost) || Number(b.total) || 0), 0);
                                            rowTotal += cost;
                                            return (
                                                <td key={cat.key} className="py-2 px-2 text-right font-mono text-[11px] text-slate-600">
                                                    {cost > 0 ? cost.toLocaleString() : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="py-2 px-4 text-right font-bold text-xs text-primary bg-primary/5">{rowTotal > 0 ? formatCurrency(rowTotal) : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-100/50 border-t-2 border-border/40">
                            <tr className="font-bold text-xs">
                                <td className="py-3 px-4 text-slate-900 sticky left-0 bg-slate-100/80 backdrop-blur-sm z-10">Total Grant (EUR)</td>
                                {categories.map(cat => {
                                    const catTotal = budget.filter(b => {
                                        const bName = (b.item || "").toLowerCase();
                                        const bDesc = (b.description || "").toLowerCase();
                                        return bName.includes(cat.key) ||
                                            bDesc.includes(cat.key) ||
                                            (cat.altKey && (bName.includes(cat.altKey) || bDesc.includes(cat.altKey)));
                                    }).reduce((sum, b) => sum + (Number(b.cost) || Number(b.total) || 0), 0);
                                    return (
                                        <td key={cat.key} className="py-3 px-2 text-right font-mono text-slate-900">
                                            {catTotal.toLocaleString()}
                                        </td>
                                    );
                                })}
                                <td className="py-3 px-4 text-right font-black text-primary bg-primary/10">{formatCurrency(total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {categories.map((cat) => {
                    const items = getItemsForCategory(cat);
                    if (items.length === 0) return null;

                    const catTotal = items.reduce((sum, item) => sum + (Number(item.cost) || Number(item.total) || 0), 0);

                    return (
                        <Card key={cat.key} className="border-border/40 overflow-hidden">
                            <CardHeader className="bg-secondary/10 py-3 px-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <span className="text-primary"><cat.icon className="w-4 h-4" /></span>
                                    {cat.label}
                                </CardTitle>
                                <Badge variant="outline" className="font-mono text-xs">{formatCurrency(catTotal)}</Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-border/40">
                                        <tr>
                                            <th className="py-2 px-4 font-semibold text-muted-foreground">Item Description</th>
                                            <th className="py-2 px-4 font-semibold text-muted-foreground text-right w-32">Grant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-2.5 px-4 text-slate-700">
                                                    <div className="font-medium">{item.item}</div>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5">{item.description}</div>
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                                                    {formatCurrency(Number(item.cost) || Number(item.total) || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Catch-all for unmatched items */}
                {budget.some((_, idx) => !matchedIds.has(idx)) && (
                    <Card className="border-border/40 overflow-hidden border-dashed border-2">
                        <CardHeader className="bg-slate-50 py-3 px-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <span className="text-slate-400"><LayoutDashboard className="w-4 h-4" /></span>
                                Other Project Costs
                            </CardTitle>
                            <Badge variant="outline" className="font-mono text-xs">
                                {formatCurrency(budget.reduce((sum, item, idx) => !matchedIds.has(idx) ? sum + (Number(item.cost) || Number(item.total) || 0) : sum, 0))}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-xs text-left border-collapse">
                                <tbody className="divide-y divide-border/20">
                                    {budget.map((item, idx) => {
                                        if (matchedIds.has(idx)) return null;
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-2.5 px-4 text-slate-700">
                                                    <div className="font-bold">{item.item}</div>
                                                    <div className="text-[10px] text-muted-foreground">{item.description}</div>
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                                                    {formatCurrency(Number(item.cost) || Number(item.total) || 0)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export const DynamicRiskSection = ({ risks }: { risks: any[] }) => {
    if (!risks || risks.length === 0) return null;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {risks.filter(risk => !!risk && !!risk.risk).map((risk, i) => (
                <Card key={i} className="bg-card/30 border-border/40 hover:border-primary/20 transition-all">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-sm font-bold text-foreground/90">{risk.risk}</CardTitle>
                            <Badge variant={risk.impact?.toLowerCase().includes('high') ? 'destructive' : 'secondary'} className="text-[9px] uppercase">
                                {risk.impact} Impact
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Likelihood:</span>
                            <span className="font-medium">{risk.likelihood}</span>
                        </div>
                        <div className="pt-2 border-t border-border/20">
                            <span className="text-[10px] uppercase font-bold text-primary/70 block mb-1">Mitigation Strategy</span>
                            <p className="text-xs text-muted-foreground leading-relaxed italic">"{risk.mitigation}"</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export const DynamicPartnerSection = ({
    partners,
    onAddPartner
}: {
    partners: Partner[];
    onAddPartner?: () => void;
}) => {
    if (!partners || partners.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-muted/20 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary"><Users className="w-6 h-6" /></span>
                </div>
                <div>
                    <p className="text-muted-foreground font-medium italic">No partners added to this consortium yet.</p>
                </div>
                {onAddPartner && (
                    <Button onClick={onAddPartner} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Partner
                    </Button>
                )}
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <span className="text-primary"><Users className="w-5 h-5" /></span>
                    Partnership Consortium
                </CardTitle>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onAddPartner} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Manage Partners
                    </Button>
                </div>
            </CardHeader>
            {partners.filter(p => !!p && !!p.name).map((p, i) => (
                <Card key={i} className="bg-card/50 border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-primary flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {p.logoUrl ? (
                                    <div className="w-10 h-10 bg-white rounded-lg border border-border/40 flex items-center justify-center p-1 overflow-hidden shrink-0">
                                        <img src={p.logoUrl} alt={p.name} className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <span className="opacity-70"><Building2 className="w-5 h-5" /></span>
                                )}
                                <span className="truncate">{p.name}</span>
                            </div>
                            {p.isCoordinator && <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0">Coordinator</Badge>}
                        </CardTitle>
                        {p.country && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="opacity-70"><Globe className="w-3 h-3" /></span>
                                {p.country} {p.city ? `(${p.city})` : ''}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/20 p-4 rounded-xl border border-border/40">
                            {p.organisationId && (
                                <div className="flex flex-col">
                                    <span className="font-bold text-[10px] uppercase text-primary/70 tracking-wider">OID / PIC</span>
                                    <span className="font-mono text-xs">{p.organisationId}</span>
                                </div>
                            )}
                            {p.organizationType && (
                                <div className="flex flex-col">
                                    <span className="font-bold text-[10px] uppercase text-primary/70 tracking-wider">Type</span>
                                    <span className="text-xs">{p.organizationType}</span>
                                </div>
                            )}
                            {p.vatNumber && (
                                <div className="flex flex-col">
                                    <span className="font-bold text-[10px] uppercase text-primary/70 tracking-wider">VAT</span>
                                    <span className="font-mono text-xs">{p.vatNumber}</span>
                                </div>
                            )}
                        </div>

                        {p.description && (
                            <div className="prose prose-invert prose-sm max-w-none text-muted-foreground/90 bg-black/10 p-4 rounded-lg border border-border/20">
                                <p>{p.description}</p>
                            </div>
                        )}

                        {p.experience && (
                            <div>
                                <h5 className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-2">Relevant Expertise</h5>
                                <div className="text-sm text-muted-foreground/90 bg-secondary/10 p-3 rounded-lg border border-border/20 italic">
                                    {p.experience}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
