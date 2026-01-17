import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info.tsx';
import { PartnerSelectionModal } from './PartnerSelectionModal';
import { Button } from '@/components/ui/button';
import { ProposalCopilot } from './ProposalCopilot';
import { AiSectionDialog } from './AiSectionDialog';
import { SettingsDialog } from './SettingsDialog';
import { assembleDocument } from '../utils/proposal-assembly';

// Sub-components
import { ViewerHeader } from './viewer/ViewerHeader';
import { ViewerSidebar } from './viewer/ViewerSidebar';
import { ViewerTabs } from './viewer/ViewerTabs';

// Hooks
import { useProposalViewer as useProposalData } from './hooks/useProposalData';
import { useBudgetEditor } from './hooks/useBudgetEditor';

interface ProposalViewerPageProps {
    proposalId: string;
    onBack: () => void;
}

export function ProposalViewerPage({ proposalId, onBack }: ProposalViewerPageProps) {
    const {
        proposal,
        setProposal,
        loading,
        activeTab,
        setActiveTab,
        isExporting,
        settings,
        setSettings,
        saveProposal,
        handleExport,
        refresh
    } = useProposalData(proposalId);

    const { budgetLimit, setBudgetLimit, handleRebalance } = useBudgetEditor(proposal, setProposal);

    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCopilotOpen, setIsCopilotOpen] = useState(false);
    const [isAiSectionDialogOpen, setIsAiSectionDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [aiEditTarget, setAiEditTarget] = useState<{
        id: string;
        title: string;
        content: string;
    } | null>(null);

    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editingSectionTitle, setEditingSectionTitle] = useState('');
    const [editingContent, setEditingContent] = useState('');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4 bg-background">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium">Hydrating Proposal Intelligence...</p>
            </div>
        );
    }

    if (!proposal) return null;

    const sections = assembleDocument(proposal);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <ViewerHeader
                title={proposal.title}
                schemeName={proposal.fundingScheme?.name}
                onBack={onBack}
                onExport={handleExport}
                isExporting={isExporting}
                onSettingsOpen={() => setIsSettingsOpen(true)}
                onAiEditOpen={() => {
                    toast.info("Select a section's sparkle icon to edit it with AI, or use the Copilot.");
                }}
                onCopilotOpen={() => setIsCopilotOpen(true)}
            />

            <div className="flex flex-1 overflow-hidden max-w-[1600px] mx-auto w-full">
                <ViewerSidebar
                    sections={sections}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    logicMode={proposal.fundingScheme?.logic_mode || 'standard'}
                    onSectionClick={(id) => {
                        setActiveTab('narrative');
                        const el = document.getElementById(id);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                />

                <main className="flex-1 overflow-y-auto bg-background/50 backdrop-blur-sm p-4 sm:p-8 lg:p-12 border-l border-border/40">
                    <ViewerTabs
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        proposal={proposal}
                        sections={sections}
                        logicMode={proposal.fundingScheme?.logic_mode || 'standard'}
                        onEdit={(s) => {
                            setEditingSectionId(s.id);
                            setEditingSectionTitle(s.title);
                            setEditingContent(s.content || '');
                            setIsEditDialogOpen(true);
                        }}
                        onAiEdit={(s) => {
                            setAiEditTarget({
                                id: s.id,
                                title: s.title,
                                content: s.content || ''
                            });
                            setIsAiSectionDialogOpen(true);
                        }}
                        onAddPartner={() => setIsPartnerModalOpen(true)}
                        budgetLimit={budgetLimit}
                        onRebalance={handleRebalance}
                        onAnnexesUpdate={async () => {
                            try {
                                const response = await fetch(`${serverUrl}/proposals/${proposalId}`, {
                                    headers: {
                                        'Authorization': `Bearer ${publicAnonKey}`,
                                        'apikey': publicAnonKey,
                                    },
                                });
                                if (response.ok) {
                                    const data = await response.json();
                                    setProposal(data);
                                }
                            } catch (error) {
                                console.error('Failed to refetch proposal:', error);
                            }
                        }}
                    />
                </main>
            </div>

            {/* Modals & Assistants */}
            <PartnerSelectionModal
                isOpen={isPartnerModalOpen}
                onClose={() => setIsPartnerModalOpen(false)}
                onConfirm={async (selectedPartners) => {
                    const updatedProposal = {
                        ...proposal,
                        partners: selectedPartners
                    };
                    setProposal(updatedProposal);

                    try {
                        await saveProposal(updatedProposal);
                        toast.success('Partners updated successfully');
                    } catch (error) {
                        console.error('Failed to save partners:', error);
                        toast.error('Failed to save partners');
                    }

                    setIsPartnerModalOpen(false);
                }}
                proposalContext={`${proposal.title} ${proposal.summary}`}
                currentPartners={proposal.partners || []}
            />

            <ProposalCopilot
                isOpen={isCopilotOpen}
                onClose={() => setIsCopilotOpen(false)}
                proposalId={proposalId}
                onProposalUpdate={() => {
                    // Refetch proposal data without full page reload
                    refresh();
                }}
            />

            {aiEditTarget && (
                <AiSectionDialog
                    isOpen={isAiSectionDialogOpen}
                    onClose={() => setIsAiSectionDialogOpen(false)}
                    proposalId={proposalId}
                    sectionKey={aiEditTarget.id}
                    sectionTitle={aiEditTarget.title}
                    currentContent={aiEditTarget.content}
                    onUpdate={(newContent) => {
                        const updatedProposal = { ...proposal };
                        const dynSections = updatedProposal.dynamic_sections || updatedProposal.dynamicSections || {};
                        dynSections[aiEditTarget.id] = newContent;
                        updatedProposal.dynamicSections = dynSections;
                        setProposal(updatedProposal);
                    }}
                />
            )}

            {/* Settings Dialog */}
            <SettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentSettings={settings}
                onSave={async (newSettings) => {
                    setSettings(newSettings);
                    const updatedProposal = { ...proposal, settings: newSettings };
                    try {
                        await saveProposal(updatedProposal);
                        toast.success('Settings updated');
                    } catch (error) {
                        toast.error('Failed to save settings');
                    }
                }}
            />

            {/* Floating Chat Button */}
            {!isCopilotOpen && (
                <Button
                    onClick={() => setIsCopilotOpen(true)}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-primary to-primary/80 hover:scale-110 active:scale-95 transition-all z-50 p-0 border-4 border-background flex items-center justify-center"
                >
                    <span className="text-primary-foreground"><MessageSquareText className="w-6 h-6" /></span>
                </Button>
            )}
        </div>
    );
}
