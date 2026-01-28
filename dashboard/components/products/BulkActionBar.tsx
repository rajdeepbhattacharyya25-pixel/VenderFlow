import React from 'react';
import { Archive, Trash, Tag, Download, X } from 'lucide-react';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onAction: (action: string) => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ selectedCount, onClearSelection, onAction }) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 animate-[slideUp_0.3s_ease-out]">
            <div className="bg-text text-bg px-6 py-3 rounded-xl shadow-xl flex items-center gap-6 border border-bg/10">
                <div className="flex items-center gap-3 pr-4 border-r border-bg/20">
                    <span className="font-bold whitespace-nowrap">{selectedCount} Selected</span>
                    <button onClick={onClearSelection} className="p-1 hover:bg-bg/20 rounded-full transition-colors">
                        <X size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => onAction('status')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg/10 transition-colors text-sm font-medium">
                        <Tag size={16} /> Status
                    </button>
                    <button onClick={() => onAction('export')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg/10 transition-colors text-sm font-medium">
                        <Download size={16} /> Export
                    </button>
                    <button onClick={() => onAction('archive')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg/10 transition-colors text-sm font-medium">
                        <Archive size={16} /> Archive
                    </button>
                    <button onClick={() => onAction('delete')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-300 transition-colors text-sm font-medium ml-2">
                        <Trash size={16} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkActionBar;
