import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Loader2, Search, CheckCircle, XCircle, Clock, Calendar, Euro } from 'lucide-react';
import { searchEuFunding } from '../utils/euApiService';
import { serverUrl } from '../utils/supabase/info';

interface DisplayOpportunity {
    id: string;
    call_id: string;
    title: string;
    description: string;
    url: string;
    status: string;
    deadline: string | null;
    budget: string;
    funding_entity: string;
    topic: string;
}

export function FundingSearchHybrid() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<DisplayOpportunity[]>([]);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setResults([]);

        try {
            console.log('[Funding] Fetching from EU API...');
            const opportunities = await searchEuFunding(query);

            console.log('[Funding] RAW opportunities:', opportunities);
            console.log('[Funding] First opportunity full:', opportunities[0]);

            console.log('[Funding] Opportunities from API:', opportunities.map(o => ({
                call_id: o.call_id,
                deadline: o.deadline
            })));

            console.log('[Funding] Saving to Firestore cache...');

            if (opportunities.length > 0) {
                await fetch(`${serverUrl}/funding-opportunities`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        opportunities: opportunities.map(opp => ({
                            call_id: opp.call_id,
                            title: opp.title,
                            description: opp.description,
                            url: opp.url,
                            status: opp.status || 'Open',
                            deadline: opp.deadline || null,
                            budget: opp.budget,
                            funding_entity: opp.funding_entity,
                            topic: opp.topic,
                            ccmId: opp.ccmId,
                            search_query: query
                        }))
                    })
                });
            }

            console.log('[Funding] Loading from Firestore cache...');
            const res = await fetch(`${serverUrl}/funding-opportunities?query=${encodeURIComponent(query)}`);
            if (!res.ok) {
                throw new Error(`Failed to fetch cached opportunities: ${res.statusText}`);
            }
            const data = await res.json();

            console.log('[Funding] Data from Cache:', data?.map((d: any) => ({ call_id: d.call_id, deadline: d.deadline })));

            setResults(data || []);

        } catch (err) {
            console.error('[Funding] Error:', err);
            alert('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('open')) return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Open</Badge>;
        if (s.includes('upcoming')) return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Upcoming</Badge>;
        if (s.includes('closed')) return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Closed</Badge>;
        return <Badge>{status}</Badge>;
    };

    const formatDeadline = (d: string | null) => {
        if (!d) return 'Not specified';
        try {
            const date = new Date(d);
            return isNaN(date.getTime()) ? 'Not specified' : date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Not specified';
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>🔍 EU Funding Search</CardTitle>
                    <CardDescription>Search for EU funding opportunities with accurate deadline information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search (e.g., AI, climate)..."
                            disabled={loading}
                        />
                        <Button onClick={handleSearch} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                            Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {results.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{results.length} Opportunities Found</h3>
                    {results.map((opp) => (
                        <Card key={opp.id}>
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    {getStatusBadge(opp.status)}
                                    <Badge variant="outline" className="font-mono text-xs">{opp.call_id}</Badge>
                                </div>
                                <CardTitle className="text-lg">
                                    <a href={opp.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                        {opp.title}
                                    </a>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground line-clamp-3">{opp.description}</p>
                                <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-md">
                                    <div>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Deadline
                                        </span>
                                        <span className="font-medium text-sm">{opp.deadline || 'Not specified'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Euro className="w-3 h-3" /> Budget
                                        </span>
                                        <span className="font-medium text-sm">{opp.budget || 'See details'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">🏛️ Entity</span>
                                        <span className="font-medium text-sm block">{opp.funding_entity || 'EU'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
