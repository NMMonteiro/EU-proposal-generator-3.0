import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, AlertCircle, Link2, FileText, Settings2, ArrowLeft, Target, Globe, Eye, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AnalysisResult } from '../types/proposal';
import type { FundingScheme } from '../types/funding-scheme';
import { InfoTooltip, ExpertIntelligenceView } from './patterns';

interface URLInputStepProps {
  onSubmit: (result: AnalysisResult, url: string, userPrompt: string, fundingSchemeId: string | null) => void;
  onBack?: () => void;
  initialSchemeId?: string | null;
}

export function URLInputStep({ onSubmit, onBack, initialSchemeId }: URLInputStepProps) {
  const [url, setUrl] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fundingSchemes, setFundingSchemes] = useState<FundingScheme[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(initialSchemeId || null);
  const [showSchemeDetails, setShowSchemeDetails] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    loadFundingSchemes();
  }, []);

  useEffect(() => {
    if (initialSchemeId) {
      setSelectedSchemeId(initialSchemeId);
    }
  }, [initialSchemeId]);

  async function loadFundingSchemes() {
    try {
      const response = await fetch(`${serverUrl}/funding-schemes`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch schemes');
      const data = await response.json();
      setFundingSchemes(data || []);

      if (!selectedSchemeId) {
        const defaultScheme = data?.find((s: any) => s.is_default);
        if (defaultScheme) {
          setSelectedSchemeId(defaultScheme.id);
        }
      }
    } catch (error) {
      console.error('Error loading funding schemes:', error);
      toast.error('Failed to load funding schemes');
    }
  }

  async function handleEnrichScheme() {
    if (!selectedSchemeId) return;
    setEnriching(true);
    try {
      const response = await fetch(`${serverUrl}/enrich-scheme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ schemeId: selectedSchemeId }),
      });

      if (!response.ok) throw new Error('Enrichment failed');

      const result = await response.json();
      toast.success('Expert Intelligence synthesized from Global Library!');

      // Update local state for the current scheme
      setFundingSchemes(prev => prev.map(s =>
        s.id === selectedSchemeId ? { ...s, expert_rules: result.playbook } : s
      ));
    } catch (error) {
      console.error('Enrichment error:', error);
      toast.error('Failed to synthesize expert intelligence');
    } finally {
      setEnriching(false);
    }
  }

  const handleSubmit = async () => {
    if (!userPrompt.trim()) {
      toast.error('Please describe your project idea or copy the funding call text');
      return;
    }

    setLoading(true);
    try {
      // Use placeholder URL if none provided
      const submitUrl = url.trim() || 'https://internal-context.cloud';

      const response = await fetch(`${serverUrl}/analyze-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          url: submitUrl,
          userPrompt: userPrompt.trim(),
          fundingSchemeId: selectedSchemeId
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('⏰ API Quota Limit Reached. Please try again later.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.message || errorData.error || 'Failed to analyze funding call.');
      }

      const data: AnalysisResult = await response.json();
      toast.success(`Expert System generated ${data.ideas.length} tailored ideas!`);
      onSubmit(data, submitUrl, userPrompt, selectedSchemeId);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  const selectedScheme = fundingSchemes.find(s => s.id === selectedSchemeId);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-4 rounded-xl transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Selector
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-2 border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-8 pt-8 px-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 text-white">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">Project Intelligence</CardTitle>
                  <CardDescription className="text-slate-500 font-medium">Define the core concept for the expert system to analyze</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Project Prompt - THE KEY */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  PROJECT DESCRIPTION / CALL TEXT (MANDATORY)
                  <InfoTooltip content="Paste the specific text from the EU funding call or your project concept note. The AI uses this to match objectives and generating specific content." />
                </label>
                <Textarea
                  placeholder="Paste the full funding call text here, or describe your project idea in detail. Include specific focus areas, desired impact, and partner requirements..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  disabled={loading}
                  rows={12}
                  className="bg-slate-50/50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white transition-all rounded-2xl p-6 text-base leading-relaxed resize-none shadow-inner"
                />
                <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-600/70 uppercase tracking-widest px-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  This is the primary intelligence source for idea generation
                </div>
              </div>

              {/* URL - SUPPORTING */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  SUPPORTING URL (OPTIONAL)
                  <InfoTooltip content="Link to the official Funding & Tenders portal page. The system will crawl this to extract budget rules and technical constraints." />
                </label>
                <div className="relative group">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    placeholder="https://ec.europa.eu/info/funding-tenders/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    className="pl-12 h-14 bg-slate-50/50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white transition-all rounded-2xl text-base shadow-inner"
                  />
                </div>
                <p className="text-xs text-slate-400 font-medium px-1">
                  We'll crawl this URL to extract additional budget rules and constraints.
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading || !userPrompt.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-100 py-8 text-lg font-extrabold tracking-tight transition-all hover:scale-[1.01] active:scale-[0.99] rounded-2xl group"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                    Expert Engine Running...
                  </>
                ) : (
                  <>
                    Generate Project Strategy
                    <ArrowLeft className="ml-2 h-6 w-6 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Context/Guides */}
        <div className="space-y-6">
          <Card className="bg-white border-2 border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Settings2 className="h-32 w-32 rotate-12 text-slate-400" />
            </div>
            <CardHeader className="pb-4 relative z-10">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Settings2 className="h-5 w-5 text-indigo-600" />
                Expert Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Scheme</label>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-lg font-bold text-slate-900">{selectedScheme?.name || "Generic EU Project"}</p>
                  <p className="text-xs text-indigo-600 font-medium mt-1">Logic: {selectedScheme?.logic_mode === 'mobility' ? 'Activity-Based' : 'Work Package-Based'}</p>

                  <Button
                    variant="link"
                    onClick={() => setShowSchemeDetails(true)}
                    className="h-auto p-0 mt-3 text-indigo-600 font-bold text-xs flex items-center gap-1.5 hover:text-indigo-700 underline-offset-4 decoration-indigo-200"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details & Rules
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  Switch Template
                  <InfoTooltip content="Changing the template alters the sections, budget rules, and logic mode (Mobility vs Standard) used for generation." />
                </label>
                <select
                  value={selectedSchemeId || ''}
                  onChange={(e) => setSelectedSchemeId(e.target.value || null)}
                  disabled={loading}
                  className="w-full h-11 px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all cursor-pointer hover:bg-slate-50"
                >
                  {fundingSchemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id} className="text-slate-900">
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-slate-100 shadow-xl p-6 space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Pro Tips
            </h4>
            <ul className="space-y-3">
              {[
                { title: 'The Prompt is Key', desc: 'Describe your unique institutional needs. The AI maps these to the scheme objectives.' },
                { title: 'Optional URLs', desc: 'Use them specifically for official call pages to ensure accurate budget rules.' },
                { title: 'Expert Mode', desc: 'The system uses successful project examples as few-shot references.' }
              ].map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{i + 1}</div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{tip.title}</p>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      {/* Scheme Detail Dialog */}
      <Dialog open={showSchemeDetails} onOpenChange={setShowSchemeDetails}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <DialogTitle className="text-2xl font-bold text-slate-900">{selectedScheme?.name}</DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 font-medium text-left">
              Detailed configuration, logic rules, and expert patterns for this funding program.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-4 px-4 overflow-y-auto pr-6">
            <div className="space-y-8 pb-4">
              {/* RAG Status Indicator - NEW */}
              <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-xs font-bold text-indigo-900 tracking-tight uppercase">Real-time Knowledge Base: ACTIVE</p>
                  </div>
                  <p className="text-[10px] text-indigo-600 mt-0.5 leading-tight">
                    The Expert System is currently indexing thousands of pages of official EU documentation for <strong>{selectedScheme?.acronym || selectedScheme?.name}</strong>.
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>

              {/* Core Logic Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Logic Mode</h4>
                  <p className="text-sm font-bold text-indigo-600">
                    {selectedScheme?.logic_mode === 'mobility' ? 'Mobility (Activity-Based)' : 'Standard (Work Package-Based)'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Scheme ID</h4>
                  <p className="text-xs font-mono text-slate-600">{selectedScheme?.id}</p>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                  Program Description
                </h4>
                <div className="text-sm text-slate-600 leading-relaxed bg-indigo-50/30 p-5 rounded-2xl border border-indigo-50 italic">
                  {selectedScheme?.description || "No description provided for this scheme."}
                </div>
              </div>

              {/* Expert Playbook Section */}
              {selectedScheme?.expert_rules && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                    Expert IQ & Directives
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {(() => {
                      const hasRules = Array.isArray(selectedScheme.expert_rules)
                        ? selectedScheme.expert_rules.length > 0
                        : Object.keys(selectedScheme.expert_rules).length > 0;

                      return (
                        <ExpertIntelligenceView
                          data={selectedScheme.expert_rules}
                          source="Synthesized from Global Library"
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Financial Architecture Section */}
              {selectedScheme?.budget_rules && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                    <h4 className="text-sm font-bold text-slate-800">Financial Architecture (KB Extracted)</h4>
                  </div>
                  <ExpertIntelligenceView
                    data={selectedScheme.budget_rules}
                    source="Budgets & Cost Eligibility"
                  />
                </div>
              )}

              {/* Standardized Activities Section */}
              {selectedScheme?.standardized_activities && Array.isArray(selectedScheme.standardized_activities) && selectedScheme.standardized_activities.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                    Eligible Activities (from EU Guidelines)
                  </h4>
                  {selectedScheme?.standardized_activities && Array.isArray(selectedScheme.standardized_activities) && selectedScheme.standardized_activities.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {selectedScheme.standardized_activities.map((act: any, i: number) => (
                        <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between group hover:border-amber-200 transition-colors shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-400" />
                            <span className="text-xs font-bold text-slate-800">{act.type || act.name || act.label}</span>
                          </div>
                          {act.duration && <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{act.duration}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/30 border border-amber-100 border-dashed rounded-xl text-center">
                      <p className="text-[10px] text-amber-600 font-medium tracking-tight uppercase">Real-time Activity Mapping Active</p>
                      <p className="text-[10px] text-amber-500 mt-1">Specific eligible activities for {selectedScheme?.acronym} will be identified during proposal generation.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Evaluation Criteria Section */}
              {selectedScheme?.evaluation_criteria && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                    <h4 className="text-sm font-bold text-slate-800">Scoring Logic & Weighting</h4>
                  </div>
                  <ExpertIntelligenceView
                    data={selectedScheme.evaluation_criteria}
                    source="Evaluation Strategy"
                  />
                </div>
              )}

              {/* Structure Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-slate-300 rounded-full" />
                  Proposal Structure Template
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedScheme?.template_json?.sections?.map((sec, i) => (
                    <div key={sec.key} className="px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-100 flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all hover:scale-[1.02]">
                      <span className="opacity-30 font-mono text-[9px]">{i + 1}</span>
                      {sec.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <Button onClick={() => setShowSchemeDetails(false)} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-8 h-12 font-bold text-sm shadow-lg shadow-indigo-100">
              Close Intelligence View
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
