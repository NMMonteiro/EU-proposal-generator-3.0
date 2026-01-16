import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { FundingScheme, FundingSchemeTemplate } from '../types/funding-scheme';
import { TemplateEditor } from './TemplateEditor';
import { LogoUpload } from './LogoUpload';
import {
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    FileText,
    CheckCircle,
    XCircle,
    Star,
    Eye,
    EyeOff,
    Upload,
    Sparkles,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function FundingSchemeCRUD() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [schemes, setSchemes] = useState<FundingScheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingScheme, setEditingScheme] = useState<FundingScheme | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [enrichingId, setEnrichingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<FundingScheme>>({
        name: '',
        description: '',
        logo_url: '',
        is_default: false,
        is_active: true,
        template_json: {
            schemaVersion: '1.0',
            sections: [],
            metadata: {}
        }
    });

    // Filtered schemes
    const filteredSchemes = schemes.filter(scheme => {
        const matchesSearch = scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (scheme.description && scheme.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'all'
            ? true
            : statusFilter === 'active'
                ? scheme.is_active
                : !scheme.is_active;

        return matchesSearch && matchesStatus;
    });


    // Load funding schemes
    useEffect(() => {
        loadSchemes();
    }, []);

    const loadSchemes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('funding_schemes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSchemes(data || []);
        } catch (error) {
            console.error('Error loading schemes:', error);
            toast.error('Failed to load funding schemes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setIsCreating(true);
        setEditingScheme(null);
        setFormData({
            name: '',
            description: '',
            logo_url: '',
            is_default: false,
            is_active: true,
            template_json: {
                schemaVersion: '1.0',
                sections: [],
                metadata: {}
            }
        });
    };

    const handleEdit = (scheme: FundingScheme) => {
        setEditingScheme(scheme);
        setIsCreating(false);
        setFormData({
            name: scheme.name,
            description: scheme.description || '',
            logo_url: scheme.logo_url || '',
            is_default: scheme.is_default,
            is_active: scheme.is_active,
            template_json: scheme.template_json
        });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingScheme(null);
        setFormData({
            name: '',
            description: '',
            logo_url: '',
            is_default: false,
            is_active: true,
            template_json: {
                schemaVersion: '1.0',
                sections: [],
                metadata: {}
            }
        });
    };

    const handleSave = async () => {
        try {
            if (!formData.name?.trim()) {
                toast.error('Scheme name is required');
                return;
            }

            if (!formData.template_json || formData.template_json.sections.length === 0) {
                toast.error('Template must have at least one section');
                return;
            }

            if (editingScheme) {
                // Update existing scheme
                const { error } = await supabase
                    .from('funding_schemes')
                    .update({
                        name: formData.name,
                        description: formData.description,
                        logo_url: formData.logo_url,
                        is_default: formData.is_default,
                        is_active: formData.is_active,
                        template_json: formData.template_json,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingScheme.id);

                if (error) throw error;
                toast.success('Funding scheme updated successfully');
            } else {
                // Create new scheme
                const { error } = await supabase
                    .from('funding_schemes')
                    .insert({
                        name: formData.name,
                        description: formData.description,
                        logo_url: formData.logo_url,
                        is_default: formData.is_default,
                        is_active: formData.is_active,
                        template_json: formData.template_json
                    });

                if (error) throw error;
                toast.success('Funding scheme created successfully');
            }

            handleCancel();
            loadSchemes();
        } catch (error: any) {
            console.error('Error saving scheme:', error);
            toast.error(error.message || 'Failed to save funding scheme');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('funding_schemes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Funding scheme deleted successfully');
            loadSchemes();
        } catch (error: any) {
            console.error('Error deleting scheme:', error);
            toast.error(error.message || 'Failed to delete funding scheme');
        }
    };

    const handleToggleDefault = async (scheme: FundingScheme) => {
        try {
            // If setting as default, unset all others first
            if (!scheme.is_default) {
                await supabase
                    .from('funding_schemes')
                    .update({ is_default: false })
                    .neq('id', scheme.id);
            }

            const { error } = await supabase
                .from('funding_schemes')
                .update({ is_default: !scheme.is_default })
                .eq('id', scheme.id);

            if (error) throw error;
            toast.success(scheme.is_default ? 'Removed as default' : 'Set as default scheme');
            loadSchemes();
        } catch (error: any) {
            console.error('Error toggling default:', error);
            toast.error(error.message || 'Failed to update default status');
        }
    };

    const handleToggleActive = async (scheme: FundingScheme) => {
        try {
            const { error } = await supabase
                .from('funding_schemes')
                .update({ is_active: !scheme.is_active })
                .eq('id', scheme.id);

            if (error) throw error;
            toast.success(scheme.is_active ? 'Scheme deactivated' : 'Scheme activated');
            loadSchemes();
        } catch (error: any) {
            console.error('Error toggling active:', error);
            toast.error(error.message || 'Failed to update active status');
        }
    };

    const handleEnrich = async (schemeId: string) => {
        try {
            setEnrichingId(schemeId);
            const { serverUrl, publicAnonKey } = await import('../utils/supabase/info');
            const response = await fetch(`${serverUrl}/enrich-scheme`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({ schemeId }),
            });

            if (!response.ok) throw new Error('Enrichment failed');

            const result = await response.json();
            if (result.success) {
                toast.success('Scheme enriched with Global Library intelligence!');
                loadSchemes();
            } else {
                toast.info(result.message || 'Enrichment completed with no updates.');
            }
        } catch (error: any) {
            console.error('Error enriching scheme:', error);
            toast.error(error.message || 'Failed to enrich funding scheme');
        } finally {
            setEnrichingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading funding schemes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Funding Schemes</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage funding scheme templates and configurations
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                >
                    <Plus className="h-4 w-4" />
                    Create New Scheme
                </button>
            </div>

            {/* Create/Edit Form */}
            {(isCreating || editingScheme) && (
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-foreground">
                            {editingScheme ? 'Edit Funding Scheme' : 'Create New Funding Scheme'}
                        </h4>
                        <button
                            onClick={handleCancel}
                            className="p-2 hover:bg-muted rounded-lg transition"
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Scheme Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Horizon Europe RIA"
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Logo Upload */}
                        <LogoUpload
                            currentLogoUrl={formData.logo_url}
                            onLogoChange={(url) => setFormData({ ...formData, logo_url: url })}
                            label="Funding Scheme Logo"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of this funding scheme..."
                            rows={3}
                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                    </div>

                    {/* Template Editor */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                            Template Sections *
                        </label>
                        <TemplateEditor
                            template={formData.template_json!}
                            onChange={(template) => setFormData({ ...formData, template_json: template })}
                        />
                    </div>

                    {/* Flags */}
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">Set as default scheme</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">Active (visible to users)</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                        >
                            <Save className="h-4 w-4" />
                            {editingScheme ? 'Update Scheme' : 'Create Scheme'}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}


            {/* Filters */}
            {!isCreating && !editingScheme && (
                <div className="flex gap-4 p-4 bg-card border border-border rounded-lg">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search schemes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Schemes List */}
            <div className="grid grid-cols-1 gap-4">
                {filteredSchemes.length === 0 ? (
                    <div className="text-center py-12 bg-card border border-border rounded-lg">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            {schemes.length === 0 ? 'No funding schemes yet' : 'No matches found'}
                        </p>
                        {schemes.length === 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Create your first scheme to get started
                            </p>
                        )}
                    </div>
                ) : (
                    filteredSchemes.map((scheme) => (
                        <div
                            key={scheme.id}
                            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {scheme.logo_url && (
                                            <img
                                                src={scheme.logo_url}
                                                alt={scheme.name}
                                                className="h-8 w-8 object-contain"
                                            />
                                        )}
                                        <h4 className="text-lg font-semibold text-foreground">
                                            {scheme.name}
                                        </h4>
                                        <div className="flex gap-2">
                                            {scheme.is_default && (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded-full">
                                                    <Star className="h-3 w-3" />
                                                    Default
                                                </span>
                                            )}
                                            {scheme.is_active ? (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-full">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-full">
                                                    <XCircle className="h-3 w-3" />
                                                    Inactive
                                                </span>
                                            )}
                                            {scheme.expert_playbook && (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100 animate-in fade-in zoom-in duration-500">
                                                    <Sparkles className="h-3 w-3 fill-blue-600/20" />
                                                    AI Enriched
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {scheme.description && (
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {scheme.description}
                                        </p>
                                    )}
                                    <div className="flex gap-4 text-xs text-muted-foreground">
                                        <span>
                                            {scheme.template_json.sections.length} section{scheme.template_json.sections.length !== 1 ? 's' : ''}
                                        </span>
                                        <span>•</span>
                                        <span>
                                            Created {new Date(scheme.created_at).toLocaleDateString()}
                                        </span>
                                        {scheme.updated_at !== scheme.created_at && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    Updated {new Date(scheme.updated_at).toLocaleDateString()}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEnrich(scheme.id)}
                                        disabled={enrichingId === scheme.id}
                                        className={`p-2 rounded-lg transition ${scheme.expert_playbook ? 'bg-blue-50 text-blue-600' : 'hover:bg-muted text-muted-foreground'}`}
                                        title={scheme.expert_playbook ? 'Re-enrich with AI' : 'Enrich with Global Library Knowledge'}
                                    >
                                        {enrichingId === scheme.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Sparkles className={`h-4 w-4 ${scheme.expert_playbook ? 'fill-blue-600' : ''}`} />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleToggleDefault(scheme)}
                                        className="p-2 hover:bg-muted rounded-lg transition"
                                        title={scheme.is_default ? 'Remove as default' : 'Set as default'}
                                    >
                                        <Star className={`h-4 w-4 ${scheme.is_default ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(scheme)}
                                        className="p-2 hover:bg-muted rounded-lg transition"
                                        title={scheme.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        {scheme.is_active ? (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(scheme)}
                                        className="p-2 hover:bg-muted rounded-lg transition"
                                        title="Edit"
                                    >
                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(scheme.id, scheme.name)}
                                        className="p-2 hover:bg-destructive/10 rounded-lg transition"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
