import React, { useState } from 'react';
import { Loader2, CheckCircle2, Lightbulb, BookOpen, Library, Calculator, Rocket } from 'lucide-react';
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

export function StandardIdeasStep({ analysisResult, sourceUrl, userPrompt, onSelectIdea, onBack }: IdeasStepProps) {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdea(idea);
  };

  const handleGenerateProposal = () => {
    if (selectedIdea) {
      onSelectIdea(selectedIdea);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Logic Mode & Knowledge Context */}
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1 bg-indigo-50 border-indigo-200 shadow-lg shadow-slate-100 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
          <CardContent className="p-5 flex items-center gap-5">
            <div className="bg-indigo-600/10 text-indigo-700 p-3 rounded-2xl">
              <Rocket className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold tracking-tight text-indigo-900">
                System Mode: Standard Project Architect
              </p>
              <p className="text-xs mt-1 text-indigo-700/70">
                Optimized for Work Package-based structures (Horizon, KA210/220, etc).
              </p>
            </div>
            <Badge className="bg-indigo-600 text-white border-none px-3 py-1">
              STANDARD
            </Badge>
          </CardContent>
        </Card>
        {/* ... rest unchanged ... */}

        {analysisResult.knowledgeContext && analysisResult.knowledgeContext.length > 0 && (
          <Card className="flex-1 bg-blue-50 border-blue-200 shadow-lg shadow-slate-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <CardContent className="p-5 flex items-center gap-5">
              <div className="bg-blue-600/10 p-3 rounded-2xl">
                <Library className="h-6 w-6 text-blue-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 tracking-tight">Expert Intelligence Foundation</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {analysisResult.knowledgeContext.map((source, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] bg-white/50 border-blue-100 text-blue-700 font-semibold px-1.5 py-0 rounded">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Card */}
      <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
          <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Call Analysis Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <p className="text-base text-slate-700 leading-relaxed font-medium">{analysisResult.summary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consortium</p>
              <p className="text-sm font-bold text-slate-800">{analysisResult.constraints.partners}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget Limits</p>
              <p className="text-sm font-bold text-slate-800">{analysisResult.constraints.budget}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeline</p>
              <p className="text-sm font-bold text-slate-800">{analysisResult.constraints.duration}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ideas Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Lightbulb className="h-6 w-6" />
            </div>
            Generated Project Options
            <span className="text-slate-300 font-light ml-2">({analysisResult.ideas.length})</span>
          </h3>
          <p className="text-sm text-slate-500 font-medium">Select the best concept to start the proposal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analysisResult.ideas.map((idea, index) => (
            <Card
              key={index}
              className={`group cursor-pointer transition-all duration-300 rounded-2xl border-2 relative flex flex-col h-full overflow-hidden ${selectedIdea === idea
                ? 'bg-indigo-50/30 border-indigo-500 shadow-2xl shadow-indigo-100 ring-4 ring-indigo-500/5 scale-[1.02]'
                : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/50'
                }`}
              onClick={() => handleSelectIdea(idea)}
            >
              <CardHeader className={`px-6 py-5 border-b transition-colors ${selectedIdea === idea ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50/30 border-slate-50'}`}>
                <CardTitle className={`text-base font-bold leading-tight ${selectedIdea === idea ? 'text-indigo-900' : 'text-slate-800'}`}>
                  {idea.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <p className={`text-sm leading-relaxed ${selectedIdea === idea ? 'text-indigo-800/80' : 'text-slate-600'}`}>
                    {idea.description}
                  </p>

                  {idea.alignment && (
                    <div className={`text-[11px] font-semibold px-3 py-2 rounded-lg border ${selectedIdea === idea ? 'bg-indigo-500/10 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                      <div className="flex items-center gap-1.5 mb-1 opacity-70">
                        <CheckCircle2 className="h-3 w-3" />
                        STRATEGIC ALIGNMENT
                      </div>
                      {idea.alignment}
                    </div>
                  )}
                </div>

                {selectedIdea === idea && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg shadow-indigo-200 w-full text-center">
                      Scheme Ready: Continue to Step 3
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-6 left-0 right-0 z-10 flex justify-between items-center p-6 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl shadow-slate-200/50 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-900 px-8 rounded-xl font-semibold">
          Back to URL Input
        </Button>
        <div className="flex items-center gap-6">
          {!selectedIdea && <p className="text-sm font-medium text-slate-400">Please select an idea to proceed</p>}
          <Button
            onClick={handleGenerateProposal}
            disabled={!selectedIdea}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 rounded-2xl shadow-xl shadow-indigo-200 py-6 h-auto text-lg font-bold tracking-tight transition-all hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-50 disabled:translate-y-0"
          >
            Start Proposal Expert
            <Rocket className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}