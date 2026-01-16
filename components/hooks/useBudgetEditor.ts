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

    const handleRebalance = async (newLimit: number) => {
        if (!proposal) return;
        setBudgetLimit(newLimit);
        toast.info("Rescaling budget items...");

        try {
            // We can do this locally or call backend
            // Let's call backend for consistency
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
        handleRebalance
    };
}
