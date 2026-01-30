import React, { useState } from 'react';
import { Search, Sparkles, Building2, Globe, ArrowRight, Library, Users, Target, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export function PartnerSearchPage() {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const categories = [
        { id: 'univ', label: 'Universities', icon: Library, color: 'blue' },
        { id: 'ngo', label: 'NGOs', icon: Users, color: 'emerald' },
        { id: 'sme', label: 'SMEs', icon: Building2, color: 'amber' },
        { id: 'gov', label: 'Public Bodies', icon: ShieldCheck, color: 'indigo' },
    ];

    const mockResults = [
        { name: 'University of Athens', country: 'Greece', expertise: ['Renewable Energy', 'AI', 'Ethics'], type: 'Higher Education' },
        { name: 'Climate Innovators NGO', country: 'Spain', expertise: ['Environmental Policy', 'Youth Empowerment'], type: 'NGO' },
        { name: 'TechSolutions SME', country: 'Portugal', expertise: ['Web Development', 'VR/AR', 'Blockchain'], type: 'SME' },
        { name: 'National Health Board', country: 'Italy', expertise: ['Public Health', 'Data Analytics'], type: 'Public Body' },
        { name: 'Sofia Polytechnic', country: 'Bulgaria', expertise: ['Robotics', 'STEM Education'], type: 'Higher Education' },
        { name: 'EcoVanguard Research', country: 'Netherlands', expertise: ['Circular Economy', 'Sustainable Design'], type: 'Research Center' },
    ];

    const handleSearch = () => {
        if (!query.trim()) return;
        setIsSearching(true);
        setResults([]);

        setTimeout(() => {
            const filtered = mockResults.filter(r =>
                r.name.toLowerCase().includes(query.toLowerCase()) ||
                r.expertise.some(e => e.toLowerCase().includes(query.toLowerCase())) ||
                r.country.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered.length > 0 ? filtered : mockResults.slice(0, 3));
            setIsSearching(false);
        }, 800);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-16 text-white shadow-2xl shadow-slate-200">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-600/20 to-transparent"></div>
                <div className="relative z-10 max-w-2xl space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        AI-Powered Matching
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                        Find the perfect <span className="text-blue-500">Consortium Partner</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        Access our global network of research institutions, NGOs, and innovation leaders. Search by expertise, country, or past project performance.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Search (e.g., 'Renewable Energy', 'Greece')..."
                                className="pl-12 py-7 bg-white/10 border-white/10 text-white placeholder:text-slate-500 rounded-2xl focus:bg-white/20 focus:ring-blue-500 transition-all text-lg"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-7 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02]"
                            onClick={handleSearch}
                            disabled={isSearching}
                        >
                            {isSearching ? 'Analyzing...' : 'Discover Partners'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((cat) => (
                    <Card key={cat.id} className="group cursor-pointer hover:border-blue-200 transition-all hover:shadow-xl hover:shadow-slate-100 rounded-3xl overflow-hidden border-slate-100">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={`p-3 rounded-2xl bg-${cat.color}-50 text-${cat.color}-600 group-hover:scale-110 transition-transform`}>
                                <cat.icon className="w-6 h-6" />
                            </div>
                            <div className="font-bold text-slate-800">{cat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Results Section */}
            {results.length > 0 ? (
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Matching Results ({results.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {results.map((res, i) => (
                            <Card key={i} className="rounded-[2.5rem] border-slate-100 hover:shadow-2xl hover:shadow-slate-200 transition-all group overflow-hidden bg-white">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <Badge className="bg-slate-50 text-slate-500 border-none font-bold text-[10px] uppercase">{res.type}</Badge>
                                    </div>
                                    <CardTitle className="text-xl font-bold mt-4 line-clamp-1">{res.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-1.5 font-medium mt-1">
                                        <Globe className="w-4 h-4 text-blue-500" /> {res.country}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-0 space-y-6">
                                    <div className="flex flex-wrap gap-1.5">
                                        {res.expertise.map((exp: string, idx: number) => (
                                            <Badge key={idx} variant="outline" className="text-[10px] font-bold border-slate-100 bg-slate-50/50">#{exp.toUpperCase()}</Badge>
                                        ))}
                                    </div>
                                    <Button className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-2xl py-6 transition-all shadow-lg hover:shadow-blue-200">
                                        Request Partnership
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : query && !isSearching ? (
                <div className="py-24 text-center space-y-6 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                    <Target className="w-16 h-16 text-slate-200 mx-auto" />
                    <div className="max-w-md mx-auto">
                        <h3 className="text-xl font-bold text-slate-800">No exact matches found</h3>
                        <p className="text-slate-500 text-sm mt-2 font-medium">
                            Try searching for broader terms like "innovation" or "education".
                        </p>
                    </div>
                </div>
            ) : (
                <div className="py-24 text-center space-y-6 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                    <Users className="w-16 h-16 text-slate-200 mx-auto" />
                    <div className="max-w-md mx-auto">
                        <h3 className="text-xl font-bold text-slate-800">Ready to Discover?</h3>
                        <p className="text-slate-500 text-sm mt-2 font-medium">
                            Search our database of over 5,000+ verified partner organizations across the EU.
                        </p>
                    </div>
                    <div className="flex justify-center gap-4">
                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 px-5 py-2 rounded-full font-bold">Horizon Europe</Badge>
                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 px-5 py-2 rounded-full font-bold">Erasmus+</Badge>
                    </div>
                </div>
            )}

            {/* Featured Section */}
            <div className="space-y-8 pt-12 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Top Innovation Clusters</h2>
                        <p className="text-slate-500 text-sm font-medium mt-1">High-performing partners in recent research calls.</p>
                    </div>
                    <Button variant="ghost" className="text-blue-600 font-bold hover:bg-blue-50">
                        View Network <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="rounded-3xl border-slate-100 hover:shadow-2xl hover:shadow-slate-200 transition-all group overflow-hidden bg-white">
                            <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                        <Library className="w-7 h-7 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-bold">European Research Hub {i}</CardTitle>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 font-bold uppercase tracking-wider">
                                            <Globe className="h-3 w-3 text-blue-500" /> Brussels, BE
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-6">
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                    Leading the way in digital transformation and sustainable infrastructure development.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge className="bg-slate-50 text-slate-600 border-none font-bold text-[10px]">#DIGITAL</Badge>
                                    <Badge className="bg-slate-50 text-slate-600 border-none font-bold text-[10px]">#GREEN</Badge>
                                </div>
                                <Button className="w-full bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 border-none font-bold rounded-xl h-12 transition-all">
                                    View Full Portfolio
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}