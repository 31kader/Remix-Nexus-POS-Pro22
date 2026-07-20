import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Phone, Mail, UserCog, TrendingUp, Trash2, Lock, Printer, Camera, FileText, Image, CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase';
import { auth } from '../services/AuthService';
import { handleDatabaseError, OperationType } from '../lib/db-compat';
import { convertKeysToSnake } from '../lib/db-converters';
import { 
  Employee, Transaction, AttendanceRecord, AdvanceRecord, 
  CompanySettings, UserProfile
} from '../types';
import { Card, ConfirmDialog, SortableHeader } from './ui';
import { cn } from '../lib/utils';
import { getApiUrl } from '../lib/api';

// Import modular employee sub-tabs and components
import { AttendanceTab } from './employees/AttendanceTab';
import { AdvancesTab } from './employees/AdvancesTab';
import { TeamManagement } from './employees/TeamManagement';
import { PerformanceSummary } from './employees/PerformanceSummary';
import { EmployeeCard } from './employees/EmployeeCard';
import { RecruitmentModal } from './employees/RecruitmentModal';


export { TeamManagement };
import { useEmployeesLogic, EmployeesProps } from './useEmployeesLogic';

export const Employees = memo(function Employees(props: EmployeesProps) {
  const { 
    employees, 
    transactions, 
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
    setEmployeeToDelete,
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
    isSignDrawing,
    setIsSignDrawing,
    signatureSaved,
    setSignatureSaved,
    sortConfig,
    setSortConfig,
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
    <div className="space-y-12 text-left p-2 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
        <div className="border-l-4 border-indigo-600 pl-8 space-y-2">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
            STAFF <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">OPERATIONS</span>
          </h2>
          <p className="text-[10px] font-black text-slate-600 tracking-[0.4em] uppercase italic">Integrated Resource Planning & Auth</p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex bg-black/40 p-2 rounded-[2rem] border border-white/5 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl overflow-x-auto no-scrollbar">
            {[
              { id: 'info', label: 'ANALYTICS' },
              { id: 'team', label: 'ACCOUNTS' },
              { id: 'permissions', label: 'ROLES' },
              { id: 'attendance', label: 'METRICS' },
              { id: 'advances', label: 'FINANCES' }
            ].map(tab => (
              <button 
                key={tab.id}
                type="button"
                onClick={() => setHrTab(tab.id as any)} 
                className={cn(
                  "px-8 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all whitespace-nowrap active:scale-95 italic",
                  hrTab === tab.id
                    ? "bg-indigo-600 text-white shadow-neon-indigo border border-indigo-400 ring-1 ring-white/20"
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }}
            className="group relative overflow-hidden flex items-center gap-4 px-10 py-5 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-[1.75rem] transition-all hover:shadow-neon-indigo active:scale-95 shadow-2xl border border-white/10 italic"
          >
            <div className="absolute inset-0 bg-indigo-600 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
            <Plus size={20} className="relative z-10 transition-colors group-hover:text-white" strokeWidth={3} />
            <span className="relative z-10 transition-colors group-hover:text-white">ENRÔLER TALENT</span>
          </button>
        </div>
      </div>

      {hrTab === 'info' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Performance Summary Section */}
          <PerformanceSummary
            sortedEmployeesPerformance={sortedEmployeesPerformance}
            employeePerformance={employeePerformance}
            sortConfig={sortConfig}
            requestSort={requestSort}
            settings={settings}
          />

          {/* Grid of employees */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        </motion.div>
      )}

      {hrTab === 'attendance' && <AttendanceTab attendance={attendance} employees={employees} users={users} advances={advances} settings={settings} />}
      {hrTab === 'advances' && <AdvancesTab advances={advances} employees={employees} settings={settings} />}
      {hrTab === 'team' && <TeamManagement users={users} employees={employees} settings={settings} setIsAddUserModalOpen={setIsAddUserModalOpen} defaultSubTab="users" />}
      {hrTab === 'permissions' && <TeamManagement users={users} employees={employees} settings={settings} setIsAddUserModalOpen={setIsAddUserModalOpen} defaultSubTab="permissions" />}

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer l'employé"
        message={`Êtes-vous sûr de vouloir supprimer ${employeeToDelete?.name} ? Cette action supprimera son profil employé mais pas son compte d'accès s'il en a un.`}
      />

      <RecruitmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingEmployee={editingEmployee}
        handleSubmit={handleSubmit}
        recruitmentTab={recruitmentTab}
        setRecruitmentTab={setRecruitmentTab}
        formData={formData}
        setFormData={setFormData}
        settings={settings}
        cameraActiveSection={cameraActiveSection}
        startCamera={startCamera}
        stopCamera={stopCamera}
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
    </div>
  );
});

