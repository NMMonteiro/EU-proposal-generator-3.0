import React, { useState, useEffect } from 'react';
import {
    Settings,
    Building2,
    Save,
    Globe,
    Mail,
    Phone,
    Hash,
    MapPin,
    Info,
    ShieldCheck,
    Bell,
    Lock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

export function SettingsPage() {
    const [orgData, setOrgData] = useState({
        name: 'My Organization',
        acronym: 'MYORG',
        pic: '999999999',
        oid: 'E12345678',
        country: 'Portugal',
        city: 'Lisbon',
        website: 'https://example.com',
        email: 'info@example.com'
    });

    useEffect(() => {
        const saved = localStorage.getItem('org_settings');
        if (saved) {
            try {
                setOrgData(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('org_settings', JSON.stringify(orgData));
        toast.success('Organization settings saved! These will be used for all new proposals.');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setOrgData(prev => ({ ...prev, [id]: value }));
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Settings className="w-10 h-10 text-blue-600" />
                        Settings
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium text-lg">Manage your workspace and default organizational identity.</p>
                </div>
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 font-bold shadow-xl shadow-blue-200 transition-all hover:scale-[1.02]"
                    onClick={handleSave}
                >
                    <Save className="w-5 h-5 mr-2" />
                    Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Navigation Sidebar */}
                <div className="space-y-2">
                    <button className="w-full flex items-center gap-3 px-6 py-4 bg-blue-50 text-blue-700 rounded-3xl font-bold transition-all text-left">
                        <Building2 className="w-5 h-5" />
                        Organization
                    </button>
                    <button className="w-full flex items-center gap-3 px-6 py-4 text-slate-500 hover:bg-slate-50 rounded-3xl font-bold transition-all text-left">
                        <ShieldCheck className="w-5 h-5" />
                        Credentials
                    </button>
                    <button className="w-full flex items-center gap-3 px-6 py-4 text-slate-500 hover:bg-slate-50 rounded-3xl font-bold transition-all text-left">
                        <Bell className="w-5 h-5" />
                        Notifications
                    </button>
                    <button className="w-full flex items-center gap-3 px-6 py-4 text-slate-500 hover:bg-slate-50 rounded-3xl font-bold transition-all text-left">
                        <Lock className="w-5 h-5" />
                        Security
                    </button>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Info Alert */}
                    <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white flex items-start gap-6 shadow-2xl shadow-blue-100">
                        <div className="p-4 rounded-3xl bg-white/20">
                            <Info className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-black text-xl">Pro-Tip: Proposal Automation</h3>
                            <p className="text-blue-50 font-medium leading-relaxed">
                                The data entered here (PIC, OID, Country) is automatically injected into every proposal narrative and financial plan, saving you hours of manual entry in Erasmus+ and Horizon Europe forms.
                            </p>
                        </div>
                    </div>

                    <Card className="rounded-[3rem] border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-2xl font-black">Legal Identity</CardTitle>
                            <CardDescription className="text-base font-medium">As registered in the EU Participation Portal.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-6 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-400" /> Organization Name
                                    </label>
                                    <Input id="name" value={orgData.name} onChange={handleChange} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-slate-400" /> Acronym
                                    </label>
                                    <Input id="acronym" value={orgData.acronym} onChange={handleChange} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-slate-400" /> PIC (EU Portal ID)
                                    </label>
                                    <Input id="pic" value={orgData.pic} onChange={handleChange} placeholder="9-digit number" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-slate-400" /> OID (Erasmus+ ID)
                                    </label>
                                    <Input id="oid" value={orgData.oid} onChange={handleChange} placeholder="E-followed by 8 digits" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[3rem] border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-2xl font-black">Location & Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-6 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-slate-400" /> Country
                                    </label>
                                    <Input id="country" value={orgData.country} onChange={handleChange} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400" /> City
                                    </label>
                                    <Input id="city" value={orgData.city} onChange={handleChange} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-slate-400" /> Institutional Email
                                    </label>
                                    <Input id="email" value={orgData.email} onChange={handleChange} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-slate-400" /> Website
                                    </label>
                                    <Input id="website" value={orgData.website} onChange={handleChange} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}