import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase';
import { auth } from '../services/AuthService';
import { handleDatabaseError, OperationType } from '../lib/db-compat';
import { convertKeysToSnake } from '../lib/db-converters';
import { localDb } from '../services/LocalDatabase';
import { 
  Employee, Transaction, AttendanceRecord, AdvanceRecord, 
  CompanySettings, UserProfile
} from '../types';
import { getApiUrl } from '../lib/api';

// New sub-hooks & printing helper
import { useEmployeeCamera } from '../hooks/employees/useEmployeeCamera';
import { useEmployeeSignature } from '../hooks/employees/useEmployeeSignature';
import { useEmployeesStats } from '../hooks/employees/useEmployeesStats';
import { handlePrintDossier as printDossierHelper } from '../hooks/employees/printDossier';

export interface EmployeesProps {
  employees: Employee[];
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  advances: AdvanceRecord[];
  settings: CompanySettings;
  users: UserProfile[];
  setIsAddUserModalOpen: (v: boolean) => void;
}

export function useEmployeesLogic(props: EmployeesProps) {
  const { 
    employees, 
    transactions, 
    settings, 
    setIsAddUserModalOpen 
  } = props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [hrTab, setHrTab] = useState<'info' | 'attendance' | 'advances' | 'team' | 'permissions'>('info');
  const [formData, setFormData] = useState({
    name: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier' | 'delivery' | 'picker' | 'camera_agent',
    phone: '',
    email: '',
    password: '', 
    hireDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'active' as 'active' | 'inactive',
    baseSalary: 3000,
    salaryType: 'monthly' as 'monthly' | 'hourly' | 'daily',
    hourlyRate: 15,
    dailyRate: 120,
    idCardRectoUrl: '',
    idCardVersoUrl: '',
    contractUrl: '',
    digitalSignatureUrl: ''
  });

  useEffect(() => {
    if (editingEmployee) {
      setFormData({
        name: editingEmployee.name || '',
        role: editingEmployee.role || 'cashier',
        phone: editingEmployee.phone || '',
        email: editingEmployee.email || '',
        password: '', 
        hireDate: editingEmployee.hireDate || format(new Date(), 'yyyy-MM-dd'),
        status: editingEmployee.status || 'active',
        baseSalary: editingEmployee.baseSalary !== undefined ? editingEmployee.baseSalary : 3000,
        salaryType: editingEmployee.salaryType || 'monthly',
        hourlyRate: editingEmployee.hourlyRate !== undefined ? editingEmployee.hourlyRate : 15,
        dailyRate: editingEmployee.dailyRate !== undefined ? editingEmployee.dailyRate : 120,
        idCardRectoUrl: editingEmployee.idCardRectoUrl || '',
        idCardVersoUrl: editingEmployee.idCardVersoUrl || '',
        contractUrl: editingEmployee.contractUrl || '',
        digitalSignatureUrl: editingEmployee.digitalSignatureUrl || ''
      });
    } else {
      setFormData({ 
        name: '', 
        role: 'cashier', 
        phone: '', 
        email: '', 
        password: '', 
        hireDate: format(new Date(), 'yyyy-MM-dd'), 
        status: 'active',
        baseSalary: 3000,
        salaryType: 'monthly',
        hourlyRate: 15,
        dailyRate: 120,
        idCardRectoUrl: '',
        idCardVersoUrl: '',
        contractUrl: '',
        digitalSignatureUrl: ''
      });
    }
  }, [editingEmployee]);

  const [recruitmentTab, setRecruitmentTab] = useState<'info' | 'identity' | 'contract'>('info');
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Hook 1: Camera captures and uploads
  const {
    cameraActiveSection,
    setCameraActiveSection,
    videoRef,
    startCamera,
    stopCamera,
    takePhoto,
    handleFileUpload
  } = useEmployeeCamera({ setFormData, isModalOpen });

  // Hook 2: Signature hand-drawn canvas input
  const {
    isSignDrawing,
    setIsSignDrawing,
    canvasRef,
    startDrawing,
    drawSign,
    endDrawing,
    clearCanvas,
    saveSignature
  } = useEmployeeSignature({ setFormData, setSignatureSaved });

  // Hook 3: Interactive metrics computations and list sorting
  const {
    sortConfig,
    setSortConfig,
    requestSort,
    employeePerformance,
    sortedEmployeesPerformance
  } = useEmployeesStats({ employees, transactions });

  useEffect(() => {
    if (isModalOpen) {
      setRecruitmentTab('info');
      setSignatureSaved(false);
    } else {
      stopCamera();
    }
  }, [isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      alert("Tous les champs marqués d'une étoile (*) sont obligatoires.");
      return;
    }

    try {
      const { password, ...rawDatabaseData } = formData;
      
      const databaseData = {
        ...rawDatabaseData,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone
      };
      
      let docId = editingEmployee?.id;
      
      if (editingEmployee) {
        await localDb.update(`employees/${editingEmployee.id}`, databaseData);
      } else {
        const newId = Math.random().toString(36).substring(2, 10);
        await localDb.insert(`employees/${newId}`, { id: newId, ...databaseData });
        docId = newId;
      }

      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      handleDatabaseError(error, editingEmployee ? OperationType.UPDATE : OperationType.CREATE, 'employees');
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    
    const hasTransactions = transactions.some(t => t.employeeId === employeeToDelete.id);
    const hasAttendance = props.attendance?.some(a => a.employeeId === employeeToDelete.id);
    
    if (hasTransactions || hasAttendance) {
      const confirmDeactivate = window.confirm(
        `⚠️ Impossible de supprimer définitivement "${employeeToDelete.name}" car des ventes ou pointages y sont associés.\n\nVoulez-vous désactiver son profil (passer son statut à "Inactif") à la place ?`
      );
      if (confirmDeactivate) {
        try {
          await localDb.update(`employees/${employeeToDelete.id}`, { status: 'inactive' });
          setIsDeleteConfirmOpen(false);
          setEmployeeToDelete(null);
        } catch (error: any) {
          alert("Erreur lors de la désactivation: " + error.message);
        }
      } else {
        setIsDeleteConfirmOpen(false);
        setEmployeeToDelete(null);
      }
      return;
    }

    try {
      await localDb.delete(`employees/${employeeToDelete.id}`);
      setIsDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    } catch (error: any) {
      alert("Erreur lors de la suppression: " + error.message);
    }
  };

  const handlePrintDossier = (employee: Employee) => {
    printDossierHelper(employee, settings);
  };

  return {
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
  };
}

