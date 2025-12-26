import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { ModuleNavigation } from './sidebar/ModuleNavigation';
import { ToggleButton } from './sidebar/ToggleButton';
import { useIsMobile } from '@/hooks/use-mobile';

const STORAGE_KEY = 'unified_sidebar_collapsed';

export const UnifiedSidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  const handleToggleCollapse = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  };

  return (
    <>
      {/* Desktop Sidebar - Clean module navigation */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col bg-background border-r border-border relative z-20"
      >
        <div className="flex flex-col h-full">
          <SidebarHeader collapsed={collapsed} />
          
          {/* Module Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <ModuleNavigation collapsed={collapsed} />
          </nav>

          {/* Toggle Button */}
          <div className="p-2 border-t border-border flex-shrink-0 flex">
            <ToggleButton 
              collapsed={collapsed} 
              onToggle={handleToggleCollapse} 
            />
          </div>
        </div>
      </motion.aside>

      {/* Mobile Overlay Sidebar */}
      <AnimatePresence>
        {isMobile && !collapsed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={handleToggleCollapse}
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 flex flex-col"
            >
              <div className="flex flex-col h-full">
                <SidebarHeader collapsed={false} />
                
                {/* Module Navigation */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                  <ModuleNavigation collapsed={false} />
                </nav>

                {/* Toggle Button */}
                <div className="p-2 border-t border-border flex">
                  <ToggleButton 
                    collapsed={false} 
                    onToggle={handleToggleCollapse} 
                  />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
