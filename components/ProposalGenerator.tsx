import React, { useState } from 'react';
import { SchemeSelectorStep } from './SchemeSelectorStep';
import { URLInputStep } from './URLInputStep';
import { StandardIdeasStep } from './StandardIdeasStep';
import { MobilityIdeasStep } from './MobilityIdeasStep';
import { PartnerSelectionModal } from './PartnerSelectionModal';
import { StandardProposalStep } from './StandardProposalStep';
import { MobilityProposalStep } from './MobilityProposalStep';
import { ProgressSteps, type StepItem } from './patterns';
import type { AnalysisResult, Idea, FullProposal } from '../types/proposal';

type Step = 'scheme-selection' | 'url-input' | 'ideas' | 'partners' | 'proposal';

interface ProposalGeneratorProps {
  onViewProposal?: (id: string) => void;
}

export function ProposalGenerator({ onViewProposal }: ProposalGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<Step>('scheme-selection');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [forcedLogicMode, setForcedLogicMode] = useState<'standard' | 'mobility' | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [selectedPartners, setSelectedPartners] = useState<any[]>([]);
  const [proposal, setProposal] = useState<FullProposal | null>(null);

  const getEffectiveLogicMode = () => {
    if (forcedLogicMode) return forcedLogicMode;
    if (!analysisResult) return 'standard';
    return analysisResult.logic_mode || 'standard';
  };

  const logicMode = getEffectiveLogicMode();

  const handleSchemeSelect = (schemeId: string, logicMode: string) => {
    setSelectedSchemeId(schemeId);
    setForcedLogicMode(logicMode as 'standard' | 'mobility');
    setCurrentStep('url-input');
  };

  const handleUrlSubmit = (result: AnalysisResult, url: string, prompt: string, schemeId: string | null) => {
    setAnalysisResult({
      ...result,
      logic_mode: forcedLogicMode || result.logic_mode
    });
    setSourceUrl(url);
    setUserPrompt(prompt);
    // Maintain the scheme selected in Step 0 if it's not provided here
    if (schemeId) setSelectedSchemeId(schemeId);
    setCurrentStep('ideas');
  };

  const handleSelectIdea = (idea: Idea, updatedConstraints?: any) => {
    setSelectedIdea(idea);
    if (updatedConstraints && analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        constraints: {
          ...analysisResult.constraints,
          ...updatedConstraints
        }
      });
    }
    setCurrentStep('partners');
  };

  const handlePartnersConfirmed = (partners: any[]) => {
    setSelectedPartners(partners);
    setCurrentStep('proposal');
  };

  const handleProposalGenerated = (generatedProposal: FullProposal) => {
    setProposal(generatedProposal);
  };

  const handleBackToScheme = () => {
    setCurrentStep('scheme-selection');
    setSelectedSchemeId(null);
    setForcedLogicMode(null);
  };

  const handleBackToUrl = () => {
    setCurrentStep('url-input');
    setAnalysisResult(null);
    setSourceUrl('');
    setUserPrompt('');
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

  const steps: StepItem[] = [
    { id: 'scheme-selection', label: 'Funding', description: 'Select Scheme' },
    { id: 'url-input', label: 'Context', description: 'Project Input' },
    { id: 'ideas', label: 'Concept', description: 'Generate Ideas' },
    { id: 'partners', label: 'Consortium', description: 'Select Partners' },
    { id: 'proposal', label: 'Finalize', description: 'View Proposal' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <ProgressSteps steps={steps} currentStepId={currentStep} />
      </div>

      {currentStep === 'scheme-selection' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SchemeSelectorStep onSelect={handleSchemeSelect} />
        </div>
      )}

      {currentStep === 'url-input' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <URLInputStep
            onSubmit={handleUrlSubmit}
            onBack={handleBackToScheme}
            initialSchemeId={selectedSchemeId}
          />
        </div>
      )}

      {currentStep === 'ideas' && analysisResult && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          {logicMode === 'mobility' ? (
            <MobilityIdeasStep
              analysisResult={analysisResult}
              sourceUrl={sourceUrl}
              userPrompt={userPrompt}
              onSelectIdea={handleSelectIdea}
              onBack={handleBackToUrl}
            />
          ) : (
            <StandardIdeasStep
              analysisResult={analysisResult}
              sourceUrl={sourceUrl}
              userPrompt={userPrompt}
              onSelectIdea={handleSelectIdea}
              onBack={handleBackToUrl}
            />
          )}
        </div>
      )}

      {currentStep === 'partners' && selectedIdea && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
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
        </div>
      )}

      {currentStep === 'proposal' && selectedIdea && analysisResult && (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          {logicMode === 'mobility' ? (
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
            <StandardProposalStep
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
      )}
    </div>
  );
}
