import React, { useState, useEffect } from 'react';
import { Loader2, Eye, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import type { FullProposal } from '../types/proposal';
import { ConfirmDialog } from './patterns';


interface SavedProposalsPageProps {
  onViewProposal: (id: string) => void;
}

export function SavedProposalsPage({ onViewProposal }: SavedProposalsPageProps) {
  const [proposals, setProposals] = useState<FullProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');

  const [filterMode, setFilterMode] = useState<'all' | 'standard' | 'mobility'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/proposals`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load proposals');
      }

      const data = await response.json();
      setProposals(data.proposals || []);
    } catch (error: any) {
      console.error('Load error:', error);
      toast.error(error.message || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const executeDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`${serverUrl}/proposals/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete proposal');
      }

      setProposals(proposals.filter(p => p.id !== deleteId));
      toast.success('Proposal deleted');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete proposal');
    }
  };

  const filteredProposals = proposals
    .filter(proposal => {
      const matchesSearch =
        proposal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.selectedIdea?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.projectUrl?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = filterMode === 'all' ||
        proposal.logic_mode === filterMode ||
        (filterMode === 'standard' && !proposal.logic_mode);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        const dateA = new Date(a.savedAt || a.generatedAt || 0).getTime();
        const dateB = new Date(b.savedAt || b.generatedAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'oldest') {
        const dateA = new Date(a.savedAt || a.generatedAt || 0).getTime();
        const dateB = new Date(b.savedAt || b.generatedAt || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === 'az') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'za') {
        return (b.title || '').localeCompare(a.title || '');
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium animate-pulse">Loading your proposals...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Saved Proposals</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Browse and manage your AI-generated project proposals. {proposals.length} total.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-end">
        <div className="relative group flex-1 w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-blue-500" />
          <Input
            placeholder="Search proposals by title, idea, or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-6 bg-white border-slate-200 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl shadow-sm transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="flex-1 lg:w-40">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none h-[48px]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">Title (A-Z)</option>
              <option value="za">Title (Z-A)</option>
            </select>
          </div>

          <div className="flex-1 lg:w-40">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Type</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none h-[48px]"
            >
              <option value="all">All Types</option>
              <option value="standard">WP-Based</option>
              <option value="mobility">Mobility</option>
            </select>
          </div>
        </div>
      </div>

      {filteredProposals.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">
            {searchQuery ? 'No proposals match your search criteria' : 'You haven\'t saved any proposals yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="bg-white border-slate-200 hover:border-blue-400 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardHeader className="bg-slate-50/50 border-b border-slate-50 px-6 py-5 group-hover:bg-blue-50/30 transition-colors">
                <CardTitle className="text-base font-bold text-slate-900 line-clamp-2 leading-snug tracking-tight">{proposal.title}</CardTitle>
                <CardDescription className="line-clamp-1 text-slate-500 font-medium text-xs mt-1">
                  {proposal.selectedIdea?.title || 'Standalone Proposal'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {proposal.projectUrl && (
                  <p className="text-[10px] text-blue-600 bg-blue-50 self-start px-2 py-1 rounded inline-block font-bold truncate max-w-full">
                    {proposal.projectUrl}
                  </p>
                )}
                <div className="flex gap-4 border-t border-slate-50 pt-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date Created</p>
                    <p className="text-xs font-bold text-slate-700">{new Date(proposal.savedAt || proposal.generatedAt || '').toLocaleDateString()}</p>
                  </div>
                  {proposal.updatedAt && proposal.updatedAt !== proposal.savedAt && (
                    <div className="flex-1 space-y-1 text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last Modified</p>
                      <p className="text-xs font-bold text-slate-700">{new Date(proposal.updatedAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => onViewProposal(proposal.id!)}
                    className="flex-[3] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Open Proposal
                  </Button>
                  <Button
                    onClick={() => handleDeleteClick(proposal.id!)}
                    variant="ghost"
                    className="flex-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={executeDelete}
        title="Delete Proposal"
        description="Are you sure you want to permanently delete this proposal? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete Proposal"
      />
    </div>
  );
}
