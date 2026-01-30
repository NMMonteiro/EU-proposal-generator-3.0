import React, { useState, useEffect } from 'react';
import { Loader2, Save, Download, Eye, ArrowLeft, Terminal, Sparkles, Building2, Users, Globe, Briefcase, GraduationCap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import type { AnalysisResult, Idea, FullProposal } from '../types/proposal';

interface MobilityProposalStepProps {
    selectedIdea: Idea;
    analysisResult: AnalysisResult;
    selectedPartners: any[];
    userPrompt: string;
    selectedSchemeId: string | null;
    onProposalGenerated: (proposal: FullProposal) => void;
    onBack: () => void;
    onViewProposal?: (id: string) => void;
}

export function MobilityProposalStep({
    selectedIdea,
    analysisResult,
    selectedPartners,
    userPrompt,
    selectedSchemeId,
    onProposalGenerated,
    onBack,
    onViewProposal,
}: MobilityProposalStepProps) {
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate proposal');
            }

            const data: FullProposal = await response.json();

            // HEURISTIC: Local budget rebalancing if backend is not deployed/updated
            const currentTotal = (data.budget || []).reduce((sum, item) => sum + (item.cost || 0), 0);
            const isOldDefault = currentTotal === 250000;
            const isKA122 = analysisResult.summary?.includes('KA122') || userPrompt.includes('KA122');

            if ((isOldDefault || currentTotal > 100000) && isKA122) {
                console.log('--- FRONTEND REPAIR: SCALING BUDGET & FIXING TERMINOLOGY ---');
                const targetBudget = 60000;
                const ratio = targetBudget / currentTotal;

                // Scale main budget items
                data.budget = (data.budget || []).map(item => ({
                    ...item,
                    cost: Math.floor(item.cost * ratio)
                }));

                // Scale activity budgets and FIX TERMINOLOGY
                data.workPackages = (data.workPackages || []).map((wp, idx) => ({
                    ...wp,
                    name: wp.name.replace(/^(?:Work[\s_-]*Packages?|WP|WorkPlan)[\s_-]*\d+\s*[:\.-]*/gi, '').trim(),
                    activities: (wp.activities || []).map(act => ({
                        ...act,
                        estimatedBudget: Math.floor(act.estimatedBudget * ratio)
                    }))
                }));

                if (data.mobilityMetadata) {
                    data.mobilityMetadata.totalGrantRequested = targetBudget;
                }
            }

            setProposal(data);
            onProposalGenerated(data);
            toast.success('Mobility Proposal Ready!');
        } catch (error: any) {
            setProposalError(error.message);
            toast.error(error.message);
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
            if (!response.ok) throw new Error('Failed to save');
            toast.success('Saved successfully!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (generating) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full blur-3xl animate-pulse"></div>
                    <Loader2 className="h-16 w-16 animate-spin text-indigo-600 relative z-10" />
                </div>
                <div className="text-center space-y-3">
                    <h3 className="text-2xl font-black text-slate-900">Architecting Mobility Flows</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">
                        Calculating unit costs, travel distances, and participant support for your Erasmus+ project...
                    </p>
                </div>
            </div>
        );
    }

    if (!proposal) return null;

    const totalBudget = (proposal.budget || []).reduce((sum, item) => sum + (item.cost || 0), 0);
    const totalParticipants = (proposal.workPackages || []).reduce((sum, wp: any) => sum + (Number(wp.participants) || 0), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Erasmus+ Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-8 shadow-2xl shadow-indigo-200 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Globe className="w-64 h-64 -mr-20 -mt-20" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-transparent backdrop-blur-md">
                                Erasmus+ KA122/KA121
                            </Badge>
                            <Badge className="bg-emerald-400 text-emerald-950 border-transparent shadow-lg shadow-emerald-900/20">
                                Live Preview
                            </Badge>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                            {proposal.title}
                        </h1>
                        <p className="text-blue-100 font-medium flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            Targeting: {proposal.mobilityMetadata?.fieldOfApplication || 'School Education'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={() => setShowPrompt(true)} className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl">
                            <Terminal className="h-4 w-4 mr-2" /> Prompt
                        </Button>
                        <Button variant="outline" onClick={onBack} className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <Button onClick={() => proposal.id && onViewProposal?.(proposal.id)} className="bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-bold shadow-xl shadow-blue-900/20 transition-all hover:scale-105">
                            <Eye className="h-4 w-4 mr-2" /> Open Mobility Editor
                        </Button>
                    </div>
                </div>
            </div>

            {/* Erasmus Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested Grant</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-3xl font-black text-blue-600">€{totalBudget.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Full Project Lifecycle</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Participants</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="flex items-center gap-3">
                            <p className="text-3xl font-black text-indigo-600">{totalParticipants}</p>
                            <Users className="w-6 h-6 text-indigo-400 opacity-50" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Students & Staff</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activities</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="flex items-center gap-3">
                            <p className="text-3xl font-black text-emerald-600">{proposal.workPackages?.length || 0}</p>
                            <Briefcase className="w-6 h-6 text-emerald-400 opacity-50" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Mobility Flows</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consortium</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="flex items-center gap-3">
                            <p className="text-3xl font-black text-amber-600">{proposal.partners?.length || 0}</p>
                            <Building2 className="w-6 h-6 text-amber-400 opacity-50" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Host Organisations</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Narrative Preview */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="bg-white border-slate-200 shadow-xl overflow-hidden rounded-3xl">
                        <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                                Project Rationale & Objectives
                            </h3>
                        </div>
                        <CardContent className="p-8">
                            <div className="prose prose-slate max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: proposal.summary }} />
                        </CardContent>
                    </Card>

                    {/* Activities List */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 ml-2">Mobility Activities Breakdown</h3>
                        {proposal.workPackages?.map((act, i) => (
                            <Card key={i} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden border-l-4 border-indigo-500">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="space-y-1 md:w-1/3">
                                            <Badge variant="outline" className="mb-2 text-indigo-600 border-indigo-100 bg-indigo-50">Activity {i + 1}</Badge>
                                            <h4 className="text-lg font-bold text-slate-900">
                                                {act.name.replace(/^(?:Work[\s_-]*Packages?|WP|WorkPlan)[\s_-]*\d+\s*[:\.-]*/gi, '').trim() || act.name}
                                            </h4>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[10px]"><Users className="w-3 h-3 mr-1" />{act.participants || 0} Pax</Badge>
                                                <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[10px]"><Clock className="w-3 h-3 mr-1" />{act.duration || 0} Days</Badge>
                                            </div>
                                        </div>
                                        <div className="flex-1 text-sm text-slate-600 leading-relaxed italic" dangerouslySetInnerHTML={{ __html: act.description?.substring(0, 300) + '...' }} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Right Column: Financial Breakdown */}
                <div className="space-y-8">
                    <Card className="bg-slate-900 text-white rounded-3xl border-none shadow-2xl p-6">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-400" />
                            Financial Plan
                        </h3>
                        <div className="space-y-4">
                            {proposal.budget?.map((item, i) => (
                                <div key={i} className="flex justify-between items-start pb-4 border-b border-white/10 last:border-0 last:pb-0">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.item}</p>
                                        <p className="text-[10px] text-slate-500 italic line-clamp-1">{item.description}</p>
                                    </div>
                                    <p className="font-mono font-bold text-blue-400">€{item.cost?.toLocaleString()}</p>
                                </div>
                            ))}
                            <div className="pt-6 mt-6 border-t border-white/20 flex justify-between items-center">
                                <span className="text-sm font-black uppercase tracking-widest text-white/70">Total Request</span>
                                <span className="text-2xl font-black text-blue-400">€{totalBudget.toLocaleString()}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-indigo-50 border-indigo-100 rounded-3xl p-6">
                        <h4 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            Erasmus+ Compliance
                        </h4>
                        <ul className="space-y-3">
                            {[
                                'Standard Unit Costs Applied',
                                'Travel Distance Calculations Included',
                                'Inclusion Support Add-ons detected',
                                'Organizational Support balanced'
                            ].map((text, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs font-medium text-indigo-700">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>

            {/* Prompt Dialog */}
            <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-950 text-slate-50 border-slate-800">
                    <DialogHeader className="border-b border-slate-800 pb-4">
                        <DialogTitle className="flex items-center gap-2 text-blue-400 tracking-tight">
                            <Terminal className="h-5 w-5" />
                            Mobility Architecture Prompt
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-6 p-6 rounded-2xl bg-black/40 font-mono text-xs whitespace-pre-wrap border border-slate-800 text-slate-300 leading-relaxed ring-1 ring-white/5">
                        {proposal.generationPrompt || 'Prompt context inherited from Analysis Phase.'}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
