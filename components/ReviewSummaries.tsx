import React, { useState, useEffect } from 'react';
import { supabase, secureInvoke } from '../lib/supabase';
import { IconSparkles, IconStar, IconCheck } from './Icons';

interface ReviewSummary {
  summary: string;
  themes: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
}

interface ReviewSummariesProps {
  productId: string;
}

export const ReviewSummaries: React.FC<ReviewSummariesProps> = ({ productId }) => {
  const [summaryData, setSummaryData] = useState<ReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: funcError } = await secureInvoke('review-summarizer', {
          body: { productId }
        });

        if (funcError) throw funcError;
        if (data) setSummaryData(data);
      } catch (err) {
        console.error('Failed to fetch review summary:', err);
        setError('Could not generate review summary.');
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchSummary();
    }
  }, [productId]);

  if (isLoading) {
    return (
      <div className="mt-8 p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-emerald-200 dark:bg-emerald-800 rounded"></div>
          <div className="h-4 bg-emerald-200 dark:bg-emerald-800 rounded w-32"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-emerald-200 dark:bg-emerald-800 rounded w-full"></div>
          <div className="h-3 bg-emerald-200 dark:bg-emerald-800 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error || !summaryData) return null;

  const sentimentColors = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    neutral: 'text-gray-600 dark:text-gray-400',
    negative: 'text-rose-600 dark:text-rose-400',
    mixed: 'text-amber-600 dark:text-amber-400'
  };

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20">
            <IconSparkles className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">AI Review Insights</h4>
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 ${sentimentColors[summaryData.sentiment]}`}>
          {summaryData.sentiment}
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 italic">
        "{summaryData.summary}"
      </p>

      <div className="flex flex-wrap gap-2">
        {summaryData.themes.map((theme, idx) => (
          <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800/50 rounded-full border border-emerald-100 dark:border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <IconCheck className="w-3 h-3" />
            {theme}
          </div>
        ))}
      </div>
    </div>
  );
};
