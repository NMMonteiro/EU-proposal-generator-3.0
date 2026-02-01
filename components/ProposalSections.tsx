import React, { useState, useEffect } from 'react';
import {
    Building2,
    Globe,
    CheckCircle2,
    Settings2,
    Trash2,
    PlusSquare,
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
                const title = cells[0]?.textContent?.trim() || `Item ${idx + 1} `;

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

                    const label = headers[cIdx] || `Column ${cIdx + 1} `;
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

export const DynamicWorkPackageSection = ({
    workPackages,
    limitToIndex,
    currency,
    overrideWP,
    onlyOverview,
    logicMode = 'standard',
    onUpdateWP,
    onAddWP,
    onRemoveWP,
    onUpdateActivity,
    onAddActivity,
    onRemoveActivity
}: {
    workPackages: any[],
    limitToIndex?: number,
    currency: string,
    overrideWP?: any,
    onlyOverview?: boolean,
    logicMode?: string,
    onUpdateWP?: (index: number, updates: any) => void,
    onAddWP?: () => void,
    onRemoveWP?: (index: number) => void,
    onUpdateActivity?: (wpIndex: number, actIndex: number, updates: any) => void,
    onAddActivity?: (wpIndex: number) => void,
    onRemoveActivity?: (wpIndex: number, actIndex: number) => void
}) => {
    const [isEditing, setIsEditing] = useState(false);
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
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-card/50 p-6 rounded-2xl border border-border/40 backdrop-blur-sm">
                <div>
                    <h2 className="text-xl font-bold text-foreground/90">Work Plan & Work Packages</h2>
                    <p className="text-sm text-muted-foreground mt-1">Detailed breakdown of project activities and deliverables.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className={`gap-2 h-9 border border-border/40 ${isEditing ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-background hover:bg-secondary'}`}
                    >
                        {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                        {isEditing ? 'Finish Editing' : 'Edit Plan'}
                    </Button>
                    {isEditing && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onAddWP?.()}
                            className="gap-2 h-9 shadow-lg bg-gradient-to-tr from-primary to-primary/80"
                        >
                            <Plus className="w-4 h-4" /> Add Section
                        </Button>
                    )}
                </div>
            </div>

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
                                    <CardTitle className="text-lg">
                                        {isEditing ? (
                                            <input
                                                className="bg-background/50 border border-border/40 rounded px-2 py-1 font-bold w-full"
                                                value={wp.name || ''}
                                                onChange={(e) => onUpdateWP?.(actualIndex, { name: e.target.value })}
                                            />
                                        ) : (
                                            wp.name
                                        )}
                                    </CardTitle>
                                    {logicMode === 'mobility' && wp.activityType && (
                                        <Badge variant="secondary" className="mt-1 text-[10px] uppercase">
                                            {wp.activityType.replace(/_/g, ' ')}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex gap-4 items-start">
                                    {(wpBudget > 0 || wp.participants > 0) && (
                                        <div className="flex flex-col items-end gap-1">
                                            {wpBudget > 0 && (
                                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                    {formatCurrency(wpBudget)}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                    {isEditing && (
                                        <button
                                            onClick={() => onRemoveWP?.(actualIndex)}
                                            className="text-destructive hover:scale-110 transition-transform p-1 hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditing ? (
                                <textarea
                                    className="w-full bg-background/50 border border-border/40 rounded-xl p-4 text-sm min-h-[100px]"
                                    value={wp.description || ''}
                                    onChange={(e) => onUpdateWP?.(actualIndex, { description: e.target.value })}
                                    placeholder="Description of the section..."
                                />
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: wp.description }} />
                            )}

                            {/* Standard Sub-Activities Grid */}
                            {logicMode === 'standard' && (
                                <div className="mt-6 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <span className="text-primary"><LayoutDashboard className="w-4 h-4" /></span>
                                            Sub-Items (Activities)
                                        </h3>
                                        {isEditing && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-[10px] font-bold uppercase gap-1"
                                                onClick={() => onAddActivity?.(actualIndex)}
                                            >
                                                <Plus className="w-3 h-3" /> Add Item
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid gap-3">
                                        {(wp.activities || []).map((act: any, aIdx: number) => (
                                            <div key={aIdx} className="bg-slate-50/80 border border-slate-100 rounded-lg p-4 text-sm group/act">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        {isEditing ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-slate-400">{actualIndex + 1}.{aIdx + 1}</span>
                                                                    <input
                                                                        className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 font-bold text-sm"
                                                                        value={act.name || ''}
                                                                        onChange={(e) => onUpdateActivity?.(actualIndex, aIdx, { name: e.target.value })}
                                                                    />
                                                                </div>
                                                                <textarea
                                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                                                                    value={act.description || ''}
                                                                    onChange={(e) => onUpdateActivity?.(actualIndex, aIdx, { description: e.target.value })}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="font-bold text-slate-800">
                                                                {actualIndex + 1}.{aIdx + 1} {act.name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {isEditing ? (
                                                            <div className="flex flex-col items-end">
                                                                <label className="text-[8px] uppercase font-bold text-slate-400">Est. Budget</label>
                                                                <input
                                                                    type="number"
                                                                    className="w-20 text-xs bg-white border border-slate-200 rounded px-1 py-0.5 text-right font-mono"
                                                                    value={act.estimatedBudget || 0}
                                                                    onChange={(e) => onUpdateActivity?.(actualIndex, aIdx, { estimatedBudget: Number(e.target.value) })}
                                                                />
                                                            </div>
                                                        ) : (
                                                            act.estimatedBudget > 0 && (
                                                                <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                                                                    {formatCurrency(act.estimatedBudget)}
                                                                </span>
                                                            )
                                                        )}
                                                        {isEditing && (
                                                            <button
                                                                onClick={() => onRemoveActivity?.(actualIndex, aIdx)}
                                                                className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover/act:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {!isEditing && <div className="text-slate-600 leading-relaxed text-xs" dangerouslySetInnerHTML={{ __html: act.description }} />}
                                            </div>
                                        ))}
                                        {logicMode === 'standard' && (!wp.activities || wp.activities.length === 0) && !isEditing && (
                                            <div className="text-xs italic text-slate-400 py-2">No specific tasks defined for this section.</div>
                                        )}
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
    onRebalance,
    onUpdateItem,
    onAddItem,
    onRemoveItem,
    onUpdateSubItem,
    onAddSubItem,
    onRemoveSubItem
}: {
    budget: any[],
    currency: string,
    limit?: number,
    onRebalance?: (limit: number) => void,
    onUpdateItem?: (index: number, updates: any) => void,
    onAddItem?: () => void,
    onRemoveItem?: (index: number) => void,
    onUpdateSubItem?: (itemIndex: number, subIndex: number, updates: any) => void,
    onAddSubItem?: (itemIndex: number) => void,
    onRemoveSubItem?: (itemIndex: number, subIndex: number) => void
}) => {
    const [isEditing, setIsEditing] = useState(false);

    if (!budget) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const total = budget.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <PlusSquare className="w-5 h-5 text-primary" />
                    Project Budget
                </h3>
                <div className="flex gap-2">
                    {onAddItem && isEditing && (
                        <Button variant="outline" size="sm" onClick={onAddItem} className="gap-2">
                            <Plus className="w-4 h-4" /> Add Item
                        </Button>
                    )}
                    <Button
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className="gap-2"
                    >
                        {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                        {isEditing ? "Done Editing" : "Manage Budget"}
                    </Button>
                </div>
            </div>

            <div className="border rounded-xl overflow-hidden border-border/40 bg-card/20">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-secondary/40">
                        <tr className="border-b border-border/40">
                            <th className="text-left py-3 px-4 font-semibold text-foreground/70 w-1/2">Item & Description</th>
                            <th className="text-right py-3 px-4 font-semibold text-foreground/70 w-1/4">Cost ({currency})</th>
                            {isEditing && <th className="w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                        {budget.map((item, i) => (
                            <React.Fragment key={i}>
                                <tr className="hover:bg-white/5 transition-colors group">
                                    <td className="py-3 px-4">
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary/70">Section</Badge>
                                                    <input
                                                        className="flex-1 bg-background/50 border border-border/40 rounded px-2 py-1 font-bold text-sm"
                                                        value={item.item || ''}
                                                        onChange={(e) => onUpdateItem?.(i, { item: e.target.value })}
                                                        placeholder="Category Name"
                                                    />
                                                </div>
                                                <textarea
                                                    className="w-full bg-background/50 border border-border/40 rounded px-2 py-1 text-xs"
                                                    value={item.description || ''}
                                                    onChange={(e) => onUpdateItem?.(i, { description: e.target.value })}
                                                    placeholder="General description for this category..."
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold text-foreground/90 flex items-center gap-2">
                                                    {item.item}
                                                    {item.breakdown && item.breakdown.length > 0 && <Badge variant="secondary" className="text-[9px] h-4">{item.breakdown.length} items</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                                            </>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono text-primary/90 font-bold">
                                        {isEditing ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <input
                                                    type="number"
                                                    className="w-24 bg-background/50 border border-border/40 rounded px-2 py-1 text-right font-mono"
                                                    value={item.cost || 0}
                                                    onChange={(e) => onUpdateItem?.(i, { cost: Number(e.target.value) })}
                                                    disabled={item.breakdown && item.breakdown.length > 0}
                                                />
                                                {item.breakdown && item.breakdown.length > 0 && (
                                                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Auto-calculated</span>
                                                )}
                                            </div>
                                        ) : (
                                            formatCurrency(item.cost)
                                        )}
                                    </td>
                                    {isEditing && (
                                        <td className="pr-4">
                                            <button
                                                onClick={() => onRemoveItem?.(i)}
                                                className="text-destructive hover:scale-110 transition-transform p-1 hover:bg-destructive/10 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>

                                {/* Sub-items / Breakdown Row */}
                                {(isEditing || (item.breakdown && item.breakdown.length > 0)) && (
                                    <tr className="bg-slate-50/30">
                                        <td colSpan={isEditing ? 3 : 2} className="py-0 px-0">
                                            <div className="pl-12 pr-4 py-3 border-l-2 border-primary/20 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Detailed Breakdown</span>
                                                    {isEditing && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 text-[10px] font-bold uppercase gap-1"
                                                            onClick={() => onAddSubItem?.(i)}
                                                        >
                                                            <Plus className="w-3 h-3" /> Add Sub-item
                                                        </Button>
                                                    )}
                                                </div>

                                                {item.breakdown && item.breakdown.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {item.breakdown.map((sub: any, sIdx: number) => (
                                                            <div key={sIdx} className="flex flex-col md:flex-row gap-2 items-start md:items-center bg-white/50 border border-slate-100 rounded-lg p-2 group/sub">
                                                                {isEditing ? (
                                                                    <>
                                                                        <input
                                                                            className="flex-1 text-xs bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded p-1 font-medium"
                                                                            value={sub.subItem || ''}
                                                                            onChange={(e) => onUpdateSubItem?.(i, sIdx, { subItem: e.target.value })}
                                                                            placeholder="Sub-item name..."
                                                                        />
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex flex-col">
                                                                                <label className="text-[8px] uppercase text-slate-400 font-bold">Qty</label>
                                                                                <input
                                                                                    type="number"
                                                                                    className="w-14 text-xs bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center"
                                                                                    value={sub.quantity || 0}
                                                                                    onChange={(e) => {
                                                                                        const q = Number(e.target.value);
                                                                                        onUpdateSubItem?.(i, sIdx, { quantity: q, total: q * (sub.unitCost || 0) });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <label className="text-[8px] uppercase text-slate-400 font-bold">Unit Cost</label>
                                                                                <input
                                                                                    type="number"
                                                                                    className="w-20 text-xs bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-right"
                                                                                    value={sub.unitCost || 0}
                                                                                    onChange={(e) => {
                                                                                        const uc = Number(e.target.value);
                                                                                        onUpdateSubItem?.(i, sIdx, { unitCost: uc, total: (sub.quantity || 0) * uc });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <label className="text-[8px] uppercase text-slate-400 font-bold">Total</label>
                                                                                <div className="text-xs font-mono font-bold text-primary/80 pt-1 w-20 text-right">
                                                                                    {formatCurrency(sub.total || 0)}
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => onRemoveSubItem?.(i, sIdx)}
                                                                                className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover/sub:opacity-100 transition-opacity mt-2"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="flex-1 text-xs font-medium text-slate-600">{sub.subItem}</span>
                                                                        <div className="flex gap-4 text-[10px] text-slate-400 font-mono">
                                                                            <span>{sub.quantity} units x {formatCurrency(sub.unitCost)}</span>
                                                                            <span className="font-bold text-primary/70">{formatCurrency(sub.total)}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : isEditing ? (
                                                    <div className="text-[10px] italic text-slate-400 text-center py-2 bg-slate-100/30 rounded-lg border border-dashed border-slate-200">
                                                        No sub-items added yet. Click "Add Sub-item" to define details.
                                                    </div>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                    <tfoot className="bg-primary/5">
                        <tr className="font-bold border-t border-primary/20">
                            <td className="py-3 px-4 text-foreground/90">Total Estimated Budget</td>
                            <td className="py-3 px-4 text-right font-mono text-primary" colSpan={isEditing ? 2 : 1}>
                                {formatCurrency(total)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {onRebalance && !isEditing && (
                <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <div className="flex-1">
                        <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Budget Rebalancer</div>
                        <div className="text-sm text-muted-foreground">Adjust all items proportionally to fit a new total:</div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            className="w-32 bg-background border border-border rounded px-3 py-1.5 text-right font-mono"
                            placeholder={total.toString()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onRebalance(Number((e.target as HTMLInputElement).value));
                                }
                            }}
                        />
                        <Button size="sm" onClick={(e) => {
                            const input = e.currentTarget.previousSibling as HTMLInputElement;
                            onRebalance(Number(input.value));
                        }}>Rescale</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MobilityBudgetSection = ({
    budget,
    currency,
    mobilityMetadata,
    activities = [],
    proposalId,
    onUpdateItem,
    onAddItem,
    onRemoveItem
}: {
    budget: any[],
    currency: string,
    mobilityMetadata?: any,
    activities?: any[],
    proposalId?: string,
    onUpdateItem?: (index: number, updates: any) => void,
    onAddItem?: () => void,
    onRemoveItem?: (index: number) => void
}) => {
    const [isEditing, setIsEditing] = useState(false);

    if (!budget) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const total = budget.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Euro className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Grant Calculation</h3>
                        <p className="text-xs text-muted-foreground italic">Project ID: {proposalId}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {onAddItem && isEditing && (
                        <Button variant="outline" size="sm" onClick={onAddItem} className="gap-2">
                            <Plus className="w-4 h-4" /> Add Item
                        </Button>
                    )}
                    <Button
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className="gap-2"
                    >
                        {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                        {isEditing ? "Done Editing" : "Manage Budget"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/40">
                    <div className="text-[10px] uppercase font-bold text-primary/70 tracking-widest mb-1">Total Grant</div>
                    <div className="text-2xl font-mono font-bold text-primary">{formatCurrency(total)}</div>
                </div>
                {mobilityMetadata?.nationalAgency && (
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/40">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">National Agency</div>
                        <div className="text-sm font-medium">{mobilityMetadata.nationalAgency}</div>
                    </div>
                )}
                {mobilityMetadata?.totalParticipants && (
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/40">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Participants</div>
                        <div className="text-sm font-medium">{mobilityMetadata.totalParticipants} mobilities</div>
                    </div>
                )}
            </div>

            <div className="border rounded-2xl overflow-hidden border-border/40 bg-card/20 backdrop-blur-sm">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-secondary/40">
                        <tr className="border-b border-border/40">
                            <th className="text-left py-4 px-6 font-semibold text-foreground/70 uppercase tracking-wider text-[10px] w-[50%]">Budget Category / Detail</th>
                            <th className="text-right py-4 px-6 font-semibold text-foreground/70 uppercase tracking-wider text-[10px] w-[40%]">Amount ({currency})</th>
                            {isEditing && <th className="w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                        {budget.map((item, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                <td className="py-4 px-6">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                className="w-full bg-background/50 border border-border/40 rounded px-2 py-1 font-medium text-sm"
                                                value={item.item || ''}
                                                onChange={(e) => onUpdateItem?.(i, { item: e.target.value })}
                                                placeholder="Budget Category"
                                            />
                                            <textarea
                                                className="w-full bg-background/50 border border-border/40 rounded px-2 py-1 text-xs"
                                                value={item.description || ''}
                                                onChange={(e) => onUpdateItem?.(i, { description: e.target.value })}
                                                placeholder="Description / Breakdown"
                                                rows={2}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="font-bold text-foreground/90 group-hover:text-primary transition-colors">{item.item}</div>
                                            <div className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">{item.description}</div>
                                        </>
                                    )}
                                </td>
                                <td className="py-4 px-6 text-right font-mono font-bold text-primary/90 text-base">
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            className="w-32 bg-background/50 border border-border/40 rounded px-3 py-1.5 text-right font-mono text-primary"
                                            value={item.cost || 0}
                                            onChange={(e) => onUpdateItem?.(i, { cost: Number(e.target.value) })}
                                        />
                                    ) : (
                                        formatCurrency(item.cost)
                                    )}
                                </td>
                                {isEditing && (
                                    <td className="pr-6">
                                        <button
                                            onClick={() => onRemoveItem?.(i)}
                                            className="text-destructive p-1 hover:bg-destructive/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove line item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-primary/5">
                        <tr className="border-t-2 border-primary/20">
                            <td className="py-5 px-6">
                                <span className="font-bold text-lg text-foreground/90">Total Estimated Grant</span>
                            </td>
                            <td className="py-5 px-6 text-right font-mono text-xl font-black text-primary" colSpan={isEditing ? 2 : 1}>
                                {formatCurrency(total)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {!isEditing && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 border-dashed">
                    <p className="text-xs text-muted-foreground text-center">
                        Note: This budget is an estimate based on the planned mobilities and unit costs.
                        Use the <strong>Manage Budget</strong> button to manually adjust any line items.
                    </p>
                </div>
            )}
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
