import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../../utils/supabase/info';

export function useBudgetEditor(proposal: any, setProposal: (p: any) => void) {
    const [budgetLimit, setBudgetLimit] = useState<number>(0);

    useEffect(() => {
        if (proposal?.constraints?.budget) {
            const limitMatch = proposal.constraints.budget.replace(/,/g, '').match(/(\d+)/);
            if (limitMatch) setBudgetLimit(parseInt(limitMatch[0]));
        } else if (proposal?.budget) {
            const currentTotal = proposal.budget.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);
            if (currentTotal > 0 && budgetLimit === 0) setBudgetLimit(currentTotal);
        }
    }, [proposal]);

    const updateItem = (index: number, updates: any) => {
        if (!proposal?.budget) return;
        const newBudget = [...proposal.budget];
        newBudget[index] = { ...newBudget[index], ...updates };
        setProposal({ ...proposal, budget: newBudget });
    };

    const addItem = (item: any = { item: 'New Item', cost: 0, description: '', breakdown: [] }) => {
        const newBudget = [...(proposal?.budget || []), item];
        setProposal({ ...proposal, budget: newBudget });
    };

    const removeItem = (index: number) => {
        if (!proposal?.budget) return;
        const newBudget = proposal.budget.filter((_: any, i: number) => i !== index);
        setProposal({ ...proposal, budget: newBudget });
    };

    const updateSubItem = (itemIndex: number, subIndex: number, updates: any) => {
        if (!proposal?.budget) return;
        const newBudget = [...proposal.budget];
        const item = { ...newBudget[itemIndex] };
        const breakdown = [...(item.breakdown || [])];
        const subItem = { ...breakdown[subIndex], ...updates };

        // Auto-calculate sub-item total if qty or unit cost changes
        if (updates.quantity !== undefined || updates.unitCost !== undefined) {
            subItem.total = (Number(subItem.quantity) || 0) * (Number(subItem.unitCost) || 0);
        }

        breakdown[subIndex] = subItem;

        // ALWAYS Recalculate item total if breakdown exists
        item.cost = breakdown.reduce((sum: number, sub: any) => sum + (Number(sub.total) || 0), 0);

        item.breakdown = breakdown;
        newBudget[itemIndex] = item;
        setProposal({ ...proposal, budget: newBudget });
    };

    const addSubItem = (itemIndex: number) => {
        if (!proposal?.budget) return;
        const newBudget = [...proposal.budget];
        const item = { ...newBudget[itemIndex] };
        const breakdown = [...(item.breakdown || []), { subItem: 'New Sub-item', quantity: 1, unitCost: 0, total: 0 }];
        item.breakdown = breakdown;
        // Cost should be updated too in case adding an item changes total (though 0 total doesn't change it, it's good for consistency)
        item.cost = breakdown.reduce((sum: number, sub: any) => sum + (Number(sub.total) || 0), 0);
        newBudget[itemIndex] = item;
        setProposal({ ...proposal, budget: newBudget });
    };

    const removeSubItem = (itemIndex: number, subIndex: number) => {
        if (!proposal?.budget || !proposal.budget[itemIndex]?.breakdown) return;
        const newBudget = [...proposal.budget];
        const item = { ...newBudget[itemIndex] };
        const breakdown = item.breakdown.filter((_: any, i: number) => i !== subIndex);
        item.breakdown = breakdown;
        item.cost = breakdown.reduce((sum: number, sub: any) => sum + (Number(sub.total) || 0), 0);
        newBudget[itemIndex] = item;
        setProposal({ ...proposal, budget: newBudget });
    };

    const handleRebalance = async (newLimit: number) => {
        if (!proposal) return;
        setBudgetLimit(newLimit);
        toast.info("Rescaling budget items...");

        try {
            const response = await fetch(`${serverUrl}/proposals/${proposal.id}/rebalance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({ targetBudget: newLimit, proposal })
            });

            if (response.ok) {
                const updated = await response.json();
                setProposal(updated);
                toast.success("Budget rescaled successfully!");
            }
        } catch (e) {
            toast.error("Failed to rescale budget");
        }
    };

    return {
        budgetLimit,
        setBudgetLimit,
        handleRebalance,
        updateItem,
        addItem,
        removeItem,
        updateSubItem,
        addSubItem,
        removeSubItem
    };
}
