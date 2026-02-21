import React, { useState, useEffect } from 'react';
import { Tag, DollarSign, ShoppingBag } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPICard from './components/KPICard';
import EarningsChart from './components/EarningsChart';
import ProductTable from './components/ProductTable';
import DonutChartSection from './components/DonutChartSection';
import RecentOrders from './components/RecentOrders';
import Modal from './components/Modal';
import { EARNINGS_DATA, WEEKLY_EARNINGS_DATA, TOP_PRODUCTS, RECENT_ORDERS, DONUT_DATA } from './constants';
import { Theme, Order } from './types';

function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Theme Handling
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Responsive Handler
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 640;
      const tablet = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (tablet && !mobile) {
        setSidebarCollapsed(true);
      } else if (!tablet) {
        setSidebarCollapsed(false);
      }
    };

    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300 font-sans selection:bg-chart-line selection:text-white pb-20 sm:pb-0">
      
      {/* Left Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        isMobile={isMobile} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Content Area */}
      <div 
        className={`transition-all duration-300 ease-in-out
            ${isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}
        `}
      >
        <Header 
            theme={theme} 
            toggleTheme={toggleTheme} 
            isMobile={isMobile}
            onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} // On mobile this could open a drawer, simplified here
        />

        <main className="p-6 lg:p-8 pt-2">
            
            {/* 3-Column Grid Concept */}
            <div className="flex flex-col xl:flex-row gap-6">
                
                {/* Center Column (KPIs + Chart + Table) */}
                <div className="flex-1 min-w-0 flex flex-col gap-6">
                    
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <KPICard 
                            title="Total Sales" 
                            value={9568.19} 
                            prefix="$ " 
                            icon={Tag} 
                            accentColorClass="bg-accent-1"
                            trend="up"
                        />
                         <KPICard 
                            title="Total Earnings" 
                            value={4593.36} 
                            prefix="$ " 
                            icon={DollarSign} 
                            accentColorClass="bg-accent-2"
                            trend="up"
                        />
                         <KPICard 
                            title="Total Orders" 
                            value={150} 
                            suffix=" k" 
                            icon={ShoppingBag} 
                            accentColorClass="bg-accent-3"
                            trend="down"
                        />
                    </div>

                    {/* Chart */}
                    <EarningsChart 
                      monthlyData={EARNINGS_DATA} 
                      weeklyData={WEEKLY_EARNINGS_DATA}
                      isDark={theme === 'dark'} 
                    />

                    {/* Product Table */}
                    <ProductTable products={TOP_PRODUCTS} />
                </div>

                {/* Right Sidebar (Donut + Recent) */}
                <div className="w-full xl:w-[320px] flex-shrink-0 flex flex-col gap-6">
                    <DonutChartSection data={DONUT_DATA} />
                    <RecentOrders orders={RECENT_ORDERS} onOrderClick={setSelectedOrder} />
                </div>

            </div>
        </main>
      </div>

      {/* Order Details Modal */}
      <Modal 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        title="Order Details"
      >
        {selectedOrder && (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <img src={selectedOrder.productImage} className="w-20 h-20 rounded-xl object-cover" />
                    <div>
                        <h4 className="font-bold text-text text-lg">{selectedOrder.productName}</h4>
                        <p className="text-muted text-sm">{selectedOrder.time}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-bg border border-muted/10">
                        <span className="text-xs text-muted block mb-1">Price</span>
                        <span className="text-lg font-bold text-text">${selectedOrder.price}</span>
                    </div>
                    <div className="p-4 rounded-lg bg-bg border border-muted/10">
                        <span className="text-xs text-muted block mb-1">Status</span>
                        <span className="text-sm font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded inline-block">Completed</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <h5 className="font-medium text-text">Customer Information</h5>
                    <div className="text-sm text-muted">
                        <p>John Doe</p>
                        <p>john.doe@example.com</p>
                        <p>123 Main St, New York, NY</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-4">
                    <button className="flex-1 py-2.5 bg-text text-bg rounded-lg font-medium hover:opacity-90 transition-opacity">Track Order</button>
                    <button className="flex-1 py-2.5 border border-muted/20 text-text rounded-lg font-medium hover:bg-bg transition-colors">Download Invoice</button>
                </div>
            </div>
        )}
      </Modal>

    </div>
  );
}

export default App;