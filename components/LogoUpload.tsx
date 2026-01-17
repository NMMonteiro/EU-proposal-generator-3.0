import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Upload, Link2, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LogoUploadProps {
    currentLogoUrl?: string;
    onLogoChange: (url: string) => void;
    label?: string;
}

export function LogoUpload({ currentLogoUrl, onLogoChange, label = 'Logo' }: LogoUploadProps) {
    const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('upload');
    const [uploading, setUploading] = useState(false);
    const [urlInput, setUrlInput] = useState(currentLogoUrl || '');
    const [previewUrl, setPreviewUrl] = useState(currentLogoUrl || '');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please upload a PNG, JPG, SVG, or WebP image');
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo file size must be less than 2MB');
            return;
        }

        try {
            setUploading(true);

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            // Try to upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('partner-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                // If bucket doesn't exist, provide helpful error message
                if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
                    console.error('Storage bucket error:', uploadError);
                    toast.error('Storage bucket not configured. Please use URL method instead.');
                    setUploadMethod('url');
                    return;
                }
                throw uploadError;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('partner-assets')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;
            setPreviewUrl(publicUrl);
            onLogoChange(publicUrl);
            toast.success('Logo uploaded successfully!');

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Failed to upload logo: ${error.message || 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleUrlSubmit = () => {
        if (!urlInput.trim()) {
            toast.error('Please enter a valid URL');
            return;
        }

        // Basic URL validation
        try {
            new URL(urlInput);
            setPreviewUrl(urlInput);
            onLogoChange(urlInput);
            toast.success('Logo URL set successfully!');
        } catch (error) {
            toast.error('Please enter a valid URL');
        }
    };

    const handleRemoveLogo = () => {
        setPreviewUrl('');
        setUrlInput('');
        onLogoChange('');
        toast.success('Logo removed');
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
                {label}
            </label>

            {/* Method Selector */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => setUploadMethod('upload')}
                    className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-2 ${uploadMethod === 'upload'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Upload className="h-3.5 w-3.5" />
                    Upload File
                </button>
                <button
                    type="button"
                    onClick={() => setUploadMethod('url')}
                    className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-2 ${uploadMethod === 'url'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Link2 className="h-3.5 w-3.5" />
                    Enter URL
                </button>
            </div>

            {/* Upload/URL Input */}
            {uploadMethod === 'upload' ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <label
                            htmlFor="logo-upload"
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${uploading
                                ? 'border-muted bg-muted/50 cursor-not-allowed'
                                : 'border-border hover:border-primary hover:bg-muted/50'
                                }`}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                                    <span className="text-sm text-muted-foreground">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Click to upload or drag and drop
                                    </span>
                                </>
                            )}
                            <input
                                id="logo-upload"
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        PNG, JPG, SVG, or WebP (max 2MB)
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="flex-1 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleUrlSubmit();
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleUrlSubmit}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm"
                        >
                            Set URL
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Enter a direct link to an image file
                    </p>
                </div>
            )}

            {/* Preview */}
            {previewUrl && (
                <div className="relative w-fit">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                        <div className="w-16 h-16 flex items-center justify-center bg-background rounded-md overflow-hidden">
                            <img
                                src={previewUrl}
                                alt="Logo preview"
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                    // Fallback if image fails to load
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    toast.error('Failed to load logo image');
                                }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                Logo Preview
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {previewUrl}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition"
                            title="Remove logo"
                        >
                            <X className="h-4 w-4 text-destructive" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
