import React, { useState } from 'react'
import { serverUrl } from '../utils/supabase/info'
import { Upload, Loader2, Sparkles, Check, X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ParsedTemplate, FundingSchemeSection } from '../types/funding-scheme'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/primitives'

export function FundingSchemeTemplateParser() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [parsing, setParsing] = useState(false)
    const [extractedTemplate, setExtractedTemplate] = useState<ParsedTemplate | null>(null)
    const [editingSections, setEditingSections] = useState<FundingSchemeSection[]>([])
    const [fundingSchemeName, setFundingSchemeName] = useState('')
    const [saving, setSaving] = useState(false)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            // Validate file type
            if (!selectedFile.name.match(/\.(pdf)$/i)) {
                toast.error('Please upload a PDF file')
                return
            }

            // Validate file size (10MB max)
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error('File size must be less than 10MB')
                return
            }

            setFile(selectedFile)
            setFundingSchemeName(selectedFile.name.replace(/\.(pdf)$/i, ''))
        }
    }

    const handleUploadAndParse = async () => {
        if (!file) return

        try {
            setUploading(true)
            setParsing(true)
            toast.success('File uploaded! AI is analyzing...')

            // Call rawBody Express REST API Endpoint
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`${serverUrl}/import-scheme-pdf`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || `Server returned status ${response.status}`)
            }

            const parseResult = await response.json()

            if (!parseResult.success) throw new Error(parseResult.error)

            setExtractedTemplate(parseResult.template)
            setEditingSections(parseResult.template.sections)
            setFundingSchemeName(parseResult.template.fundingScheme)

            toast.success('Template extracted! Please review and edit.')

        } catch (error: any) {
            console.error('Error:', error)
            toast.error(`Failed to parse template: ${error.message}`)
        } finally {
            setUploading(false)
            setParsing(false)
        }
    }

    const handleSaveTemplate = async () => {
        if (!extractedTemplate) return

        if (!fundingSchemeName.trim()) {
            toast.error('Please provide a funding scheme name')
            return
        }

        if (editingSections.length === 0) {
            toast.error('At least one section is required')
            return
        }

        try {
            setSaving(true)

            const response = await fetch(`${serverUrl}/funding-schemes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `${fundingSchemeName} (Imported ${new Date().toLocaleTimeString()})`,
                    description: `Imported from ${file?.name || 'uploaded document'}`,
                    template_json: {
                        schemaVersion: '1.0',
                        sections: editingSections,
                        metadata: extractedTemplate.metadata || {}
                    },
                    is_default: false,
                    is_active: true
                })
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Failed to save funding scheme')
            }

            toast.success('Funding scheme template saved!')

            // Reset form
            setFile(null)
            setExtractedTemplate(null)
            setEditingSections([])
            setFundingSchemeName('')

        } catch (error: any) {
            console.error('Error saving:', error)
            toast.error(`Failed to save template: ${error.message}`)
        } finally {
            setSaving(false)
        }
    }

    const updateSection = (index: number, updates: Partial<FundingSchemeSection>) => {
        const updated = [...editingSections]
        updated[index] = { ...updated[index], ...updates }
        setEditingSections(updated)
    }

    const removeSection = (index: number) => {
        const updated = editingSections.filter((_, i) => i !== index)
        updated.forEach((section, i) => {
            section.order = i + 1
        })
        setEditingSections(updated)
    }

    const addSection = () => {
        const newSection: FundingSchemeSection = {
            key: `section_${editingSections.length + 1}`,
            label: `New Section ${editingSections.length + 1}`,
            mandatory: false,
            order: editingSections.length + 1,
            charLimit: null,
            wordLimit: null
        }
        setEditingSections([...editingSections, newSection])
    }

    return (
        <div className="space-y-6">
            {!extractedTemplate ? (
                // Upload State
                <Card className="border-dashed border-2 bg-card border-border">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl font-bold">Import Application Template</CardTitle>
                        <CardDescription>
                            Upload a PDF file to automatically extract the proposal structure.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                        <div className="p-4 rounded-full bg-muted/50">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                        </div>

                        <div className="text-center space-y-2">
                            <Label htmlFor="file-upload" className="cursor-pointer">
                                <span className="text-primary font-semibold hover:underline">Click to upload</span>
                                <span className="text-muted-foreground"> or drag and drop</span>
                            </Label>
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={uploading || parsing}
                            />
                            <p className="text-xs text-muted-foreground">PDF up to 10MB</p>
                        </div>

                        {file && (
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-md w-full max-w-sm mt-4 border border-border">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => setFile(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {file && (
                            <div className="w-full max-w-sm pt-4">
                                <Label className="text-xs mb-1.5 block text-foreground">Funding Scheme Name (Optional)</Label>
                                <Input
                                    value={fundingSchemeName}
                                    onChange={(e) => setFundingSchemeName(e.target.value)}
                                    placeholder="e.g. Horizon Europe Call 2025"
                                    className="mb-4"
                                />
                                <Button
                                    className="w-full bg-primary text-white hover:bg-primary/95"
                                    onClick={handleUploadAndParse}
                                    disabled={uploading || parsing}
                                >
                                    {parsing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Parsing Template...
                                        </>
                                    ) : uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Extract Structure
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                // Review & Edit State
                <div className="space-y-6">
                    <Card className="border border-border bg-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold">Review extracted template</CardTitle>
                                <CardDescription>
                                    Verify the sections and limits before saving.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => {
                                    setExtractedTemplate(null)
                                    setEditingSections([])
                                    setFile(null)
                                    setFundingSchemeName('')
                                }}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveTemplate} className="bg-primary text-white hover:bg-primary/95" disabled={saving}>
                                    {saving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="mr-2 h-4 w-4" />
                                    )}
                                    Save Template
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid gap-3">
                                <Label className="text-foreground">Funding Scheme Name</Label>
                                <Input
                                    value={fundingSchemeName}
                                    onChange={(e) => setFundingSchemeName(e.target.value)}
                                    placeholder="e.g. Horizon Europe 2024"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        Sections ({editingSections.length})
                                    </h3>
                                    <Button size="sm" variant="outline" onClick={addSection}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Section
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {editingSections.map((section, idx) => (
                                        <Card key={idx} className="bg-card hover:border-primary/50 transition-colors border border-border">
                                            <CardContent className="p-4 space-y-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex-1 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-foreground">Section Label <span className="text-red-500">*</span></Label>
                                                                <Input
                                                                    value={section.label}
                                                                    onChange={(e) => updateSection(idx, { label: e.target.value })}
                                                                    placeholder="e.g. 1. Excellence"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-foreground">Key (snake_case) <span className="text-red-500">*</span></Label>
                                                                <Input
                                                                    value={section.key}
                                                                    onChange={(e) => updateSection(idx, { key: e.target.value })}
                                                                    className="font-mono text-xs"
                                                                    placeholder="excellence"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-foreground">Description / Guidelines (Verbatim questions)</Label>
                                                                <Textarea
                                                                    value={section.description || ''}
                                                                    onChange={(e) => updateSection(idx, { description: e.target.value })}
                                                                    rows={3}
                                                                    className="resize-none"
                                                                    placeholder="The EXACT questions from the guidelines..."
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-foreground">Generation AI Prompt (Custom instructions)</Label>
                                                                <Textarea
                                                                    value={section.aiPrompt || ''}
                                                                    onChange={(e) => updateSection(idx, { aiPrompt: e.target.value })}
                                                                    rows={3}
                                                                    className="resize-none font-mono text-xs"
                                                                    placeholder="Draft the section. Specifically address..."
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-4 pt-2">
                                                            <div className="flex items-center gap-2">
                                                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Char Limit:</Label>
                                                                <Input
                                                                    type="number"
                                                                    className="w-24 h-8"
                                                                    value={section.charLimit || ''}
                                                                    onChange={(e) => updateSection(idx, { charLimit: e.target.value ? parseInt(e.target.value) : null })}
                                                                    placeholder="None"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Word Limit:</Label>
                                                                <Input
                                                                    type="number"
                                                                    className="w-24 h-8"
                                                                    value={section.wordLimit || ''}
                                                                    onChange={(e) => updateSection(idx, { wordLimit: e.target.value ? parseInt(e.target.value) : null })}
                                                                    placeholder="None"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-auto">
                                                                <div className="flex items-center space-x-2 border border-border rounded-md px-3 py-1 bg-background">
                                                                    <Checkbox
                                                                        id={`mandatory-${idx}`}
                                                                        checked={section.mandatory}
                                                                        onCheckedChange={(checked) => updateSection(idx, { mandatory: !!checked })}
                                                                    />
                                                                    <Label htmlFor={`mandatory-${idx}`} className="cursor-pointer text-xs font-medium text-foreground">Required</Label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeSection(idx)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
