import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, Plus } from 'lucide-react';
import { Employee, CompanySettings, UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { auth } from '../../services/AuthService';
import { useTeamManagementLogic } from './useTeamManagementLogic';
import { TeamManagementUsersTab } from './TeamManagementUsersTab';
import { TeamManagementPermissionsTab } from './TeamManagementPermissionsTab';

const OWNER_EMAIL = (import.meta as any).env?.VITE_OWNER_EMAIL || 'hrskader305@gmail.com';

export const TeamManagement = React.memo(function TeamManagement({ 
  users, 
  employees, 
  settings, 
  setIsAddUserModalOpen, 
  defaultSubTab = 'users' 
}: { 
  users: UserProfile[], 
  employees: Employee[], 
  settings: CompanySettings, 
  setIsAddUserModalOpen: (v: boolean) => void, 
  defaultSubTab?: 'users' | 'permissions' 
}) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'permissions'>(defaultSubTab);

  useEffect(() => {
    setActiveSubTab(defaultSubTab);
  }, [defaultSubTab]);

  const {
    isProcessing,
    isUserDeleteConfirmOpen,
    setIsUserDeleteConfirmOpen,
    userToDelete,
    viewedUser,
    setViewedUser,
    handleTogglePermission,
    handleUpdateUserRole,
    handleDeleteUser,
    confirmDeleteUser,
    handlePurgeAll
  } = useTeamManagementLogic({ settings, users });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 text-left"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5">
        <div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Gestion de l'Équipe<span className="text-indigo-500">.nexus</span></h3>
          <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-1">Access Control & Role Allocation</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setActiveSubTab('users')}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                activeSubTab === 'users' ? "bg-indigo-600 text-white shadow-neon-indigo" : "text-white/40 hover:text-white/70"
              )}
            >
              COMPTES
            </button>
            <button 
              onClick={() => setActiveSubTab('permissions')}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                activeSubTab === 'permissions' ? "bg-indigo-600 text-white shadow-neon-indigo" : "text-white/40 hover:text-white/70"
              )}
            >
              PERMISSIONS
            </button>
          </div>
          
          {auth.currentUser?.email === OWNER_EMAIL && (
            <button 
              onClick={handlePurgeAll}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
            >
              <Trash2 size={16} />
              PURGE TOTALE
            </button>
          )}

          <button 
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl shadow-xl hover:bg-indigo-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            AJOUTER MEMBRE
          </button>
        </div>
      </div>

      {activeSubTab === 'users' ? (
        <TeamManagementUsersTab
          users={users}
          employees={employees}
          isProcessing={isProcessing}
          handleUpdateUserRole={handleUpdateUserRole}
          handleDeleteUser={handleDeleteUser}
          setViewedUser={setViewedUser}
          viewedUser={viewedUser}
          isUserDeleteConfirmOpen={isUserDeleteConfirmOpen}
          setIsUserDeleteConfirmOpen={setIsUserDeleteConfirmOpen}
          confirmDeleteUser={confirmDeleteUser}
        />
      ) : (
        <TeamManagementPermissionsTab
          settings={settings}
          isProcessing={isProcessing}
          handleTogglePermission={handleTogglePermission}
        />
      )}
    </motion.div>
  );
});
