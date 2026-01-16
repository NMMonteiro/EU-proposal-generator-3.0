import React, { useState, useEffect } from 'react';
import { Loader2, Save, Download, Eye, ArrowLeft, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import type { AnalysisResult, Idea, FullProposal } from '../types/proposal';

interface ProposalStepProps {
    selectedIdea: Idea;
    analysisResult: AnalysisResult;
    selectedPartners: any[];
    userPrompt: string;
    selectedSchemeId: string | null;
    onProposalGenerated: (proposal: FullProposal) => void;
    onBack: () => void;
    onViewProposal?: (id: string) => void;
}

export function ProposalStep({
    selectedIdea,
    analysisResult,
    selectedPartners,
    userPrompt,
    selectedSchemeId,
    onProposalGenerated,
    onBack,
    onViewProposal,
}: ProposalStepProps) {
    const [proposal, setProposal] = useState<FullProposal | null>(null);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const hasStartedGeneration = React.useRef(false);

    useEffect(() => {
        if (!hasStartedGeneration.current) {
            hasStartedGeneration.current = true;
            generateProposal();
        }
    }, []);

    const generateProposal = async () => {
        setGenerating(true);
        try {
            const response = await fetch(`${serverUrl}/generate-proposal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({
                    idea: selectedIdea,
                    summary: analysisResult.summary,
                    constraints: analysisResult.constraints,
                    selectedPartners: selectedPartners.map(p => p.id),
                    userPrompt: userPrompt || undefined,
                    fundingSchemeId: selectedSchemeId || undefined,
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Failed to generate proposal';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (e) {
                    // Fallback to text if not JSON
                    const errorText = await response.text().catch(() => '');
                    if (errorText) errorMessage = errorText.substring(0, 100);
                }
                throw new Error(errorMessage);
            }

            const data: FullProposal = await response.json();
            setProposal(data);
            onProposalGenerated(data);
            toast.success('Proposal generated and auto-saved!');
        } catch (error: any) {
            console.error('Generation error:', error);
            toast.error(error.message || 'Failed to generate proposal');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!proposal) return;

        setSaving(true);
        try {
            const response = await fetch(`${serverUrl}/proposals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify(proposal),
            });

            if (!response.ok) {
                throw new Error('Failed to save proposal');
            }

            toast.success('Proposal saved successfully!');
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save proposal');
        } finally {
            setSaving(false);
        }
    };

    const handleViewDetailed = () => {
        if (proposal?.id && onViewProposal) {
            onViewProposal(proposal.id);
        }
    };

    const formatBudgetTotal = (budget: any[]) => {
        return budget.reduce((sum, item) => sum + (item.cost || 0), 0).toLocaleString('en-US');
    };

    if (generating) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl animate-pulse"></div>
                    <Loader2 className="h-16 w-16 animate-spin text-blue-600 relative z-10" />
                </div>
                <div className="text-center space-y-3 max-w-sm">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Generating Your Proposal</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                        Our AI is architecting a comprehensive funding proposal tailored to your selected idea and partners...
                    </p>
                </div>
            </div>
        );
    }

    if (!proposal) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to generate proposal. Please try again.</p>
                <Button onClick={onBack} variant="outline" className="mt-4">
                    Back to Ideas
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{proposal.title}</h2>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Generated {new Date(proposal.generatedAt || '').toLocaleString()}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setShowPrompt(true)} title="View AI Prompt" className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl">
                        <Terminal className="h-4 w-4 mr-2" />
                        Prompt
                    </Button>
                    <Button variant="outline" onClick={onBack} className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <Button variant="outline" onClick={handleSave} disabled={saving} className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save
                    </Button>
                    <Button onClick={handleViewDetailed} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 px-6 font-bold tracking-tight transition-all hover:scale-[1.02]">
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Proposal
                    </Button>
                </div>
            </div>

            {/* Prompt Dialog */}
            <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-950 text-slate-50 border-slate-800">
                    <DialogHeader className="border-b border-slate-800 pb-4">
                        <DialogTitle className="flex items-center gap-2 text-blue-400">
                            <Terminal className="h-5 w-5" />
                            Generation Prompt
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-6 p-6 rounded-xl bg-black/40 font-mono text-xs whitespace-pre-wrap border border-slate-800 text-slate-300 leading-relaxed ring-1 ring-white/5">
                        {proposal.generationPrompt || 'Prompt not available for this proposal.'}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Budget', value: `€${formatBudgetTotal(proposal.budget || [])}`, color: 'text-blue-600' },
                    { label: 'Work Packages', value: proposal.workPackages?.length || 0, color: 'text-indigo-600' },
                    { label: 'Partners', value: proposal.partners?.length || 0, color: 'text-emerald-600' },
                ].map((stat, i) => (
                    <Card key={i} className="bg-white border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden relative group">
                        <div className={`absolute top-0 left-0 w-1 h-full ${stat.color.replace('text', 'bg')}`}></div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-3xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Summary Preview */}
            <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
                <CardHeader className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                    <CardTitle className="text-lg font-bold text-slate-800">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div
                        className="prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-slate-900"
                        dangerouslySetInnerHTML={{ __html: proposal.summary }}
                    />
                </CardContent>
            </Card>

            {/* Sections Preview */}
            <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
                <CardHeader className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                    <CardTitle className="text-lg font-bold text-slate-800">Proposal Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {proposal.dynamic_sections ? (
                        Object.entries(proposal.dynamic_sections).map(([key, content]) => {
                            const strContent = typeof content === 'string' ? content : '';
                            return (
                                <div key={key} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 group hover:border-blue-200 transition-colors">
                                    <h4 className="font-bold text-slate-900 mb-3 capitalize text-base tracking-tight">{key.replace(/_/g, ' ')}</h4>
                                    <div
                                        className="text-sm text-slate-600 leading-relaxed font-medium line-clamp-4 prose-sm prose-slate"
                                        dangerouslySetInnerHTML={{ __html: strContent.substring(0, 500) }}
                                    />
                                    {strContent.length > 500 && <p className="mt-2 text-blue-600 text-xs font-bold">Read more in full view...</p>}
                                </div>
                            );
                        })
                    ) : (
                        <>
                            {['relevance', 'impact', 'methods', 'dissemination'].map((sec) => {
                                const content = (proposal as any)[sec];
                                if (!content) return null;
                                return (
                                    <div key={sec} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                        <h4 className="font-bold text-slate-900 mb-3 capitalize text-base tracking-tight">{sec}</h4>
                                        <div
                                            className="text-sm text-slate-600 leading-relaxed font-medium line-clamp-4 prose-sm prose-slate"
                                            dangerouslySetInnerHTML={{ __html: content }}
                                        />
                                    </div>
                                );
                            })}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Budget Table */}
            {proposal.budget && proposal.budget.length > 0 && (
                <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                        <CardTitle className="text-lg font-bold text-slate-800">Budget Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Item</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cost (€)</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {proposal.budget.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-700 text-sm">{item.item}</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">{item.cost.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500 font-medium leading-relaxed">{item.description}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-blue-50/50">
                                        <td className="px-6 py-5 font-black text-blue-900">Total Project Value</td>
                                        <td className="px-6 py-5 text-right font-black text-blue-700 text-lg">€{formatBudgetTotal(proposal.budget)}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Call to Action */}
            <div className="flex justify-center py-10">
                <Button
                    onClick={handleViewDetailed}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-8 rounded-2xl shadow-xl shadow-blue-200 text-lg font-bold tracking-tight transition-all hover:scale-105 active:scale-95 group"
                >
                    <Eye className="h-6 w-6 mr-3 transition-transform group-hover:rotate-12" />
                    Open Detailed Proposal Editor
                </Button>
            </div>
        </div>
    );
}