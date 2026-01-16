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
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Fair':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Poor':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
        <Card className="bg-[#1a2b4b] border-[#4472C4]/30 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-[#4472C4]/20 p-2.5 rounded-full">
              <Library className="h-5 w-5 text-[#4472C4]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#4472C4]">Expert Intelligence Foundation</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {analysisResult.knowledgeContext.map((source, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-white/5 border-white/10 text-white/70">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-[10px] px-2 py-1 rounded bg-[#4472C4]/10 text-[#4472C4] font-bold uppercase tracking-wider">
              RAG Active
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card className="bg-[#323232] border-white/10">
        <CardHeader>
          <CardTitle>Funding Call Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{analysisResult.summary}</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Partners</p>
              <p className="text-sm font-medium">{analysisResult.constraints.partners}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-sm font-medium">{analysisResult.constraints.budget}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium">{analysisResult.constraints.duration}</p>
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
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#4472C4]" />
          Generated Project Ideas ({analysisResult.ideas.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysisResult.ideas.map((idea, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${selectedIdea === idea
                ? 'bg-[#4472C4]/20 border-[#4472C4]'
                : 'bg-[#323232] border-white/10 hover:border-white/20'
                }`}
              onClick={() => handleSelectIdea(idea)}
            >
              <CardHeader>
                <CardTitle className="text-base">{idea.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{idea.description}</p>
                {selectedIdea === idea && (
                  <Badge className="mt-3 bg-[#4472C4]">Selected</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleGenerateProposal}
          disabled={!selectedIdea}
          className="bg-gradient-to-br from-[#4472C4] to-[#5B9BD5]"
        >
          Generate Proposal
        </Button>
      </div>
    </div>
  );
}