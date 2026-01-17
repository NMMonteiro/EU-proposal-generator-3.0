import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, Euro, Link as LinkIcon } from 'lucide-react';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: any;
    onSave: (newSettings: any) => void;
}

export function SettingsDialog({ isOpen, onClose, currentSettings, onSave }: SettingsDialogProps) {
    const [settings, setSettings] = useState(currentSettings);

    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings, isOpen]);

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Project Settings & Identity
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                            <span className="text-primary"><CalendarDays size={16} /></span>
                            Project Start Date
                        </label>
                        <Input
                            type="date"
                            value={settings.startDate || ''}
                            onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                        />
                        <p className="text-[10px] text-muted-foreground">Adjusting this will automatically recalculate the work plan timeline.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                            <span className="text-primary"><Euro size={16} /></span>
                            Default Currency
                        </label>
                        <Input
                            value={settings.currency || 'EUR'}
                            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                            placeholder="e.g. EUR, USD"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                            <span className="text-primary"><LinkIcon size={16} /></span>
                            Source Reference URL
                        </label>
                        <Input
                            value={settings.sourceUrl || ''}
                            onChange={(e) => setSettings({ ...settings, sourceUrl: e.target.value })}
                            placeholder="Link to the call or project brief"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
