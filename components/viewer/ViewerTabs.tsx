import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, DollarSign, Calendar, Users, AlertTriangle, FileText } from 'lucide-react';
import {
    ResponsiveSectionContent,
    DynamicWorkPackageSection,
    DynamicBudgetSection,
    DynamicRiskSection,
    DynamicPartnerSection
} from '../ProposalSections';
import { AnnexesManager } from '../AnnexesManager';
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
    onAnnexesUpdate?: () => void;
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
    onAnnexesUpdate
}: ViewerTabsProps) {
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
                        />
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="partners" className="mt-0">
                <div className="max-w-5xl mx-auto space-y-8">
                    <DynamicPartnerSection
                        partners={proposal.partners || []}
                        onAddPartner={onAddPartner}
                    />
                </div>
            </TabsContent>

            <TabsContent value="budget" className="mt-0">
                <div className="max-w-5xl mx-auto space-y-8">
                    <DynamicBudgetSection
                        budget={proposal.budget || []}
                        currency={proposal.settings?.currency || 'EUR'}
                        limit={budgetLimit}
                        onRebalance={onRebalance}
                    />
                </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
                <div className="max-w-5xl mx-auto space-y-8">
                    <DynamicWorkPackageSection
                        workPackages={proposal.workPackages || []}
                        currency={proposal.settings?.currency || 'EUR'}
                    />
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
        </Tabs>
    );
}
