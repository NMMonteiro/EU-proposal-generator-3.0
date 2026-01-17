import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from './ui/select';
import {
    Upload, FileText, Download, Trash2, Edit2, Check, X,
    File, FileSpreadsheet, Image as ImageIcon, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { serverUrl, publicAnonKey } from '../utils/supabase/info';
import type { Annex } from '../types/proposal';

interface AnnexesManagerProps {
    proposalId: string;
    annexes: Annex[];
    onUpdate: () => void;
    readonly?: boolean;
}

const CATEGORY_LABELS = {
    technical: 'Technical',
    financial: 'Financial',
    legal: 'Legal',
    supporting: 'Supporting Documents',
    other: 'Other'
};

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
    pdf: <FileText className="h-5 w-5 text-red-500" />,
    docx: <FileText className="h-5 w-5 text-blue-500" />,
    doc: <FileText className="h-5 w-5 text-blue-500" />,
    xlsx: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
    xls: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
    png: <ImageIcon className="h-5 w-5 text-purple-500" />,
    jpg: <ImageIcon className="h-5 w-5 text-purple-500" />,
    jpeg: <ImageIcon className="h-5 w-5 text-purple-500" />,
};

export function AnnexesManager({ proposalId, annexes, onUpdate, readonly = false }: AnnexesManagerProps) {
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Annex>>({});

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File size must be less than 50MB');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', file.name);
            formData.append('category', 'other');

            const response = await fetch(`${serverUrl}/proposals/${proposalId}/annexes/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            toast.success('Annex uploaded successfully');
            onUpdate();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to upload annex');
        } finally {
            setUploading(false);
            event.target.value = ''; // Reset input
        }
    };

    const handleDelete = async (annexId: string) => {
        if (!confirm('Are you sure you want to delete this annex?')) return;

        try {
            const response = await fetch(`${serverUrl}/annexes/${annexId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
            });

            if (!response.ok) throw new Error('Delete failed');

            toast.success('Annex deleted');
            onUpdate();
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error('Failed to delete annex');
        }
    };

    const startEdit = (annex: Annex) => {
        setEditingId(annex.id!);
        setEditForm({
            title: annex.title,
            description: annex.description,
            category: annex.category,
            isMandatory: annex.isMandatory
        });
    };

    const saveEdit = async () => {
        if (!editingId) return;

        try {
            const response = await fetch(`${serverUrl}/annexes/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify(editForm),
            });

            if (!response.ok) throw new Error('Update failed');

            toast.success('Annex updated');
            setEditingId(null);
            setEditForm({});
            onUpdate();
        } catch (error: any) {
            console.error('Update error:', error);
            toast.error('Failed to update annex');
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const groupedAnnexes = annexes.reduce((acc, annex) => {
        const category = annex.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(annex);
        return acc;
    }, {} as Record<string, Annex[]>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Annexes</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Supporting documents and attachments for this proposal
                    </p>
                </div>
                {!readonly && (
                    <div>
                        <input
                            type="file"
                            id="annex-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <Button
                            onClick={() => document.getElementById('annex-upload')?.click()}
                            disabled={uploading}
                            className="bg-primary hover:bg-primary/90"
                        >
                            <Upload className="h-4 w-4 mr-2 shrink-0" />
                            {uploading ? 'Uploading...' : 'Upload Annex'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Annexes List */}
            {annexes.length === 0 ? (
                <Card className="p-12 text-center">
                    <File className="h-12 w-12 text-slate-300 mx-auto mb-4 shrink-0" />
                    <p className="text-slate-600 font-medium">No annexes yet</p>
                    <p className="text-sm text-slate-500 mt-1">
                        Upload supporting documents to strengthen your proposal
                    </p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedAnnexes).map(([category, categoryAnnexes]) => (
                        <div key={category}>
                            <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
                                <Badge variant="outline" className="text-xs">
                                    {categoryAnnexes.length}
                                </Badge>
                            </h3>
                            <div className="space-y-3">
                                {categoryAnnexes.map((annex) => (
                                    <Card key={annex.id} className="p-4">
                                        {editingId === annex.id ? (
                                            // Edit Mode
                                            <div className="space-y-3">
                                                <Input
                                                    value={editForm.title || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                    placeholder="Title"
                                                />
                                                <Textarea
                                                    value={editForm.description || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                    placeholder="Description (optional)"
                                                    rows={2}
                                                />
                                                <div className="flex items-center gap-3">
                                                    <Select
                                                        value={editForm.category || 'other'}
                                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                                                        className="w-48"
                                                    >
                                                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                                            <option key={key} value={key}>{label}</option>
                                                        ))}
                                                    </Select>
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.isMandatory || false}
                                                            onChange={(e) => setEditForm({ ...editForm, isMandatory: e.target.checked })}
                                                            className="rounded"
                                                        />
                                                        Mandatory
                                                    </label>
                                                    <div className="flex-1" />
                                                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                                        <X className="h-4 w-4 shrink-0" />
                                                    </Button>
                                                    <Button size="sm" onClick={saveEdit}>
                                                        <Check className="h-4 w-4 shrink-0" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1">
                                                    {FILE_TYPE_ICONS[annex.fileType] || <File className="h-5 w-5 text-slate-400" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-2">
                                                        <h4 className="font-semibold text-slate-900 truncate">
                                                            {annex.title}
                                                        </h4>
                                                        {annex.isMandatory && (
                                                            <Badge variant="destructive" className="text-xs shrink-0">
                                                                <AlertCircle className="h-3 w-3 mr-1 shrink-0" />
                                                                Required
                                                            </Badge>
                                                        )}
                                                        <Badge variant="outline" className="text-xs shrink-0">
                                                            Annex {annex.annexNumber}
                                                        </Badge>
                                                    </div>
                                                    {annex.description && (
                                                        <p className="text-sm text-slate-600 mt-1">{annex.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                        <span>{annex.fileName}</span>
                                                        <span>{formatFileSize(annex.fileSize)}</span>
                                                        <span className="uppercase">{annex.fileType}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(annex.fileUrl, '_blank')}
                                                    >
                                                        <Download className="h-4 w-4 shrink-0" />
                                                    </Button>
                                                    {!readonly && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => startEdit(annex)}
                                                            >
                                                                <Edit2 className="h-4 w-4 shrink-0" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDelete(annex.id!)}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4 shrink-0" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
