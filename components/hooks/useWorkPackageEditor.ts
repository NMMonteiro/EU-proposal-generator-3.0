import { useState } from 'react';
import type { FullProposal, WorkPackage } from '../../types/proposal';

export function useWorkPackageEditor(proposal: FullProposal | null, setProposal: (p: FullProposal) => void) {

    const updateWP = (index: number, updates: Partial<WorkPackage>) => {
        if (!proposal?.workPackages) return;
        const newWPs = [...proposal.workPackages];
        newWPs[index] = { ...newWPs[index], ...updates };
        setProposal({ ...proposal, workPackages: newWPs });
    };

    const addWP = (wp: WorkPackage = {
        name: 'New Work Package',
        description: '',
        activities: [],
        deliverables: []
    }) => {
        const newWPs = [...(proposal?.workPackages || []), wp];
        setProposal({ ...proposal, workPackages: newWPs });
    };

    const removeWP = (index: number) => {
        if (!proposal?.workPackages) return;
        const newWPs = proposal.workPackages.filter((_, i) => i !== index);
        setProposal({ ...proposal, workPackages: newWPs });
    };

    const updateActivity = (wpIndex: number, actIndex: number, updates: any) => {
        if (!proposal?.workPackages) return;
        const newWPs = [...proposal.workPackages];
        const wp = { ...newWPs[wpIndex] };
        const activities = [...(wp.activities || [])];
        activities[actIndex] = { ...activities[actIndex], ...updates };
        wp.activities = activities;
        newWPs[wpIndex] = wp;
        setProposal({ ...proposal, workPackages: newWPs });
    };

    const addActivity = (wpIndex: number) => {
        if (!proposal?.workPackages) return;
        const newWPs = [...proposal.workPackages];
        const wp = { ...newWPs[wpIndex] };
        const activities = [...(wp.activities || []), {
            name: 'New Activity',
            description: '',
            leadPartner: '',
            estimatedBudget: 0
        }];
        wp.activities = activities;
        newWPs[wpIndex] = wp;
        setProposal({ ...proposal, workPackages: newWPs });
    };

    const removeActivity = (wpIndex: number, actIndex: number) => {
        if (!proposal?.workPackages) return;
        const newWPs = [...proposal.workPackages];
        const wp = { ...newWPs[wpIndex] };
        const activities = (wp.activities || []).filter((_, i) => i !== actIndex);
        wp.activities = activities;
        newWPs[wpIndex] = wp;
        setProposal({ ...proposal, workPackages: newWPs });
    };

    return {
        updateWP,
        addWP,
        removeWP,
        updateActivity,
        addActivity,
        removeActivity
    };
}
