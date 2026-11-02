import React, { useState, useEffect, useMemo } from 'react';
import { Employee, CompanySettings, UserProfile } from '../../types';
import { auth } from '../../services/AuthService';
import { useTeamManagementLogic } from './useTeamManagementLogic';
import { TeamManagementUsersTab } from './TeamManagementUsersTab';
import { TeamManagementPermissionsTab } from './TeamManagementPermissionsTab';
import { TeamManagementHeader } from './TeamManagementHeader';
import { 
  TeamWeeklyScheduleTab, 
  ShiftSlot, 
  printWeeklyScheduleDocument 
} from './TeamWeeklyScheduleTab';
import { checkIsOwner } from '../../config/ownerConfig';

const SCHEDULE_STORAGE_KEY = 'nexus_team_weekly_schedule_v1';

export const TeamManagement = React.memo(function TeamManagement({ 
  users, 
  employees, 
  settings, 
  setIsAddUserModalOpen, 
  defaultSubTab 
}: { 
  users: UserProfile[], 
  employees: Employee[], 
  settings: CompanySettings, 
  setIsAddUserModalOpen: (v: boolean) => void, 
  defaultSubTab?: 'planning' | 'users' | 'permissions' 
}) {
  const [activeSubTab, setActiveSubTab] = useState<'planning' | 'users' | 'permissions'>(defaultSubTab || 'planning');

  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  // Unified roster of staff (from both `employees` and `users`) so the schedule is NEVER empty
  const staffMembers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; phone?: string }>();
    for (const e of employees) {
      if (!e?.id) continue;
      map.set(e.id, { id: e.id, name: e.name || 'Employé', role: e.role || 'Caissier', phone: e.phone });
    }
    for (const u of users) {
      const id = u.employeeId || u.id || u.uid;
      if (!id || map.has(id)) continue;
      map.set(id, { id, name: u.displayName || u.email || 'Membre', role: u.role || 'Caissier', phone: u.phone });
    }
    if (map.size === 0) {
      map.set('owner-default', {
        id: 'owner-default',
        name: auth.currentUser?.displayName || 'Responsable Magasin (Vous)',
        role: 'Admin / Gérant'
      });
    }
    return Array.from(map.values());
  }, [employees, users]);

  // Weekly schedule state persisted in localStorage
  const [schedule, setSchedule] = useState<Record<string, Record<string, ShiftSlot>>>(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  const {
    isProcessing,
    isUserDeleteConfirmOpen,
    setIsUserDeleteConfirmOpen,
    viewedUser,
    setViewedUser,
    handleTogglePermission,
    handleUpdateUserRole,
    handleDeleteUser,
    confirmDeleteUser,
    handlePurgeAll
  } = useTeamManagementLogic({ settings, users });

  const handlePrintWeeklySchedule = () => {
    printWeeklyScheduleDocument(staffMembers, schedule, settings.name || 'Nexus POS Pro');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner & Sub-Tabs */}
      <TeamManagementHeader
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        staffCount={staffMembers.length}
        isOwner={checkIsOwner(auth.currentUser?.email, auth.currentUser?.uid)}
        isProcessing={isProcessing}
        onPrintPlanning={handlePrintWeeklySchedule}
        onAddMember={() => setIsAddUserModalOpen(true)}
        onPurgeAll={handlePurgeAll}
      />

      {/* SUB-TAB 1: WEEKLY TEAM SCHEDULE (PLANNING 7 JOURS) */}
      {activeSubTab === 'planning' && (
        <TeamWeeklyScheduleTab
          staffMembers={staffMembers}
          settings={settings}
          schedule={schedule}
          onScheduleChange={setSchedule}
        />
      )}

      {/* SUB-TAB 2: ACCOUNTS & PIN */}
      {activeSubTab === 'users' && (
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
      )}

      {/* SUB-TAB 3: ROLE PERMISSIONS */}
      {activeSubTab === 'permissions' && (
        <TeamManagementPermissionsTab
          settings={settings}
          isProcessing={isProcessing}
          handleTogglePermission={handleTogglePermission}
        />
      )}
    </div>
  );
});
