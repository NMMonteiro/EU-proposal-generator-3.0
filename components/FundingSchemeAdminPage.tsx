import { useState } from 'react';
import { FundingSchemeCRUD } from '../components/FundingSchemeCRUD';
import { FundingSchemeTemplateParser } from '../components/FundingSchemeTemplateParser';
import { ArrowLeft, Settings, Database, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FundingSchemeAdminPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'manage' | 'parser'>('manage');

    return (
        <div className="min-h-screen bg-background">
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                            <Settings className="h-6 w-6 text-primary" />
                            Funding Scheme Administration
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage funding templates, parse documents, and configure schemes
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-muted rounded-lg transition"
                        title="Back to home"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-border">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${activeTab === 'manage'
                                    ? 'border-primary text-primary font-semibold'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Database className="h-4 w-4" />
                            Manage Schemes
                        </button>
                        <button
                            onClick={() => setActiveTab('parser')}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${activeTab === 'parser'
                                    ? 'border-primary text-primary font-semibold'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Upload className="h-4 w-4" />
                            Import/Parse Template
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="py-4">
                    {activeTab === 'manage' ? (
                        <FundingSchemeCRUD />
                    ) : (
                        <FundingSchemeTemplateParser />
                    )}
                </div>
            </div>
        </div>
    );
}
