import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, AlertCircle, Link2, FileText, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import type { AnalysisResult } from '../types/proposal';
import type { FundingScheme } from '../types/funding-scheme';

interface URLInputStepProps {
  onSubmit: (result: AnalysisResult, url: string, userPrompt: string, fundingSchemeId: string | null) => void;
}

export function URLInputStep({ onSubmit }: URLInputStepProps) {
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fundingSchemes, setFundingSchemes] = useState<FundingScheme[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);

  useEffect(() => {
    loadFundingSchemes();
  }, []);

  async function loadFundingSchemes() {
    try {
      const { data, error } = await supabase
        .from('funding_schemes')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setFundingSchemes(data || []);

      // Select default scheme if available
      const defaultScheme = data?.find(s => s.is_default);
      if (defaultScheme) {
        setSelectedSchemeId(defaultScheme.id);
      }
    } catch (error) {
      console.error('Error loading funding schemes:', error);
      toast.error('Failed to load funding schemes');
    }
  }

  const handleSubmit = async () => {
    // Validation based on mode
    if (mode === 'url' && !url.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    if (mode === 'text' && !userPrompt.trim()) {
      toast.error('Please enter your funding call text or project description');
      return;
    }

    setLoading(true);
    try {
      // In text mode, use a placeholder URL
      const submitUrl = mode === 'text' ? 'https://text-mode-placeholder.com' : url;

      const response = await fetch(`${serverUrl}/analyze-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          url: submitUrl,
          userPrompt: userPrompt.trim() || undefined,
          fundingSchemeId: selectedSchemeId
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('⏰ API Quota Limit Reached. Please try again later.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.message || errorData.error || 'Failed to analyze funding call. Check console for details.');
      }

      const data: AnalysisResult = await response.json();
      toast.success(`Generated ${data.ideas.length} project ideas!`);
      onSubmit(data, submitUrl, userPrompt, selectedSchemeId);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/50">
        <CardHeader className="border-b border-slate-50 pb-6">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Step 1: Analyze Funding Call
          </CardTitle>
          <CardDescription className="text-slate-500">
            Enter a funding call URL or paste the text directly to generate project ideas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'url' | 'text')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                URL Mode
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Text Mode
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Funding Call URL *
                </label>
                <Input
                  placeholder="https://www.ukri.org/opportunity/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Specific Requirements (Optional)
                </label>
                <Textarea
                  placeholder="E.g., Focus on AI and sustainability, must include SMEs, budget under €1M..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  disabled={loading}
                  rows={4}
                  className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  If provided, all generated ideas will directly address these requirements
                </p>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Funding Call Text / Project Description *
                </label>
                <Textarea
                  placeholder="Paste the full funding call text here, or describe your project idea in detail..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  disabled={loading}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Provide as much detail as possible about the funding opportunity or your project concept
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Funding Scheme Selector */}
          <div className="pt-6 border-t border-slate-100">
            <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-slate-400" />
              Funding Scheme Template
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <select
                  value={selectedSchemeId || ''}
                  onChange={(e) => setSelectedSchemeId(e.target.value || null)}
                  disabled={loading}
                  className="w-full h-11 px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 transition-all appearance-none cursor-pointer hover:bg-slate-100"
                >
                  <option value="" disabled>Select a funding scheme...</option>
                  {fundingSchemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name} {scheme.is_default && '(Default)'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-2">
                  Select the template structure for your proposal (sections, limits, etc.)
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || (mode === 'url' && !url.trim() && !userPrompt.trim()) || (mode === 'text' && !userPrompt.trim())}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 py-6 text-base font-semibold transition-all hover:translate-y-[-1px]"
            size="lg"
          >
            {loading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            {loading ? 'Analyzing...' : 'Analyze & Generate Ideas'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
