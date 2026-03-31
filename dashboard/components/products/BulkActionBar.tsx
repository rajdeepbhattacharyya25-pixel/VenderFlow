import React from 'react';
import { Archive, Trash, Tag, Download, X, Edit2, Globe } from 'lucide-react';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onAction: (action: string) => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ selectedCount, onClearSelection, onAction }) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-[slideUp_0.3s_ease-out]">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-slate-700">
                    <span className="font-bold whitespace-nowrap">{selectedCount} Selected</span>
                    <button onClick={onClearSelection} title="Clear selection" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => onAction('edit')} title="Bulk Edit" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium">
                        <Edit2 size={16} /> Edit
                    </button>

                    {/* Publish = draft → live */}
                    <button
                        onClick={() => onAction('status')}
                        title="Publish selected products (Draft → Live)"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-colors text-sm font-medium"
                    >
                        <Globe size={16} /> Publish
                    </button>

                    {/* Archive = live → draft */}
                    <button
                        onClick={() => onAction('archive')}
                        title="Unpublish / Archive selected products"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Archive size={16} /> Unpublish
                    </button>

                    <button onClick={() => onAction('export')} title="Export as CSV" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium">
                        <Download size={16} /> Export
                    </button>

                    <button
                        onClick={() => onAction('delete')}
                        title="Delete selected products"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors text-sm font-medium ml-2"
                    >
                        <Trash size={16} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkActionBar;
