import React from 'react';

const Sales = () => {
    return (
        <div className="animate-[fadeIn_0.5s_ease-out]">
            <div className="p-8 rounded-2xl bg-panel border border-muted/10 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 rounded-full bg-accent-3/20 flex items-center justify-center mb-4 text-3xl">
                    📈
                </div>
                <h3 className="text-xl font-semibold text-text mb-2">Revenue Insights</h3>
                <p className="text-muted max-w-sm">
                    Detailed breakdowns of your sales performance will appear here.
                </p>
            </div>
        </div>
    );
};

export default Sales;
