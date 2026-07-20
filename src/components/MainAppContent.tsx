import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Sidebar } from './Sidebar';
import { BottomBar } from './BottomBar';
import { AppHeader } from './AppHeader';
import { CheckoutSkeleton, DashboardSkeleton, InventorySkeleton } from './Skeletons';
import { Skeleton } from './ui/Skeleton';
import { Card } from './ui';
import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useProductStats } from '../hooks/useAppPermissionsAndStats';

interface MainAppContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  isMobileOverlayOpen: boolean;
  setIsMobileOverlayOpen: (open: boolean) => void;
  isDataLoading: boolean;
  [key: string]: any;
}

export const MainAppContent: React.FC<MainAppContentProps> = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  isMobile,
  isMobileOverlayOpen,
  setIsMobileOverlayOpen,
  isDataLoading,
  children,
  ...props
}) => {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const settings = useCoreStore(s => s.settings);
  const employees = usePeopleStore(s => s.employees);
  const { expiringProducts, lowStockProducts } = useProductStats();

  return (
    <div className="flex h-screen text-slate-100 overflow-hidden font-sans bg-[#05070a]">
      <Sidebar 
        user={user}
        profile={profile}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile}
        isMobileOverlayOpen={isMobileOverlayOpen}
        setIsMobileOverlayOpen={setIsMobileOverlayOpen}
        permissions={props.permissions}
        settings={settings}
        isCameraAgent={profile?.role === 'camera_agent'}
        isAdmin={profile?.role === 'admin'}
        isManager={profile?.role === 'manager'}
        handleLogout={() => props.handleLogout(user)}
        handleInstallApp={props.handleInstallApp}
        deferredPrompt={props.deferredPrompt}
        setIsPriceCheckerModalOpen={props.setIsPriceCheckerModalOpen}
      />

      <main className="flex-1 flex flex-col min-w-0 relative bg-transparent">
        <AppHeader 
          isMobile={isMobile}
          setIsMobileOverlayOpen={setIsMobileOverlayOpen}
          activeTab={activeTab}
          lowStockProducts={lowStockProducts}
          expiringProducts={expiringProducts}
          setIsLowStockModalOpen={props.setIsLowStockModalOpen}
          setIsExpirationModalOpen={props.setIsExpirationModalOpen}
          currentEmployee={props.currentEmployee}
          isClockedIn={props.isClockedIn}
          handleClockInOut={props.handleClockInOut}
          language={props.language}
          setLanguage={props.setLanguage}
          isLangMenuOpen={props.isLangMenuOpen}
          setIsLangMenuOpen={props.setIsLangMenuOpen}
          theme={props.theme}
          setTheme={props.setTheme}
          isThemeMenuOpen={props.isThemeMenuOpen}
          setIsThemeMenuOpen={props.setIsThemeMenuOpen}
          activeStaffId={props.activeStaffId}
          employees={employees}
          profile={profile}
          user={user}
          t={props.t}
          toast={props.toast}
        />

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "h-full overflow-y-auto custom-scrollbar",
                activeTab !== 'checkout' && (isMobile ? "p-4" : "p-8")
              )}
            >
              {isDataLoading ? (
                <div className="h-full">
                  {activeTab === 'checkout' && <CheckoutSkeleton />}
                  {activeTab === 'dashboard' && <DashboardSkeleton />}
                  {activeTab === 'inventory' && <InventorySkeleton />}
                  {!['checkout', 'dashboard', 'inventory'].includes(activeTab) && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-10 w-64 rounded-xl" />
                        <Skeleton className="h-10 w-32 rounded-xl" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                           <Card key={i} className="p-6 space-y-4">
                              <Skeleton className="h-6 w-1/2" />
                              <Skeleton className="h-20 w-full" />
                              <Skeleton className="h-4 w-1/3" />
                           </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                children
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {isMobile && <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} />}
      </main>
    </div>
  );
};
