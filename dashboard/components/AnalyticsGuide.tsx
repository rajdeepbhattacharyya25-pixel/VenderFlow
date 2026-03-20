import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown, ChevronRight, BarChart2, DollarSign, Package, TrendingUp, Upload, Download, Calendar } from 'lucide-react';

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const Section = ({ title, icon, children, defaultOpen = false }: SectionProps) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-neutral-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-5 py-4 bg-white dark:bg-white/[0.03] hover:bg-neutral-50 dark:hover:bg-white/[0.05] transition-colors text-left"
            >
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">{icon}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{title}</span>
                {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {open && (
                <div className="px-5 pb-5 pt-2 bg-neutral-50/50 dark:bg-white/[0.01] text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
};

const AnalyticsGuide = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Help Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-neutral-700 text-sm font-semibold rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                title="How to use Analytics"
            >
                <HelpCircle className="w-4 h-4" />
                Guide
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 px-4 overflow-y-auto">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl animate-[fadeIn_0.3s_ease-out]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">📊 Analytics Guide</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Learn what each section means and how to use it for your business.</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" title="Close guide">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                            {/* Getting Started */}
                            <Section title="Getting Started — Toolbar" icon={<Calendar className="w-4 h-4 text-emerald-400" />} defaultOpen={true}>
                                <p>At the top of the page you'll see a <strong>toolbar</strong> with these controls:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Date Range Selector</strong> — Pick "Last 7 Days", "Last 30 Days", "All Time", or set a "Custom Range" with start and end dates. All charts and numbers on the page update based on the date range you choose.</li>
                                    <li><strong>Import Button</strong> — Upload a CSV file of past orders (e.g. from another platform) to analyze them here. The page switches to <em>Deep Analysis Mode</em> and all charts show your imported data instead of live data.</li>
                                    <li><strong>Export CSV</strong> — Download your current order data as a CSV file so you can save it or open it in Excel / Google Sheets.</li>
                                </ul>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">💡 <strong>Tip:</strong> Use "Last 7 Days" to check recent performance, "Last 30 Days" for a monthly view, and "All Time" to see the bigger picture.</p>
                            </Section>

                            <Section title="Tab 1 — Overview" icon={<BarChart2 className="w-4 h-4 text-emerald-400" />}>
                                <p>The <strong>Overview</strong> tab gives you a quick snapshot of how your store is doing right now.</p>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">📦 Metric Cards (Top Row)</h4>
                                <p>Four cards show your most important numbers at a glance:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Net Revenue</strong> — The actual money you earned after refunds are subtracted. This is your real income. A green/red badge shows how this compares to the previous period (e.g. if you picked "Last 7 Days", it compares to the 7 days before that).</li>
                                    <li><strong>Total Orders</strong> — How many orders customers placed in the selected period. More orders usually means more visibility.</li>
                                    <li><strong>Refund Rate</strong> — The percentage of orders that were refunded or cancelled. If the card turns red, your refund rate is above 5% — which could signal a quality or shipping issue.</li>
                                    <li><strong>Revenue Growth</strong> — Shows whether your revenue is going up or down compared to the previous period. A positive (+) number means growth, a negative (-) number means decline.</li>
                                </ul>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">📈 Net Revenue Chart (Area Chart)</h4>
                                <p>This is the large chart on the left. It shows your <strong>daily net revenue</strong> over time as a smooth area graph. The filled area below the line helps you visually see revenue volume. Hover over any point to see the exact revenue for that day.</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">💡 <strong>How to use it:</strong> Look for upward slopes (revenue increasing) or downward dips (slow days). Patterns repeat — if weekends are always low, plan promotions accordingly.</p>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">📊 Daily Orders Bar Chart</h4>
                                <p>This smaller chart on the right shows the <strong>number of orders per day</strong> as vertical bars. Taller bars = more orders on that day.</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">💡 <strong>How to use it:</strong> Compare this with the revenue chart. If you have many orders but low revenue, your average order value might be dropping. If you have fewer orders but high revenue, you're selling higher-priced items.</p>
                            </Section>

                            <Section title="Tab 2 — Smart Revenue" icon={<DollarSign className="w-4 h-4 text-emerald-400" />}>
                                <p>The <strong>Smart Revenue</strong> tab breaks down your money flow in detail — where it came from and where it went.</p>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">💰 Revenue Waterfall Cards (Top Row)</h4>
                                <p>Three cards show the flow of your money, like a waterfall:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Gross Revenue</strong> — Total money from all orders before anything is subtracted. The progress bar is always full (100%).</li>
                                    <li><strong>Leaked to Refunds</strong> — Money lost to refunded/cancelled orders. Shown in red. The progress bar shows what fraction of gross revenue was refunded. <em>Smaller is better!</em></li>
                                    <li><strong>Net Revenue</strong> — What you actually keep: Gross Revenue minus Refunds. Shown in green. This is the number that matters most.</li>
                                </ul>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">🔢 Order Metrics Row</h4>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Total Orders</strong> — Count of all orders in the period.</li>
                                    <li><strong>Refunded Orders</strong> — How many individual orders were refunded or cancelled.</li>
                                    <li><strong>Refund Rate</strong> — Percentage of refunded orders out of total. Keep this below 5% for a healthy business.</li>
                                </ul>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">📈 Revenue Trend Chart</h4>
                                <p>Same style as the Overview chart, but focused here for the revenue context. Shows your daily net revenue trend over the selected period.</p>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">❤️ Revenue Health Score</h4>
                                <p>A single score from <strong>0 to 100</strong> that estimates the overall health of your revenue. It considers your refund rate and growth trajectory:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>70–100 (Green)</strong> — Excellent / Healthy. Your revenue is growing and refund rate is low.</li>
                                    <li><strong>40–69 (Yellow)</strong> — Needs Attention. Some areas could improve.</li>
                                    <li><strong>0–39 (Red)</strong> — Critical. High refund rate or declining revenue. Take action!</li>
                                </ul>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">💡 <strong>How to use it:</strong> If your score drops, check refund rate and growth. Fix the root cause — it could be product quality, shipping delays, or wrong descriptions.</p>
                            </Section>

                            <Section title="Tab 3 — Product Intel" icon={<Package className="w-4 h-4 text-amber-400" />}>
                                <p>The <strong>Product Intel</strong> tab helps you understand which products are making money and which are causing problems.</p>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">🏆 Top 3 Product Spotlight</h4>
                                <p>Three cards highlight your <strong>best-selling products</strong> ranked #1, #2, #3 by revenue. Each card shows:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Units Sold</strong> — How many units of this product were sold.</li>
                                    <li><strong>Contribution</strong> — What percentage of your total revenue this product is responsible for. Higher is better — it means this product is a big driver of your income.</li>
                                </ul>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">📋 Product Performance Table</h4>
                                <p>A detailed table of <strong>all your products</strong> with these columns:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Product</strong> — The product name with its rank number.</li>
                                    <li><strong>Units</strong> — Number of units sold, with a small bar showing how it compares to your top product.</li>
                                    <li><strong>Refund %</strong> — Refund rate for this specific product. Color-coded: <span className="text-emerald-500 font-medium">Green (under 5%)</span> = good, <span className="text-amber-500 font-medium">Yellow (5–10%)</span> = warning, <span className="text-red-500 font-medium">Red (above 10%)</span> = problem.</li>
                                    <li><strong>ASP (Average Selling Price)</strong> — Average price per unit for this product. Helps you understand pricing.</li>
                                    <li><strong>Revenue</strong> — Total revenue from this product.</li>
                                    <li><strong>Share</strong> — What % of total revenue this product represents, with a gradient bar for visual comparison.</li>
                                </ul>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">📊 Revenue Distribution Chart</h4>
                                <p>A <strong>horizontal bar chart</strong> showing your top 8 products by revenue. Longer bars = more revenue. This makes it easy to see which products are your biggest earners visually.</p>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">⚠️ Refund Risk Matrix</h4>
                                <p>This section only appears if any product has a <strong>refund rate above 10%</strong>. It flags risky products so you can investigate:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Shows the product name, refund percentage, units refunded, and money lost.</li>
                                    <li><strong>Action:</strong> Check why customers are returning this product — is the quality bad? Is the description misleading? Is there a sizing issue?</li>
                                </ul>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">💡 <strong>How to use it:</strong> Focus on products with high revenue AND high refund rate — fixing those will have the biggest impact on your bottom line.</p>
                            </Section>

                            <Section title="Tab 4 — Trend Intel" icon={<TrendingUp className="w-4 h-4 text-cyan-400" />}>
                                <p>The <strong>Trend Intel</strong> tab uses <strong>Moving Averages</strong> — a technique used by stock traders — to remove daily noise and show you the real direction of your business.</p>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">📉 Trend Intelligence Chart</h4>
                                <p>This large chart shows three lines overlaid together:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Gray thin line (Daily)</strong> — Your actual daily revenue. This zigzags a lot because individual days can be unpredictable.</li>
                                    <li><strong>Blue line (3-Day MA)</strong> — The average of the last 3 days. This smooths out short-term noise and shows recent trends.</li>
                                    <li><strong>primary thick line (7-Day MA)</strong> — The average of the last 7 days. This is the most stable and shows your <em>true business direction</em> — whether things are really going up, down, or staying flat.</li>
                                </ul>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">💡 <strong>How to read it:</strong> When the blue line crosses above the primary line, it means short-term sales are picking up. When blue drops below primary, things are slowing down.</p>

                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">📊 Trend Insight Cards (Bottom Row)</h4>
                                <ul className="list-disc pl-5 space-y-3">
                                    <li>
                                        <strong>Short-term Momentum</strong> — Compares today's revenue to the 3-day average.
                                        <ul className="list-disc pl-5 mt-1 space-y-1">
                                            <li><span className="text-emerald-500 font-medium">Positive (+)</span> = Today is better than your recent average. Good sign!</li>
                                            <li><span className="text-red-500 font-medium">Negative (-)</span> = Today is weaker than your recent average.</li>
                                        </ul>
                                    </li>
                                    <li>
                                        <strong>Weekly Trend Direction</strong> — Based on the 7-day moving average, it tells you:
                                        <ul className="list-disc pl-5 mt-1 space-y-1">
                                            <li><span className="text-emerald-500 font-medium">↗ Upward</span> = Revenue is trending up over the past week.</li>
                                            <li><span className="text-red-500 font-medium">↘ Downward</span> = Revenue is trending down.</li>
                                            <li><span className="text-gray-500 font-medium">→ Flat</span> = Revenue is stable, no big change.</li>
                                        </ul>
                                    </li>
                                    <li>
                                        <strong>Volatility Score (0–100)</strong> — Measures how unpredictable your daily revenue is:
                                        <ul className="list-disc pl-5 mt-1 space-y-1">
                                            <li><span className="text-emerald-500 font-medium">0–29 (Stable)</span> = Your revenue is consistent day-to-day. Reliable income.</li>
                                            <li><span className="text-amber-500 font-medium">30–59 (Moderate)</span> = Some ups and downs — normal for most sellers.</li>
                                            <li><span className="text-red-500 font-medium">60–100 (High)</span> = Revenue swings a lot. Try to find the cause — seasonal products? Unreliable ad campaigns?</li>
                                        </ul>
                                    </li>
                                </ul>
                            </Section>

                            <Section title="CSV Import — Deep Analysis Mode" icon={<Upload className="w-4 h-4 text-emerald-400" />}>
                                <p>When you upload a CSV file using the <strong>Import</strong> button, the page enters <strong>Deep Analysis Mode</strong>:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>A blue banner appears at the top confirming you're in this mode.</li>
                                    <li>All charts and metrics now show data from your uploaded file instead of live store data.</li>
                                    <li>Your CSV should have columns like: <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs">Order_ID, Date, Product_Name, Quantity, Final_Amount_INR, Order_Status</code></li>
                                    <li>To go back to live data, click the <strong>"Clear Data"</strong> button on the blue banner.</li>
                                </ul>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">💡 <strong>Use case:</strong> If you're migrating from another platform and want to analyze your old sales data, just upload the CSV and all charts will instantly show your historical performance.</p>
                            </Section>

                            {/* Quick Tips */}
                            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                                <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">🚀 Quick Tips for Growing Your Business</h4>
                                <ul className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2 list-disc pl-5">
                                    <li><strong>Check Overview weekly</strong> — Keep an eye on revenue growth and refund rate trends.</li>
                                    <li><strong>Use Smart Revenue monthly</strong> — Track how much of your gross revenue is lost to refunds.</li>
                                    <li><strong>Review Product Intel</strong> — Double down on your top products and fix the ones with high refund rates.</li>
                                    <li><strong>Watch Trend Intel</strong> — When the 7-Day line starts dipping, it's time to act — run a promotion, improve listings, or investigate issues.</li>
                                    <li><strong>Export regularly</strong> — Download your data monthly for your own records and tax purposes.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AnalyticsGuide;
