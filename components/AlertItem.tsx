import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { IconBell, IconChevronRight } from './Icons';

export interface AlertAction {
  type: string;
  payload: any;
}

export interface AlertItemProps {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  severity?: 'info' | 'warning' | 'critical' | 'emergency';
  action?: AlertAction | null;
  onMarkAsRead: (id: string) => void;
  onActionClick?: (action: AlertAction) => void;
}

export const AlertItem: React.FC<AlertItemProps> = ({
  id,
  title,
  message,
  created_at,
  read,
  severity = 'info',
  action,
  onMarkAsRead,
  onActionClick
}) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'emergency':
      case 'critical':
        return 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-500/5';
      case 'warning':
        return 'border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-500/5';
      default:
        return 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-500/5';
    }
  };

  const getSeverityIcon = () => {
    const iconClass = "w-4 h-4 mt-0.5 shrink-0";
    switch (severity) {
      case 'emergency':
      case 'critical':
        return <IconBell className={clsx(iconClass, "text-red-500 animate-pulse")} />;
      case 'warning':
        return <IconBell className={clsx(iconClass, "text-amber-500")} />;
      default:
        return <IconBell className={clsx(iconClass, "text-blue-500")} />;
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (action && onActionClick) {
      onActionClick(action);
    }
  };

  return (
    <div
      className={clsx(
        'p-4 transition-all cursor-pointer group relative flex gap-3',
        !read ? getSeverityStyles() : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
      onClick={() => !read && onMarkAsRead(id)}
    >
      {getSeverityIcon()}
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className={clsx(
            "text-sm line-clamp-1", 
            !read ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300"
          )}>
            {title}
          </h4>
          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap mt-0.5">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </span>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 mb-2">
          {message}
        </p>

        {action && (
          <button
            onClick={handleAction}
            className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95",
              severity === 'critical' || severity === 'emergency'
                ? "bg-red-500 text-white hover:bg-red-600 shadow-sm"
                : "bg-primary text-white hover:bg-primary-dark shadow-sm"
            )}
          >
            {action.type.replace(/_/g, ' ')}
            <IconChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {!read && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={(e) => { e.stopPropagation(); onMarkAsRead(id); }}
             className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs text-gray-400"
             title="Mark as read"
           >
             Done
           </button>
        </div>
      )}
    </div>
  );
};
