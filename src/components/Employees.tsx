import React, { memo, Suspense, lazy } from 'react';
import { Plus, Users, Shield, Clock, Wallet } from 'lucide-react';
import { Employee } from '../types';
import { ConfirmDialog } from './ui';
import { cn } from '../lib/utils';
import { PerformanceSummary } from './employees/PerformanceSummary';
import { EmployeeCard } from './employees/EmployeeCard';
import { TeamManagement } from './employees/TeamManagement';
import { useEmployeesLogic, EmployeesProps } from './useEmployeesLogic';

// Lazy load secondary tabs and recruitment modal to keep initial opening ultra-fast
const AttendanceTab = lazy(() => import('./employees/AttendanceTab').then(m => ({ default: m.AttendanceTab })));
const AdvancesTab = lazy(() => import('./employees/AdvancesTab').then(m => ({ default: m.AdvancesTab })));
const RecruitmentModal = lazy(() => import('./employees/RecruitmentModal').then(m => ({ default: m.RecruitmentModal })));

export { TeamManagement };

export const Employees = memo(function Employees(props: EmployeesProps) {
  const { 
    employees, 
    attendance, 
    advances, 
    settings, 
    users, 
    setIsAddUserModalOpen 
  } = props;

  const {
    handleSubmit,
    isModalOpen,
    setIsModalOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    employeeToDelete,
    editingEmployee,
    setEditingEmployee,
    hrTab,
    setHrTab,
    formData,
    setFormData,
    recruitmentTab,
    setRecruitmentTab,
    cameraActiveSection,
    setCameraActiveSection,
    signatureSaved,
    setSignatureSaved,
    sortConfig,
    requestSort,
    sortedEmployeesPerformance,
    employeePerformance,
    handleDeleteEmployee,
    handlePrintDossier,
    confirmDelete,
    stopCamera,
    startCamera,
    takePhoto,
    videoRef,
    handleFileUpload,
    clearCanvas,
    canvasRef,
    startDrawing,
    drawSign,
    endDrawing,
    saveSignature
  } = useEmployeesLogic(props);

  return (
    <div className="space-y-6 text-left">
      {/* Clean & Fast Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Personnel, Comptes & Pointage RH
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Dossiers employés, performances de vente, comptes d'accès PIN caisse, pointage et acomptes sur salaires
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 overflow-x-auto no-scrollbar">
            {[
              { id: 'info', label: 'Personnel & Ventes', icon: Users },
              { id: 'team', label: 'Comptes & PIN', icon: Shield },
              { id: 'permissions', label: 'Permissions', icon: Shield },
              { id: 'attendance', label: 'Pointage', icon: Clock },
              { id: 'advances', label: 'Acomptes & Paie', icon: Wallet }
            ].map(tab => (
              <button 
                key={tab.id}
                type="button"
                onClick={() => setHrTab(tab.id as any)} 
                className={cn(
                  "px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap",
                  hrTab === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <Plus size={16} /> Ajouter Employé
          </button>
        </div>
      </div>

      {hrTab === 'info' && (
        <div className="space-y-6">
          <PerformanceSummary
            sortedEmployeesPerformance={sortedEmployeesPerformance}
            employeePerformance={employeePerformance}
            sortConfig={sortConfig}
            requestSort={requestSort}
            settings={settings}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee: Employee, idx: number) => {
              const perf = employeePerformance[employee.id] || { totalSales: 0, transactionCount: 0 };
              return (
                <EmployeeCard
                  key={`emp-card-${employee.id}`}
                  employee={employee}
                  perf={perf}
                  settings={settings}
                  idx={idx}
                  handleDeleteEmployee={handleDeleteEmployee}
                  handlePrintDossier={handlePrintDossier}
                  setEditingEmployee={setEditingEmployee}
                  setIsModalOpen={setIsModalOpen}
                />
              );
            })}
          </div>
        </div>
      )}

      {(hrTab === 'team' || hrTab === 'permissions') && (
        <TeamManagement 
          users={users} 
          employees={employees} 
          settings={settings} 
          setIsAddUserModalOpen={setIsAddUserModalOpen} 
          defaultSubTab={hrTab === 'permissions' ? 'permissions' : 'users'}
        />
      )}

      {hrTab === 'attendance' && (
        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement du module de pointage...</div>}>
          <AttendanceTab employees={employees} attendance={attendance} users={users} advances={advances} settings={settings} />
        </Suspense>
      )}

      {hrTab === 'advances' && (
        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement du module d'acomptes...</div>}>
          <AdvancesTab employees={employees} advances={advances} settings={settings} />
        </Suspense>
      )}

      {isModalOpen && (
        <Suspense fallback={null}>
          <RecruitmentModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); stopCamera(); }}
            stopCamera={stopCamera}
            editingEmployee={editingEmployee}
            recruitmentTab={recruitmentTab}
            setRecruitmentTab={setRecruitmentTab}
            handleSubmit={handleSubmit}
            formData={formData}
            setFormData={setFormData}
            settings={settings}
            cameraActiveSection={cameraActiveSection}
            startCamera={startCamera}
            takePhoto={takePhoto}
            videoRef={videoRef}
            handleFileUpload={handleFileUpload}
            clearCanvas={clearCanvas}
            canvasRef={canvasRef}
            startDrawing={startDrawing}
            drawSign={drawSign}
            endDrawing={endDrawing}
            saveSignature={saveSignature}
          />
        </Suspense>
      )}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer l'employé"
        message={`Êtes-vous sûr de vouloir supprimer l'employé "${employeeToDelete?.name}" ? Cette action est irréversible.`}
      />
    </div>
  );
});
