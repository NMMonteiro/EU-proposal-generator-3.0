import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Lightbulb, BookOpen, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import type { AnalysisResult, Idea, RelevanceAnalysis } from '../types/proposal';

interface IdeasStepProps {
  analysisResult: AnalysisResult;
  sourceUrl: string;
  userPrompt: string;
  onSelectIdea: (idea: Idea) => void;
  onBack: () => void;
}

export function IdeasStep({ analysisResult, sourceUrl, userPrompt, onSelectIdea, onBack }: IdeasStepProps) {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [relevanceAnalysis, setRelevanceAnalysis] = useState<RelevanceAnalysis | null>(null);
  const [analyzingRelevance, setAnalyzingRelevance] = useState(false);

  const handleAnalyzeRelevance = async () => {
    setAnalyzingRelevance(true);
    try {
      const response = await fetch(`${serverUrl}/analyze-relevance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          url: sourceUrl,
          constraints: analysisResult.constraints,
          ideas: analysisResult.ideas,
          userPrompt: userPrompt || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze relevance');
      }

      const data: RelevanceAnalysis = await response.json();
      setRelevanceAnalysis(data);
      toast.success('Relevance analysis complete!');
    } catch (error: any) {
      console.error('Relevance analysis error:', error);
      toast.error(error.message || 'Failed to analyze relevance');
    } finally {
      setAnalyzingRelevance(false);
    }
  };

  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdea(idea);
  };

  const handleGenerateProposal = () => {
    if (selectedIdea) {
      onSelectIdea(selectedIdea);
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'Good':
        return 'bg-green-50 text-green-700 border-green-200 shadow-sm shadow-green-100';
      case 'Fair':
        return 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100';
      case 'Poor':
        return 'bg-red-50 text-red-700 border-red-200 shadow-sm shadow-red-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getScoreIcon = (score: string) => {
    switch (score) {
      case 'Good':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'Fair':
        return <AlertTriangle className="h-4 w-4" />;
      case 'Poor':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Knowledge Context Notification (RAG indicator) */}
      {analysisResult.knowledgeContext && analysisResult.knowledgeContext.length > 0 && (
        <Card className="bg-blue-50 border-blue-200 shadow-xl shadow-blue-100/50 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <CardContent className="p-5 flex items-center gap-5">
            <div className="bg-blue-600/10 p-3 rounded-2xl">
              <Library className="h-6 w-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 tracking-tight">Expert Intelligence Foundation</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {analysisResult.knowledgeContext.map((source, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-white/50 border-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-lg">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-[10px] px-3 py-1.5 rounded-full bg-blue-600 text-white font-bold uppercase tracking-widest shadow-lg shadow-blue-200">
              RAG Active
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-lg text-slate-800">Funding Call Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{analysisResult.summary}</p>
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Partners</p>
              <p className="text-sm font-bold text-slate-800">{analysisResult.constraints.partners}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</p>
              <p className="text-sm font-bold text-slate-800">{analysisResult.constraints.budget}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
              <p className="text-sm font-bold text-slate-800">{analysisResult.constraints.duration}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relevance Analysis */}
      {!relevanceAnalysis && (
        <div className="flex justify-center">
          <Button
            onClick={handleAnalyzeRelevance}
            disabled={analyzingRelevance}
            variant="outline"
          >
            {analyzingRelevance && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {analyzingRelevance ? 'Analyzing...' : 'Analyze Relevance'}
          </Button>
        </div>
      )}

      {relevanceAnalysis && (
        <Card className={`border-2 ${getScoreColor(relevanceAnalysis.score)}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getScoreIcon(relevanceAnalysis.score)}
              Relevance Score: {relevanceAnalysis.score}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{relevanceAnalysis.justification}</p>
          </CardContent>
        </Card>
      )}

      {/* Ideas Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-blue-600" />
          Generated Project Ideas ({analysisResult.ideas.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analysisResult.ideas.map((idea, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all duration-300 rounded-2xl overflow-hidden relative group ${selectedIdea === idea
                ? 'bg-blue-50 border-blue-400 shadow-xl shadow-blue-100 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50'
                }`}
              onClick={() => handleSelectIdea(idea)}
            >
              <CardHeader className={`${selectedIdea === idea ? 'bg-blue-100/50' : 'bg-slate-50/50'} transition-colors px-6 py-5 border-b border-transparent group-hover:border-blue-50`}>
                <CardTitle className={`text-base font-bold ${selectedIdea === idea ? 'text-blue-900' : 'text-slate-800'}`}>
                  {idea.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className={`text-sm leading-relaxed ${selectedIdea === idea ? 'text-blue-700/80' : 'text-slate-600'}`}>
                  {idea.description}
                </p>
                {selectedIdea === idea && (
                  <Badge className="mt-5 bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg shadow-blue-200 border-none">Selected</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-200">
        <Button variant="outline" onClick={onBack} className="border-slate-200 text-slate-600 px-8 rounded-xl hover:bg-slate-50">
          Back
        </Button>
        <Button
          onClick={handleGenerateProposal}
          disabled={!selectedIdea}
          className="bg-blue-600 hover:bg-blue-700 text-white px-10 rounded-xl shadow-lg shadow-blue-200 py-6 h-auto text-base font-bold tracking-tight transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Generate Proposal
        </Button>
      </div>
    </div>
  );
}