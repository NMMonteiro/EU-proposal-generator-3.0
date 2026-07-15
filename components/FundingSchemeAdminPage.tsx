import { FundingSchemeCRUD } from '../components/FundingSchemeCRUD';
import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FundingSchemeAdminPage() {
    const navigate = useNavigate();

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
                            Manage funding templates and configure schemes
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

                {/* Content */}
                <div className="py-4">
                    <FundingSchemeCRUD />
                </div>
            </div>
        </div>
    );
}
