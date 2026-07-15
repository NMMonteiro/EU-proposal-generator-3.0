import React from 'react';
import { Brain, Sparkles, CheckCircle2, AlertCircle, Info, ChevronRight } from 'lucide-react';

interface ExpertIntelligenceViewProps {
    data: any;
    title?: string;
    source?: string;
}

export function ExpertIntelligenceView({ data, title, source }: ExpertIntelligenceViewProps) {
    if (!data) return null;

    // Update the renderValue to use nicer cards
    const renderValue = (val: any, depth = 0): React.ReactNode => {
        if (val === null || val === undefined) return null;

        if (Array.isArray(val)) {
            if (val.length === 0) return <p className="text-xs text-slate-400 italic">No directives found.</p>;

            return (
                <ul className="space-y-4 mt-3">
                    {val.map((item, i) => (
                        <li key={i} className="flex items-start gap-4 group/item">
                            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mt-0.5 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all duration-500 shadow-sm">
                                <span className="text-[10px] font-black">{i + 1}</span>
                            </div>
                            <div className="flex-1 text-[13px] text-slate-600 leading-relaxed font-medium">
                                {typeof item === 'object' ? renderValue(item, depth + 1) : item}
                            </div>
                        </li>
                    ))}
                </ul>
            );
        }

        if (typeof val === 'object') {
            const keys = Object.keys(val);
            if (keys.length === 0) return <p className="text-xs text-slate-400 italic">No detailed guidelines extracted yet.</p>;

            const isPhase = val.activities || val.deliverables || val.description;

            if (isPhase) {
                return (
                    <div className="space-y-5 bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-xl shadow-slate-200/20">
                        {val.description && (
                            <p className="text-sm text-slate-600 italic border-l-4 border-indigo-500/30 pl-5 py-2 leading-relaxed bg-indigo-50/30 rounded-r-xl">
                                {val.description}
                            </p>
                        )}

                        {(val.activities && Array.isArray(val.activities)) && (
                            <div className="space-y-3">
                                <h6 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                                    <Sparkles className="h-3 w-3" />
                                    Elite Strategy
                                </h6>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {val.activities.map((act: string, idx: number) => (
                                        <div key={idx} className="bg-white/80 border border-slate-100/80 p-4 rounded-2xl flex items-start gap-4 text-[13px] text-slate-700 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-500 group/card">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 group-hover/card:scale-150 transition-transform" />
                                            {act}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(val.deliverables && Array.isArray(val.deliverables)) && (
                            <div className="space-y-3">
                                <h6 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Winning Outputs
                                </h6>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {val.deliverables.map((del: string, idx: number) => (
                                        <div key={idx} className="bg-emerald-50/20 backdrop-blur-sm border border-emerald-100/50 p-4 rounded-2xl flex items-start gap-4 text-[13px] text-slate-700 hover:border-emerald-300 transition-all duration-500">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                                            {del}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <div className="grid grid-cols-1 gap-8">
                    {Object.entries(val).map(([key, subVal]) => {
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        if (!subVal || (Array.isArray(subVal) && subVal.length === 0)) return null;

                        return (
                            <div key={key} className="space-y-4">
                                <h5 className="flex items-center gap-3 text-sm font-black text-slate-800 px-1 uppercase tracking-wider">
                                    <div className="w-1 h-5 bg-gradient-to-b from-indigo-600 to-violet-600 rounded-full shadow-sm shadow-indigo-200" />
                                    {label}
                                </h5>
                                <div className="bg-white/60 backdrop-blur-sm border border-white rounded-[2rem] p-6 shadow-2xl shadow-slate-200/30 ring-1 ring-slate-100/50 transition-all duration-700 hover:shadow-indigo-500/10 hover:border-indigo-100">
                                    {renderValue(subVal, depth + 1)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return <p className="text-[13px] text-slate-600 leading-relaxed font-medium">{String(val)}</p>;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            {(title || source) && (
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative p-3.5 bg-slate-900 rounded-2xl text-white shadow-2xl">
                                <Brain className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{title || 'Expert Intelligence'}</h4>
                            {source && (
                                <div className="flex items-center gap-2">
                                    <span className="w-4 h-[1px] bg-indigo-200" />
                                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em]">{source}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Elite Strategy Active</span>
                    </div>
                </div>
            )}

            <div className="expert-content-root relative">
                {/* Subtle background glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-100/50 rounded-full blur-[100px] pointer-events-none -z-10" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-50/50 rounded-full blur-[80px] pointer-events-none -z-10" />

                {renderValue(data)}
            </div>
        </div>
    );
}
