import React, { useState, useEffect, useRef } from 'react';
import {
    Book,
    Upload,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    FileText,
    Search,
    ShieldCheck,
    Cpu
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { functionsUrl, publicAnonKey } from '../utils/supabase/info';

export function GlobalLibraryPage() {
    const [knowledge, setKnowledge] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadKnowledge();
    }, []);

    const loadKnowledge = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${functionsUrl}/knowledge`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'apikey': publicAnonKey
                }
            });
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            const sortedData = (data || []).sort((a: any, b: any) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return timeB - timeA;
            });
            
            setKnowledge(sortedData);
        } catch (error: any) {
            toast.error('Failed to load library knowledge');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        toast.info('Scanning and synchronizing local guidelines...');

        try {
            const response = await fetch(`${functionsUrl}/knowledge/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'apikey': publicAnonKey
                }
            });

            if (!response.ok) throw new Error('Sync endpoint returned an error');
            const result = await response.json();
            if (result.success) {
                toast.success(result.message);
                await loadKnowledge();
            } else {
                toast.error(result.error || 'Sync failed');
            }
        } catch (error: any) {
            console.error('Sync failed:', error);
            toast.error(`Sync failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const toastId = toast.loading(`Uploading and parsing ${file.name}...`);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${functionsUrl}/import-library-pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'apikey': publicAnonKey
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            const result = await response.json();
            
            if (result.success) {
                toast.success(result.message || `Indexed ${result.count} chunks from ${file.name}!`, { id: toastId });
                await loadKnowledge();
            } else {
                toast.error(result.error || 'Failed to index playbook', { id: toastId });
            }
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(`Upload error: ${error.message}`, { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filteredKnowledge = knowledge.filter(k =>
        k.source_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedKnowledge = filteredKnowledge.reduce((acc: any, item: any) => {
        if (!acc[item.source_name]) {
            acc[item.source_name] = [];
        }
        acc[item.source_name].push(item);
        return acc;
    }, {});

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                        <Book className="w-8 h-8 text-blue-600" />
                        Global Knowledge Library
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Deep intelligence from EU Guidelines, Best Practices, and Quality Assessments.
                    </p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileUpload}
                    />
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        {isUploading ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 mr-2" />
                        )}
                        Upload Playbook
                    </Button>
                    <Button
                        variant="outline"
                        onClick={loadKnowledge}
                        disabled={isLoading}
                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                        onClick={handleSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Cpu className="w-4 h-4 mr-2" />
                        )}
                        Sync Intelligence
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 border-blue-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700">
                            <ShieldCheck className="w-4 h-4" />
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">Active</div>
                        <p className="text-xs text-slate-500 mt-1">RAG Intelligence is currently linked to proposal generation.</p>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-50 border-indigo-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-700">
                            <FileText className="w-4 h-4" />
                            Knowledge Base
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{knowledge.length} Chunks</div>
                        <p className="text-xs text-slate-500 mt-1">Extracted from {Object.keys(groupedKnowledge).length} source documents.</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 className="w-4 h-4" />
                            Reliability
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">High</div>
                        <p className="text-xs text-slate-500 mt-1">Using Gemini 2.0 Flash for deep document analysis.</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                <CardHeader className="border-b border-slate-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-slate-900">Library Content</CardTitle>
                            <CardDescription className="text-slate-500">Searchable index of expert criteria and best practices.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search knowledge..."
                                className="pl-9 bg-slate-50 border-slate-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-10">
                            {filteredKnowledge.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                                    <Book className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium">No knowledge indexed yet.</p>
                                    <p className="text-xs text-slate-400 mt-1">Index your Global Library folder to see results here.</p>
                                </div>
                            ) : (
                                Object.entries(groupedKnowledge).map(([sourceName, chunks]: [string, any]) => (
                                    <div key={sourceName} className="space-y-6">
                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                            <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                SOURCE
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800">{sourceName}</h3>
                                            <span className="text-xs text-slate-400 ml-auto font-medium">
                                                {chunks.length} intelligence chunks
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {chunks.map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all group"
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 uppercase font-bold tracking-tight">
                                                            {item.metadata?.type || 'Guideline'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            ID: {item.id.substring(0, 8)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 leading-relaxed">
                                                        {item.content}
                                                    </p>
                                                    {item.metadata?.keywords && item.metadata.keywords.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-5">
                                                            {item.metadata.keywords.map((kw: string, i: number) => (
                                                                <span key={i} className="text-[10px] font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                                                    #{kw}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
