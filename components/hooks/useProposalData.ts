import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../../utils/supabase/info';
import type { FullProposal, ProposalSettings } from '../../types/proposal';
import { exportToDocx } from '../../utils/export-docx';

export function useProposalViewer(proposalId: string) {
    const [proposal, setProposal] = useState<FullProposal | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('narrative');
    const [isExporting, setIsExporting] = useState(false);
    const [settings, setSettings] = useState<ProposalSettings>({ currency: 'EUR', sourceUrl: '' });

    const loadProposal = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/proposals/${proposalId}?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${publicAnonKey}` },
            });

            if (!response.ok) throw new Error('Failed to load proposal');

            const data = await response.json();
            setProposal(data);

            if (data.settings) setSettings(data.settings);
            else if (data.projectUrl) setSettings(prev => ({ ...prev, sourceUrl: data.projectUrl }));

        } catch (error: any) {
            console.error('Load error:', error);
            toast.error(error.message || 'Failed to load proposal');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [proposalId]);

    const saveProposal = async (updatedProposal: FullProposal) => {
        try {
            const response = await fetch(`${serverUrl}/proposals/${updatedProposal.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify(updatedProposal),
            });

            if (!response.ok) throw new Error('Failed to save proposal');

            const savedData = await response.json();
            setProposal(savedData);
            return savedData;
        } catch (error: any) {
            toast.error('Save failed: ' + error.message);
            throw error;
        }
    };

    const handleExport = async () => {
        if (!proposal) return;
        setIsExporting(true);
        toast.info("Generating document...");
        try {
            await saveProposal(proposal);
            await exportToDocx(proposal);
            toast.success("Proposal exported!");
        } catch (error) {
            toast.error('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        loadProposal();
    }, [loadProposal]);

    return {
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
        refresh: () => loadProposal(true)
    };
}
