import React, { useState } from 'react';
import { URLInputStep } from './URLInputStep';
import { IdeasStep } from './IdeasStep';
import { PartnerSelectionModal } from './PartnerSelectionModal';
import { ProposalStep } from './ProposalStep';
import { MobilityProposalStep } from './MobilityProposalStep';
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

  // HEURISTIC: Force detection in frontend if backend is old/not deployed
  const getEffectiveLogicMode = () => {
    if (!analysisResult) return 'standard';
    if (analysisResult.logic_mode) return analysisResult.logic_mode;

    // Check funding schemes
    const selectedScheme = fundingSchemes.find(s => s.id === selectedSchemeId);
    if (selectedScheme?.logic_mode === 'mobility') return 'mobility';

    const contextText = `${userPrompt} ${analysisResult.summary} ${sourceUrl}`.toLowerCase();
    const isMobility = contextText.includes('mobility') ||
      contextText.includes('ka122') ||
      contextText.includes('ka121') ||
      contextText.includes('erasmus');

    return isMobility ? 'mobility' : 'standard';
  };

  const [fundingSchemes, setFundingSchemes] = useState<any[]>([]);

  React.useEffect(() => {
    // Load schemes to check logic_mode
    const fetchSchemes = async () => {
      const { data } = await (window as any).supabase.from('funding_schemes').select('id, logic_mode');
      if (data) setFundingSchemes(data);
    };
    fetchSchemes();
  }, []);

  const logicMode = getEffectiveLogicMode();

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
        logicMode === 'mobility' ? (
          <MobilityProposalStep
            selectedIdea={selectedIdea}
            analysisResult={{ ...analysisResult, logic_mode: 'mobility' }} // Force it down
            selectedPartners={selectedPartners}
            userPrompt={userPrompt}
            selectedSchemeId={selectedSchemeId}
            onProposalGenerated={handleProposalGenerated}
            onBack={handleBackToPartners}
            onViewProposal={onViewProposal}
          />
        ) : (
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
        )
      )}
    </div>
  );
}