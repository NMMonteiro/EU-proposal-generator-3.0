import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Pencil, Search, Building2, Globe, Mail, Upload, Trash2, User, Phone, SortAsc, SortDesc, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import type { Partner } from '../types/partner';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

interface PartnersPageProps {
    onEditPartner?: (id: string) => void;
}

export function PartnersPage({ onEditPartner }: PartnersPageProps) {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [partnerToDelete, setPartnerToDelete] = useState<{ id: string; name: string } | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'newest'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/partners`, {
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load partners');
            }

            const data = await response.json();
            setPartners(data.partners || []);
        } catch (error: any) {
            console.error('Load error:', error);
            toast.error(error.message || 'Failed to load partners');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: string, name: string) => {
        setPartnerToDelete({ id, name });
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!partnerToDelete) return;

        const { id, name } = partnerToDelete;
        setDeleteDialogOpen(false);

        try {
            const response = await fetch(`${serverUrl}/partners/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete partner');
            }

            setPartners(partners.filter(p => p.id !== id));
            toast.success(`${name} deleted`);
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(error.message || 'Failed to delete partner');
        } finally {
            setPartnerToDelete(null);
        }
    };

    const handleCreateNew = () => {
        if (onEditPartner) {
            onEditPartner('new');
        }
    };

    const filteredPartners = partners
        .filter(partner => !!partner && !!partner.name)
        .filter(partner =>
            partner.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            partner.acronym?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            partner.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            partner.organizationType?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'name') {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return sortDirection === 'asc'
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            }
            if (sortBy === 'newest') {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
            }
            return 0;
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-blue-600" />
                        Consortium Partners
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Manage your network of participating organizations. {partners.length} partners registered.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleCreateNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-xl px-6 font-bold transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Partner
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            id="partners-page-pdf-upload"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const toastId = toast.loading('Extracting partner data...');
                                try {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    const response = await fetch(`${serverUrl}/import-partner-pdf`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
                                        body: formData
                                    });
                                    if (!response.ok) throw new Error('Extraction failed');
                                    const data = await response.json();
                                    toast.dismiss(toastId);
                                    toast.success('Partner imported successfully!');
                                    if (onEditPartner) onEditPartner(data.partnerId);
                                } catch (error: any) {
                                    toast.dismiss(toastId);
                                    toast.error(`Import failed: ${error.message}`);
                                } finally {
                                    e.target.value = '';
                                }
                            }}
                        />
                        <Button
                            variant="outline"
                            onClick={() => document.getElementById('partners-page-pdf-upload')?.click()}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-6 font-bold"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Import PDF
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-y border-slate-100">
                <div className="relative max-w-sm w-full group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="Filter partners by name or type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 py-6 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 rounded-2xl transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground mr-2">Sort by:</span>
                    <Button
                        variant={sortBy === 'name' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                            if (sortBy === 'name') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('name'); setSortDirection('asc'); }
                        }}
                        className={`h-9 gap-2 transition-all ${sortBy === 'name' ? 'bg-primary/20 text-primary border-primary/30' : ''}`}
                    >
                        {sortBy === 'name' ? (sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4" />}
                        Name
                    </Button>
                    <Button
                        variant={sortBy === 'newest' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                            if (sortBy === 'newest') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('newest'); setSortDirection('desc'); }
                        }}
                        className={`h-9 gap-2 transition-all ${sortBy === 'newest' ? 'bg-primary/20 text-primary border-primary/30' : ''}`}
                    >
                        {sortBy === 'newest' ? (sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4" />}
                        Date
                    </Button>
                </div>
            </div>

            {filteredPartners.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Building2 className="h-20 w-20 mx-auto text-slate-100 mb-6" />
                    <p className="text-slate-500 font-bold text-lg">
                        {searchQuery ? 'No partners match your criteria' : 'Your consortium is empty'}
                    </p>
                    {!searchQuery && (
                        <Button onClick={handleCreateNew} variant="outline" className="mt-6 border-slate-200 rounded-xl px-8 font-bold">
                            <Plus className="h-5 w-5 mr-2" />
                            Add Your First Partner
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredPartners.map((partner) => (
                        <div key={partner.id} className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-white border border-slate-200 rounded-3xl hover:border-blue-400 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-50 group-hover:bg-blue-600 transition-colors"></div>

                            {/* Logo Box */}
                            <div className="shrink-0 w-20 h-20 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner group-hover:bg-white transition-colors">
                                {partner.logoUrl ? (
                                    <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Building2 className="w-10 h-10 text-slate-200" />
                                )}
                            </div>

                            {/* Info Column */}
                            <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <h3
                                        className="font-black text-xl text-slate-900 group-hover:text-blue-600 transition-colors truncate cursor-pointer tracking-tight"
                                        onClick={() => onEditPartner && onEditPartner(partner.id)}
                                    >
                                        {partner.name}
                                    </h3>
                                    {partner.organizationType && (
                                        <Badge className="bg-blue-50 text-blue-700 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
                                            {partner.organizationType}
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6">
                                    {partner.contactPersonName && (
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                            <User className="w-4 h-4 text-slate-300" />
                                            <span className="truncate">{partner.contactPersonName}</span>
                                        </div>
                                    )}
                                    {partner.country && (
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                            <Globe className="w-4 h-4 text-slate-300" />
                                            <span>{partner.country}</span>
                                        </div>
                                    )}
                                    {(partner.contactPersonEmail || partner.contactEmail) && (
                                        <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                                            <Mail className="w-4 h-4 text-blue-200" />
                                            <span className="truncate">{partner.contactPersonEmail || partner.contactEmail}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-100">
                                <Button
                                    onClick={() => onEditPartner && onEditPartner(partner.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 rounded-xl px-4 py-6 font-bold flex flex-col gap-1 items-center h-auto min-w-[70px] transition-all"
                                >
                                    <Pencil className="h-5 w-5" />
                                    <span className="text-[10px] uppercase">Edit</span>
                                </Button>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(partner.id, partner.name);
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-red-50 hover:text-red-600 text-slate-300 rounded-xl px-4 py-6 font-bold flex flex-col gap-1 items-center h-auto min-w-[70px] transition-all"
                                >
                                    <Trash2 className="h-5 w-5" />
                                    <span className="text-[10px] uppercase">Delete</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                title="Delete Partner"
                description={`Are you sure you want to delete ${partnerToDelete?.name}? This action cannot be undone.`}
            />
        </div>
    );
}