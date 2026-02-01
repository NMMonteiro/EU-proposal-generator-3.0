import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LucideIcon, Sparkles, GraduationCap, Users, Globe, BookOpen, Calculator, Rocket, Search, X } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface FundingScheme {
  id: string;
  name: string;
  description: string;
  logic_mode: 'standard' | 'mobility';
}

interface SchemeSelectorStepProps {
  onSelect: (schemeId: string, logicMode: string) => void;
}

const SCHEME_ICONS: Record<string, LucideIcon> = {
  'KA122': GraduationCap,
  'KA210': Users,
  'KA220': Globe,
  'Horizon': Rocket,
  'Digital Europe': Rocket,
  'Creative Europe': Globe,
  'CERV': Users,
  'default': BookOpen
};

export function SchemeSelectorStep({ onSelect }: SchemeSelectorStepProps) {
  const [schemes, setSchemes] = useState<FundingScheme[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchemes() {
      const { data, error } = await supabase
        .from('funding_schemes')
        .select('id, name, description, logic_mode')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (data) setSchemes(data);
      setLoading(false);
    }
    fetchSchemes();
  }, []);

  const getIcon = (name: string) => {
    for (const key in SCHEME_ICONS) {
      if (name.includes(key)) return SCHEME_ICONS[key];
    }
    return SCHEME_ICONS.default;
  };

  const filteredSchemes = schemes.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium animate-pulse">Initializing Expert Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-8 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-indigo-50 rounded-2xl shadow-sm">
            <Sparkles className="h-10 w-10 text-indigo-600" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
          Start Your Grant Application
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Select a funding scheme to load verified templates, expert rules, and successful examples.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-xl mx-auto relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <Input
          type="text"
          placeholder="Search schemes (e.g. KA122, Horizon, AI...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-14 bg-white border-2 border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl focus:border-indigo-500 transition-all text-lg"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {filteredSchemes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filteredSchemes.map((scheme) => {
            const Icon = getIcon(scheme.name);
            const isMobility = scheme.logic_mode === 'mobility';

            return (
              <Card
                key={scheme.id}
                className="group relative h-full flex flex-col p-8 bg-white border-2 border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100 transition-all cursor-pointer overflow-hidden rounded-3xl"
                onClick={() => onSelect(scheme.id, scheme.logic_mode)}
              >
                <div className="absolute top-0 right-0 p-6">
                  {isMobility ? (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
                      <Calculator className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Mobility Flows</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                      <Rocket className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">WP-Based</span>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="inline-flex p-4 rounded-2xl bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shadow-sm">
                    <Icon className="h-7 w-7" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {scheme.name}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                      {scheme.description || "Expert-guided proposal structure with pre-loaded intelligence."}
                    </p>
                  </div>

                  <div className="mt-auto pt-6 flex items-center text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                    Start Application
                    <Rocket className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600">No schemes found matching "{searchTerm}"</h3>
          <p className="text-slate-400 mt-2">Try searching for a different keyword or acronym.</p>
        </div>
      )}
    </div>
  );
}
