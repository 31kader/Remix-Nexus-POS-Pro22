import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { CompanySettings, UserProfile } from '../types';
import { CameraSidebar } from './camera-portal/CameraSidebar';
import { CameraMainFeed } from './camera-portal/CameraMainFeed';
import { CameraActionSidebar } from './camera-portal/CameraActionSidebar';
import { CameraPortalHeader } from './camera-portal/CameraPortalHeader';
import { useCameraPortalLogic } from './camera-portal/useCameraPortalLogic';

interface CameraPortalProps {
  settings: CompanySettings;
  user: UserProfile;
}

export function CameraPortal({ settings, user }: CameraPortalProps) {
  const {
    selectedTransaction,
    setSelectedTransaction,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentView,
    setCurrentView,
    timeSpent,
    aiAnalysisLoading,
    setAiAnalysisLoading,
    liveSessions,
    activeAiZone,
    sendMessageToCashier,
    filteredTransactions,
    handleAudit,
    callManager,
    handleAddNote
  } = useCameraPortalLogic(user);

  return (
    <div className="flex flex-col h-full bg-nardo text-slate-100 overflow-hidden font-sans">
      <CameraPortalHeader
        user={user}
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedTransaction={selectedTransaction}
        timeSpent={timeSpent}
        callManager={callManager}
      />

      <div className="flex-1 flex overflow-hidden">
        <CameraSidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          currentView={currentView}
          liveSessions={liveSessions}
          filteredTransactions={filteredTransactions}
          selectedTransaction={selectedTransaction}
          setSelectedTransaction={setSelectedTransaction}
          settings={settings}
        />

        {/* Main Feed Section */}
        <div className="flex-1 flex flex-col overflow-hidden bg-nardo">
           {selectedTransaction ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                 <div className="flex-1 flex overflow-hidden">
                   <CameraMainFeed
                     selectedTransaction={selectedTransaction}
                     activeAiZone={activeAiZone}
                     handleAudit={handleAudit}
                   />
                   <CameraActionSidebar
                     sendMessageToCashier={sendMessageToCashier}
                     aiAnalysisLoading={aiAnalysisLoading}
                     setAiAnalysisLoading={setAiAnalysisLoading}
                     selectedTransaction={selectedTransaction}
                     handleAddNote={handleAddNote}
                   />
                 </div>
              </div>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-800">
                <div className="w-32 h-32 bg-workspace border border-white/5 rounded-xl flex items-center justify-center mb-8 shadow-md">
                   <LayoutGrid size={48} className="opacity-10 text-indigo-500" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-normal text-white/20">Système en Veille</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-2">Sélectionnez une session pour monitoring</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
