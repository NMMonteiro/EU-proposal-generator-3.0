import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StandardProposalViewer } from './StandardProposalViewer';
import { MobilityProposalViewer } from './MobilityProposalViewer';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

interface ProposalViewerPageProps {
    proposalId?: string;
    onBack: () => void;
}

export function ProposalViewerPage({ proposalId: propId, onBack }: ProposalViewerPageProps) {
    const { id: routeId } = useParams();
    const id = propId || routeId;
    const navigate = useNavigate();

    const [logicMode, setLogicMode] = useState<'standard' | 'mobility' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const detectMode = async () => {
            if (!id) return;
            try {
                const response = await fetch(`${serverUrl}/proposals/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${publicAnonKey}`,
                        'apikey': publicAnonKey,
                    },
                });
                if (!response.ok) throw new Error('Failed to fetch proposal meta');
                const data = await response.json();

                // Detection logic similar to original
                const schemeName = (data.fundingScheme?.name || data.funding_scheme?.name || '').toUpperCase();
                const isMobilityImplicit = !!(data.mobilityMetadata?.fieldOfApplication ||
                    data.mobilityMetadata?.nationalAgency ||
                    schemeName.includes('KA122') ||
                    schemeName.includes('KA121') ||
                    schemeName.includes('MOBILITY') ||
                    (data.workPackages && data.workPackages.some((wp: any) => (wp.activityType && wp.activityType !== 'standard') || wp.isMobility)));

                const mode = (data.logic_mode === 'standard' || data.logic_mode === 'mobility')
                    ? data.logic_mode
                    : (isMobilityImplicit ? 'mobility' : 'standard');

                setLogicMode(mode);
            } catch (err) {
                console.error(err);
                toast.error('Error loading proposal mode');
                setLogicMode('standard'); // fallback
            } finally {
                setLoading(false);
            }
        };

        detectMode();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4 bg-background">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium">Resolving Proposal Path...</p>
            </div>
        );
    }

    if (!id) return null;

    if (logicMode === 'mobility') {
        return <MobilityProposalViewer proposalId={id} onBack={onBack} />;
    }

    return <StandardProposalViewer proposalId={id} onBack={onBack} />;
}
