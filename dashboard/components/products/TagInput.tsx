import React, { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    suggestions?: string[];
}

const TagInput: React.FC<TagInputProps> = ({ tags, onChange, placeholder = 'Add categories...', suggestions = [] }) => {
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const addTag = (tag: string) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
        }
        setInput('');
        setShowSuggestions(false);
    };

    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const filteredSuggestions = suggestions.filter(
        s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
    );

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 p-2 bg-theme-bg border border-theme-border rounded-xl min-h-[46px] focus-within:ring-2 focus-within:ring-theme-chart-line/20 focus-within:border-theme-chart-line transition-all">
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="flex items-center gap-1.5 px-3 py-1 bg-theme-chart-line/10 text-theme-chart-line border border-theme-chart-line/20 rounded-full text-sm font-medium animate-in zoom-in-95 duration-200"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            title={`Remove ${tag}`}
                            className="hover:text-theme-text transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
                <div className="relative flex-1 min-w-[120px]">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={tags.length === 0 ? placeholder : ''}
                        className="w-full bg-transparent border-none outline-none text-theme-text placeholder-theme-muted text-sm py-1"
                    />
                    
                    {showSuggestions && input && filteredSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-theme-panel border border-theme-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {filteredSuggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => addTag(suggestion)}
                                    className="w-full text-left px-4 py-2 hover:bg-theme-bg text-sm text-theme-text transition-colors flex items-center justify-between group"
                                >
                                    {suggestion}
                                    <Plus size={14} className="opacity-0 group-hover:opacity-100 text-theme-muted" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <p className="text-[10px] text-theme-muted px-1">
                Press Enter or comma to add. Multiple categories improve visibility.
            </p>
        </div>
    );
};

export default TagInput;
