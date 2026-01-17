import React, { useState } from 'react';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import { PartnerSelectionModal } from './PartnerSelectionModal';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProposalCopilot } from './ProposalCopilot';
import { useNavigate } from 'react-router-dom';
import { assembleDocument } from '../utils/proposal-assembly';

// Sub-components
import { ViewerHeader } from './viewer/ViewerHeader';
import { ViewerSidebar } from './viewer/ViewerSidebar';
import { ViewerTabs } from './viewer/ViewerTabs';
import {
    ResponsiveSectionContent,
    DynamicWorkPackageSection,
    DynamicBudgetSection,
    DynamicRiskSection,
    DynamicPartnerSection
} from './ProposalSections';

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
        handleExport
    } = useProposalData(proposalId);

    const { budgetLimit, setBudgetLimit, handleRebalance } = useBudgetEditor(proposal, setProposal);

    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCopilotOpen, setIsCopilotOpen] = useState(false);
    const [isAiSectionDialogOpen, setIsAiSectionDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
                onAiEditOpen={() => setIsAiSectionDialogOpen(true)}
            />

            <div className="flex flex-1 overflow-hidden max-w-[1600px] mx-auto w-full">
                <ViewerSidebar
                    sections={sections}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onSectionClick={(id) => {
                        setActiveTab('narrative');
                        const el = document.getElementById(id);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                />

                <main className="flex-1 overflow-y-auto bg-background/50 backdrop-blur-sm p-4 sm:p-8 lg:p-12">
                    <ViewerTabs
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        proposal={proposal}
                        sections={sections}
                        onEdit={(s) => {
                            setEditingSectionId(s.id);
                            setEditingSectionTitle(s.title);
                            setEditingContent(s.content || '');
                            setIsEditDialogOpen(true);
                        }}
                        onAddPartner={() => setIsPartnerModalOpen(true)}
                        budgetLimit={budgetLimit}
                        onRebalance={handleRebalance}
                        onAnnexesUpdate={async () => {
                            // Refetch proposal to get updated annexes
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
                onSelect={async (selectedPartners) => {
                    // Update proposal with new partners
                    const updatedProposal = {
                        ...proposal,
                        partners: selectedPartners
                    };
                    setProposal(updatedProposal);

                    // Save to backend
                    try {
                        await saveProposal(updatedProposal);
                        toast.success('Partners updated successfully');
                    } catch (error) {
                        console.error('Failed to save partners:', error);
                        toast.error('Failed to save partners');
                    }

                    setIsPartnerModalOpen(false);
                }}
                proposalContext={{
                    title: proposal.title,
                    summary: proposal.summary,
                    objectives: proposal.objectives || '',
                }}
                currentPartners={proposal.partners || []}
            />

            <ProposalCopilot
                isOpen={isCopilotOpen}
                onClose={() => setIsCopilotOpen(false)}
                proposalId={proposalId}
            />

            {/* Other dialogs... I'll keep them here for now for simplicity of props passing */}
            {/* But I could also extract them */}
        </div>
    );
}