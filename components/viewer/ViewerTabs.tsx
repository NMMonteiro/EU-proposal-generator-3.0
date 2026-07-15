import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';

import {
    ResponsiveSectionContent,
    DynamicWorkPackageSection,
    DynamicBudgetSection,
    DynamicRiskSection,
    DynamicPartnerSection,
    MobilityBudgetSection,
    MobilityActivitiesSection
} from '../ProposalSections';
import { AnnexesManager } from '../AnnexesManager';
import { ExpertIntelligenceView } from '../patterns';
import type { FullProposal } from '../../types/proposal';
import type { DisplaySection } from '../../utils/proposal-assembly';

interface ViewerTabsProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    proposal: FullProposal;
    sections: DisplaySection[];
    onEdit: (section: DisplaySection) => void;
    onAddPartner: () => void;
    budgetLimit: number;
    onRebalance: (limit: number) => void;
    onAiEdit: (section: DisplaySection) => void;
    onUpdateBudgetItem: (index: number, updates: any) => void;
    onAddBudgetItem: (item?: any) => void;
    onRemoveBudgetItem: (index: number) => void;
    onUpdateSubBudgetItem?: (itemIndex: number, subIndex: number, updates: any) => void;
    onAddSubBudgetItem?: (itemIndex: number) => void;
    onRemoveSubBudgetItem?: (itemIndex: number, subIndex: number) => void;
    onUpdateWP?: (index: number, updates: any) => void;
    onAddWP?: () => void;
    onRemoveWP?: (index: number) => void;
    onUpdateActivity?: (wpIndex: number, actIndex: number, updates: any) => void;
    onAddActivity?: (wpIndex: number) => void;
    onRemoveActivity?: (wpIndex: number, actIndex: number) => void;
    onAnnexesUpdate?: () => void;
    logicMode?: 'standard' | 'mobility' | 'lumpsum' | string;
    proposalId?: string;
}

export function ViewerTabs({
    activeTab,
    setActiveTab,
    proposal,
    sections,
    onEdit,
    onAddPartner,
    budgetLimit,
    onRebalance,
    onUpdateBudgetItem,
    onAddBudgetItem,
    onRemoveBudgetItem,
    onUpdateSubBudgetItem,
    onAddSubBudgetItem,
    onRemoveSubBudgetItem,
    onUpdateWP,
    onAddWP,
    onRemoveWP,
    onUpdateActivity,
    onAddActivity,
    onRemoveActivity,
    onAiEdit,
    onAnnexesUpdate,
    logicMode = 'standard',
    proposalId
}: ViewerTabsProps) {
    const isMobility = logicMode === 'mobility';

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="narrative" className="mt-0 focus-visible:outline-none">
                <div className="max-w-4xl mx-auto space-y-12 pb-24">
                    {sections.filter(s => !['partners', 'budget', 'risk', 'wp_list', 'work_package', 'partner_profiles'].includes(s.type || '')).map((section) => (
                        <ResponsiveSectionContent
                            key={section.id}
                            id={section.id}
                            title={section.title}
                            content={section.content || ''}
                            description={section.description}
                            level={section.level}
                            onEdit={() => onEdit(section)}
                            onAiEdit={() => onAiEdit(section)}
                        />
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="partners" className="mt-0">
                <div className="max-w-7xl mx-auto space-y-8">
                    <DynamicPartnerSection
                        partners={proposal.partners || []}
                        onAddPartner={onAddPartner}
                    />
                </div>
            </TabsContent>

            <TabsContent value="budget" className="mt-0 focus-visible:outline-none">
                <div className="max-w-7xl mx-auto space-y-6">
                    {isMobility ? (
                        <MobilityBudgetSection
                            budget={proposal.budget || []}
                            currency={proposal.settings?.currency || 'EUR'}
                            mobilityMetadata={proposal.mobilityMetadata}
                            activities={proposal.workPackages || []}
                            proposalId={proposalId || proposal.id}
                            limit={budgetLimit}
                            onRebalance={onRebalance}
                            onUpdateItem={onUpdateBudgetItem}
                            onAddItem={onAddBudgetItem}
                            onRemoveItem={onRemoveBudgetItem}
                            onUpdateSubItem={onUpdateSubBudgetItem}
                            onAddSubItem={onAddSubBudgetItem}
                            onRemoveSubItem={onRemoveSubBudgetItem}
                        />
                    ) : (
                        <DynamicBudgetSection
                            budget={proposal.budget || []}
                            currency={proposal.settings?.currency || 'EUR'}
                            limit={budgetLimit}
                            onRebalance={onRebalance}
                            onUpdateItem={onUpdateBudgetItem}
                            onAddItem={onAddBudgetItem}
                            onRemoveItem={onRemoveBudgetItem}
                            onUpdateSubItem={onUpdateSubBudgetItem}
                            onAddSubItem={onAddSubBudgetItem}
                            onRemoveSubItem={onRemoveSubBudgetItem}
                        />
                    )}
                </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
                <div className="max-w-7xl mx-auto space-y-8">
                    {isMobility ? (
                        <MobilityActivitiesSection
                            activities={proposal.workPackages || []}
                            currency={proposal.settings?.currency || 'EUR'}
                        />
                    ) : (
                        <DynamicWorkPackageSection
                            workPackages={proposal.workPackages || []}
                            currency={proposal.settings?.currency || 'EUR'}
                            onUpdateWP={onUpdateWP}
                            onAddWP={onAddWP}
                            onRemoveWP={onRemoveWP}
                            onUpdateActivity={onUpdateActivity}
                            onAddActivity={onAddActivity}
                            onRemoveActivity={onRemoveActivity}
                        />
                    )}
                </div>
            </TabsContent>

            <TabsContent value="risks" className="mt-0">
                <div className="max-w-4xl mx-auto space-y-8">
                    <DynamicRiskSection
                        risks={proposal.risks || []}
                    />
                </div>
            </TabsContent>

            <TabsContent value="annexes" className="mt-0">
                <div className="max-w-5xl mx-auto space-y-8 pb-24">
                    <AnnexesManager
                        proposalId={proposal.id || ''}
                        annexes={proposal.annexes || []}
                        onUpdate={onAnnexesUpdate || (() => { })}
                    />
                </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-0">
                <div className="max-w-5xl mx-auto space-y-8 pb-24 h-full">
                    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                        <ExpertIntelligenceView
                            data={proposal.fundingScheme?.expert_rules}
                            title="Expert Intelligence Playbook"
                            source={`${proposal.fundingScheme?.name} Directives`}
                        />
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    );
};
