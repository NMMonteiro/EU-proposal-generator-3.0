import React, { useState, useEffect } from 'react';
import { Loader2, Save, Download, Eye, ArrowLeft, Terminal, Sparkles } from 'lucide-react';
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
    const [proposalError, setProposalError] = useState<string | null>(null);
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
            setProposalError(null);
            onProposalGenerated(data);
            toast.success('Proposal generated and auto-saved!');
        } catch (error: any) {
            console.error('Generation error:', error);
            setProposalError(error.message);
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
            <div className="text-center py-12 flex flex-col items-center justify-center min-h-[400px] space-y-6">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 max-w-md">
                    <p className="text-red-800 font-bold mb-2">Generation Failed</p>
                    <p className="text-red-600 text-sm leading-relaxed">
                        {generating ? "The request is taking longer than expected..." : (proposalError || "Failed to generate proposal. Please try again.")}
                    </p>
                </div>
                <Button onClick={onBack} variant="outline" className="rounded-xl border-slate-200">
                    <ArrowLeft className="h-4 w-4 mr-2" />
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
                    <Button variant="outline" onClick={() => setShowPrompt(true)} title="View AI Prompt" className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl">
                        <Terminal className="h-4 w-4 mr-2" />
                        Prompt
                    </Button>
                    <Button variant="outline" onClick={onBack} className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <Button variant="outline" onClick={handleSave} disabled={saving} className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl">
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

            {/* Mobility Metadata Quick View */}
            {(proposal.logic_mode === 'mobility' || (proposal.fundingScheme as any)?.logic_mode === 'mobility') && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl mb-8 flex items-center justify-between shadow-lg shadow-indigo-200 text-white">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Project Archetype</h3>
                            <p className="text-xl font-black">Erasmus+ Mobility Mode Activated</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <h4 className="text-[10px] font-bold uppercase opacity-70">Focus Area</h4>
                            <p className="font-bold">{proposal.mobilityMetadata?.fieldOfApplication || 'Education & Training'}</p>
                        </div>
                    </div>
                </div>
            )}

            {proposal.mobilityMetadata && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Field of Application</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-sm font-bold text-blue-900">{proposal.mobilityMetadata.fieldOfApplication || 'Not specified'}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-indigo-50/50 border-indigo-100 shadow-sm">
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">National Agency</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-sm font-bold text-indigo-900">{proposal.mobilityMetadata.nationalAgency || 'Not specified'}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-50/50 border-purple-100 shadow-sm">
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">Project Language</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-sm font-bold text-purple-900">{proposal.mobilityMetadata.language || 'English'}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm">
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Logic Mode</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-sm font-bold text-emerald-900 capitalize">{proposal.logic_mode || 'Mobility'}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Quick Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Budget', value: `€${formatBudgetTotal(proposal.budget || [])}`, color: 'text-blue-600' },
                    {
                        label: (proposal.fundingScheme?.logic_mode === 'mobility' || (proposal as any).logic_mode === 'mobility') ? 'Mobility Activities' : 'Work Packages',
                        value: proposal.workPackages?.length || 0,
                        color: 'text-indigo-600'
                    },
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
                        <CardTitle className="text-lg font-bold text-slate-800">
                            {(proposal.fundingScheme?.logic_mode === 'mobility' || (proposal as any).logic_mode === 'mobility') ? 'Financial Plan Breakdown' : 'Budget Overview'}
                        </CardTitle>
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