import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ShoppingCart, 
  Tag, 
  PieChart, 
  Settings, 
  LogOut,
  Zap
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  isMobile: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'sales', label: 'Sales', icon: Tag },
  { id: 'reports', label: 'Reports', icon: PieChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, isMobile, activeTab, setActiveTab }) => {
  if (isMobile) {
    // Bottom Navigation for Mobile
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-panel border-t border-muted/10 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {MENU_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
             <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 ${isActive ? 'text-chart-line' : 'text-muted'}`}
             >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
             </button>
          )
        })}
      </nav>
    );
  }

  // Desktop/Tablet Sidebar
  return (
    <aside 
      className={`fixed top-0 left-0 h-full bg-panel border-r border-muted/10 z-40 transition-all duration-300 ease-in-out flex flex-col ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
    >
      {/* Logo Area */}
      <div className={`h-[80px] flex items-center ${collapsed ? 'justify-center' : 'px-8'} border-b border-muted/10`}>
        <div className="flex items-center gap-2 text-text font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-text flex items-center justify-center text-bg">
                <Zap size={18} fill="currentColor" />
            </div>
            {!collapsed && <span className="opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">GOIPSU</span>}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`
                        relative flex items-center h-12 rounded-xl transition-all duration-200 group
                        ${collapsed ? 'justify-center w-full px-0' : 'px-4 w-full'}
                        ${isActive ? 'bg-text text-bg shadow-lg' : 'text-muted hover:bg-bg hover:text-text'}
                    `}
                >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                    
                    {!collapsed && (
                        <span className={`ml-3 text-[13px] font-medium whitespace-nowrap opacity-0 animate-[fadeIn_0.2s_0.1s_ease-out_forwards]`}>
                            {item.label}
                        </span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-text text-bg text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {item.label}
                        </div>
                    )}
                </button>
            );
        })}

        <div className="mt-auto">
             <button
                    className={`
                        flex items-center h-12 rounded-xl transition-all duration-200 w-full group text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10
                        ${collapsed ? 'justify-center px-0' : 'px-4'}
                    `}
                >
                    <LogOut size={20} className="flex-shrink-0" />
                    {!collapsed && <span className="ml-3 text-[13px] font-medium whitespace-nowrap">Logout</span>}
            </button>
        </div>
      </nav>

      {/* Promo Card - Updated Dark Mode Gradient */}
      {!collapsed && (
          <div className="p-4 mb-4 mx-4 rounded-xl bg-gradient-to-br from-[#E0F7FF] to-[#F0F4FF] dark:from-[#172554] dark:to-[#1e1b4b] border border-blue-100 dark:border-blue-800/30 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-50">
                <Zap className="text-blue-500 dark:text-blue-400" size={40} fill="currentColor" />
             </div>
             <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-1 relative z-10">Get Premium</h4>
             <p className="text-[11px] text-gray-500 dark:text-gray-300 mb-3 relative z-10">Features at 25% off</p>
             <button className="w-full py-2 bg-text text-bg rounded-lg text-xs font-bold hover:shadow-lg transition-shadow relative z-10">
                 UPGRADE NOW
             </button>
          </div>
      )}
    </aside>
  );
};

export default Sidebar;