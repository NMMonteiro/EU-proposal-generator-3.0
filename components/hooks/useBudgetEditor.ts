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

    const addItem = (item: any = { item: 'New Item', cost: 0, description: '' }) => {
        const newBudget = [...(proposal?.budget || []), item];
        setProposal({ ...proposal, budget: newBudget });
    };

    const removeItem = (index: number) => {
        if (!proposal?.budget) return;
        const newBudget = proposal.budget.filter((_: any, i: number) => i !== index);
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
        removeItem
    };
}
