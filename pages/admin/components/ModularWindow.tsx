import React from 'react';
import { Maximize2 } from 'lucide-react';

interface ModularWindowProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  statusColor?: 'emerald' | 'cyan' | 'amber' | 'red';
  isDraggable?: boolean;
}

const ModularWindow: React.FC<ModularWindowProps> = ({
  title,
  subtitle,
  children,
  className = '',
  statusColor = 'emerald',
  isDraggable = true
}) => {
  const borderColorMap = {
    emerald: 'rgba(16, 185, 129, 0.2)',
    cyan: 'rgba(0, 240, 255, 0.2)',
    amber: 'rgba(255, 184, 0, 0.2)',
    red: 'rgba(255, 0, 60, 0.2)'
  };

  const textColorMap = {
    emerald: 'text-[#10B981]',
    cyan: 'text-[#00F0FF]',
    amber: 'text-[#FFB800]',
    red: 'text-[#FF003C]'
  };

  return (
    <div className={`hud-glass hud-data-stream border-[1px] p-1 rounded-sm ${className}`} 
         style={{ borderColor: borderColorMap[statusColor] }}>
      
      {/* Corner Brackets */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: borderColorMap[statusColor] }} />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{ borderColor: borderColorMap[statusColor] }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{ borderColor: borderColorMap[statusColor] }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: borderColorMap[statusColor] }} />

      {/* Header / Drag Handle Area */}
      <div className="p-3 border-b border-white/5 bg-white/[0.02]">
        {isDraggable && <div className="hud-draggable-handle" title="Drag to reorder" />}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full animate-pulse bg-current ${textColorMap[statusColor]}`} />
              <h3 className="text-[10px] font-technical tracking-[0.2em] text-white/50 uppercase">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className={`text-[9px] font-data mt-0.5 opacity-80 ${textColorMap[statusColor]}`}>
                // {subtitle}
              </p>
            )}
          </div>
          <button className="text-white/20 hover:text-white/50 transition-colors" title="Expand Module">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 relative min-h-[100px]">
        {/* Subtle Hex Grid Background Overlay */}
        <div className="absolute inset-0 hud-hex-grid opacity-[0.03] pointer-events-none" />
        {children}
      </div>

      {/* Footer / Status Line */}
      <div className="px-3 py-1 flex justify-between items-center bg-white/[0.01] border-t border-white/5">
        <span className="text-[8px] font-technical text-white/20 tracking-widest uppercase">
          node_active // secured
        </span>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className={`w-1 h-1 rounded-full ${i === 1 ? textColorMap[statusColor].replace('text-', 'bg-') : 'bg-white/5'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModularWindow;
