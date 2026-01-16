import React, { useState } from 'react';
import { URLInputStep } from './URLInputStep';
import { IdeasStep } from './IdeasStep';
import { PartnerSelectionModal } from './PartnerSelectionModal';
import { ProposalStep } from './ProposalStep';
import type { AnalysisResult, Idea, FullProposal } from '../types/proposal';

type Step = 'url-input' | 'ideas' | 'partners' | 'proposal';

interface ProposalGeneratorProps {
  onViewProposal?: (id: string) => void;
}

export function ProposalGenerator({ onViewProposal }: ProposalGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<Step>('url-input');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [selectedPartners, setSelectedPartners] = useState<any[]>([]);
  const [proposal, setProposal] = useState<FullProposal | null>(null);

  const handleUrlSubmit = (result: AnalysisResult, url: string, prompt: string, schemeId: string | null) => {
    setAnalysisResult(result);
    setSourceUrl(url);
    setUserPrompt(prompt);
    setSelectedSchemeId(schemeId);
    setCurrentStep('ideas');
  };

  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdea(idea);
    setCurrentStep('partners');
  };

  const handlePartnersConfirmed = (partners: any[]) => {
    setSelectedPartners(partners);
    setCurrentStep('proposal');
  };

  const handleProposalGenerated = (generatedProposal: FullProposal) => {
    setProposal(generatedProposal);
  };

  const handleBackToUrl = () => {
    setCurrentStep('url-input');
    setAnalysisResult(null);
    setSourceUrl('');
    setUserPrompt('');
    setSelectedSchemeId(null);
    setSelectedIdea(null);
    setProposal(null);
  };

  const handleBackToIdeas = () => {
    setCurrentStep('ideas');
    setSelectedIdea(null);
    setProposal(null);
  };

  const handleBackToPartners = () => {
    setCurrentStep('partners');
    setProposal(null);
  };

  return (
    <div className="p-6">
      {currentStep === 'url-input' && (
        <URLInputStep onSubmit={handleUrlSubmit} />
      )}

      {currentStep === 'ideas' && analysisResult && (
        <IdeasStep
          analysisResult={analysisResult}
          sourceUrl={sourceUrl}
          userPrompt={userPrompt}
          onSelectIdea={handleSelectIdea}
          onBack={handleBackToUrl}
        />
      )}

      {currentStep === 'partners' && selectedIdea && (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Step 3: Select Partners</h2>
            <p className="text-slate-500">Select the organizations that will participate in this project.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl w-full text-center space-y-6 shadow-xl shadow-slate-200/50 transition-all">
            <p className="text-slate-600 leading-relaxed font-medium">
              Click the button below to browse and select partners from your database.
              The AI will use their profiles to tailor the technical and consortium sections.
            </p>
            <PartnerSelectionModal
              isOpen={true}
              onClose={handleBackToIdeas}
              onConfirm={handlePartnersConfirmed}
              selectedIdeaTitle={selectedIdea.title}
              proposalContext={selectedIdea.description}
            />
          </div>
        </div>
      )}

      {currentStep === 'proposal' && selectedIdea && analysisResult && (
        <ProposalStep
          selectedIdea={selectedIdea}
          analysisResult={analysisResult}
          selectedPartners={selectedPartners}
          userPrompt={userPrompt}
          selectedSchemeId={selectedSchemeId}
          onProposalGenerated={handleProposalGenerated}
          onBack={handleBackToPartners}
          onViewProposal={onViewProposal}
        />
      )}
    </div>
  );
}