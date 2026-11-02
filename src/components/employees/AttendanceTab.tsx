import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { localDb } from '../../services/LocalDatabase';
import { Employee, AttendanceRecord, AdvanceRecord, CompanySettings, UserProfile } from '../../types';
import { formatSafe, generateUniqueId } from '../../lib/utils';
import { toast } from 'sonner';
import { printPayslip, generateWhatsAppMessage } from './payrollHelpers';
import { ExpressClockIn } from './ExpressClockIn';
import { PayrollReportModal } from './PayrollReportModal';
import { AttendanceFiltersBar } from './attendance/AttendanceFiltersBar';
import { AttendanceHistoryTable } from './attendance/AttendanceHistoryTable';
import { useInventoryStore } from '../../store/useInventoryStore';

export const AttendanceTab = memo(function AttendanceTab({ 
  attendance, 
  employees, 
  users, 
  advances = [], 
  settings 
}: { 
  attendance: AttendanceRecord[], 
  employees: Employee[], 
  users: UserProfile[], 
  advances?: AdvanceRecord[], 
  settings: CompanySettings 
}) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');

  // Payslip module state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [salaryEmployeeId, setSalaryEmployeeId] = useState('');
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [bonusReason, setBonusReason] = useState<string>('');
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [penaltyReason, setPenaltyReason] = useState<string>('');

  useEffect(() => {
    if (employees.length > 0 && !salaryEmployeeId) {
      setSalaryEmployeeId(employees[0].id);
    }
  }, [employees, salaryEmployeeId]);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const snap = await localDb.get('attendance');
        if (snap.exists()) {
          const val = snap.val();
          const list = Object.keys(val).map(k => ({ id: k, ...val[k] }));
          useInventoryStore.getState().setAttendance(list);
        }
      } catch (e) {
        console.warn("Failed to load attendance:", e);
      }
    };
    loadAttendance();
  }, []);

  const handleClockOut = async (id: string) => {
    try {
      const nowIso = new Date().toISOString();
      await localDb.update(`attendance/${id}`, {
        clockOut: nowIso
      });
      useInventoryStore.getState().setAttendance(prev => 
        (Array.isArray(prev) ? prev : []).map(r => r.id === id ? { ...r, clockOut: nowIso } : r)
      );
      toast.success("Pointage de départ enregistré avec succès !");
    } catch (error: any) {
      toast.error("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  const handleExpressClockIn = async (employeeId: string) => {
    try {
      const targetUser = users.find(u => u.employeeId === employeeId);
      const targetEmp = employees.find(e => e.id === employeeId);
      const now = new Date();
      const newId = generateUniqueId();
      const newRecord = {
        id: newId,
        userId: targetUser?.uid,
        employeeId: employeeId,
        employeeName: targetEmp?.name || 'Inconnu',
        date: format(now, 'yyyy-MM-dd'),
        clockIn: now.toISOString(),
        status: 'present' as const
      };
      await localDb.insert(`attendance/${newId}`, newRecord);
      useInventoryStore.getState().setAttendance(prev => [newRecord, ...(Array.isArray(prev) ? prev : [])]);
      toast.success("Pointage d'arrivée express enregistré !");
    } catch (error: any) {
      toast.error("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecords = attendance.filter(r => r.date === todayStr);

  const filteredAttendance = attendance
    .filter(record => {
      const recordMonth = record.date.substring(0, 7);
      if (recordMonth !== selectedMonth) return false;
      if (selectedEmployeeFilter !== 'all' && record.employeeId !== selectedEmployeeFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Dynamic Payroll calculation engine
  const computedPayroll = useMemo(() => {
    const targetEmpId = salaryEmployeeId || (employees[0]?.id || '');
    if (!targetEmpId) return null;

    const emp = employees.find(e => e.id === targetEmpId);
    if (!emp) return null;

    const empAttendance = attendance.filter(r => r.employeeId === targetEmpId && r.date.substring(0, 7) === selectedMonth);
    const workedDays = empAttendance.length;
    const latenessCount = empAttendance.filter(r => r.status === 'late').length;

    const totalHoursWorked = empAttendance.reduce((acc, r) => {
      if (r.clockIn && r.clockOut) {
        const dur = (new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / (1000 * 60 * 60);
        return acc + (dur > 0 ? dur : 0);
      }
      return acc;
    }, 0);

    const empAdvances = advances.filter(a => a.employeeId === targetEmpId && a.date.substring(0, 7) === selectedMonth && (a.status === 'approved' || a.status === 'paid'));
    const advancesTotal = empAdvances.reduce((acc, a) => acc + (a.amount || 0), 0);

    let calculatedSalary = emp.baseSalary !== undefined ? emp.baseSalary : 3000;
    let salaryTypeLabel = 'Mensuel Fixe';
    let salaryBasisText = `Fixe`;

    if (emp.salaryType === 'hourly') {
      const rate = emp.hourlyRate !== undefined ? emp.hourlyRate : 15;
      calculatedSalary = totalHoursWorked * rate;
      salaryTypeLabel = 'Taux Horaire';
      salaryBasisText = `${totalHoursWorked.toFixed(2)}h @ ${rate.toFixed(2)} ${settings.currency}/h`;
    } else if (emp.salaryType === 'daily') {
      const rate = emp.dailyRate !== undefined ? emp.dailyRate : 120;
      calculatedSalary = workedDays * rate;
      salaryTypeLabel = 'Taux Journalier';
      salaryBasisText = `${workedDays} j @ ${rate.toFixed(2)} ${settings.currency}/j`;
    } else {
      salaryBasisText = `Fixe ${calculatedSalary.toFixed(2)} ${settings.currency}/m`;
    }

    return {
      employee: emp,
      role: emp.role || 'Personnel',
      salaryTypeLabel,
      salaryBasisText,
      calculatedSalary,
      workedDays,
      totalHoursWorked,
      latenessCount,
      advancesTotal,
      empAdvances
    };
  }, [salaryEmployeeId, selectedMonth, attendance, employees, advances, settings]);

  const handleExportCSV = () => {
    if (filteredAttendance.length === 0) {
      toast.info("Aucune donnée à exporter.");
      return;
    }

    const headers = ["Employe", "Email", "Date", "Heure Arrivee", "Heure Depart", "Duree (heures)", "Statut"];
    const csvContent = [
      headers.join(","),
      ...filteredAttendance.map(record => {
        const emp = employees.find(e => e.id === record.employeeId);
        let durationStr = '0';
        if (record.clockIn && record.clockOut) {
          const durationMs = new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime();
          durationStr = (durationMs / (1000 * 60 * 60)).toFixed(2);
        }

        const empName = emp?.name || record.employeeName || 'Inconnu';
        const empEmail = emp?.email || 'N/A';
        const arrTime = record.clockIn ? formatSafe(record.clockIn, 'HH:mm') : '-';
        const depTime = record.clockOut ? formatSafe(record.clockOut, 'HH:mm') : '-';
        const statusStr = record.status === 'present' ? 'PRESENT' : record.status === 'late' ? 'RETARD' : 'ABSENT';

        return [
          `"${empName.replace(/"/g, '""')}"`,
          `"${empEmail.replace(/"/g, '""')}"`,
          `"${record.date}"`,
          `"${arrTime}"`,
          `"${depTime}"`,
          durationStr,
          statusStr
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nexus_pointage_${selectedMonth}_${selectedEmployeeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPayslip = () => {
    if (!computedPayroll) return;
    printPayslip(computedPayroll, settings, bonusAmount, bonusReason, penaltyAmount, penaltyReason, selectedMonth);
  };

  const handleWhatsAppShare = () => {
    if (!computedPayroll) return;
    const message = generateWhatsAppMessage(computedPayroll, settings, bonusAmount, bonusReason, penaltyAmount, penaltyReason, selectedMonth);
    const encodedText = encodeURIComponent(message);
    const phone = computedPayroll.employee.phone ? computedPayroll.employee.phone.replace(/\s+/g, '') : '';
    
    let whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    if (phone) {
      whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
    }
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Pointage Express Section */}
      <ExpressClockIn
        employees={employees}
        todayRecords={todayRecords}
        handleClockOut={handleClockOut}
        handleExpressClockIn={handleExpressClockIn}
      />

      {/* Barre de filtres et boutons d'actions */}
      <AttendanceFiltersBar
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedEmployeeFilter={selectedEmployeeFilter}
        setSelectedEmployeeFilter={setSelectedEmployeeFilter}
        employees={employees}
        onExportCSV={handleExportCSV}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />
      
      {/* Table d'historique de pointage */}
      <AttendanceHistoryTable
        filteredAttendance={filteredAttendance}
        employees={employees}
        handleClockOut={handleClockOut}
      />

      {/* Modern Payroll & Bulletins Report Modal */}
      {isReportModalOpen && (
        <PayrollReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          employees={employees}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          salaryEmployeeId={salaryEmployeeId}
          setSalaryEmployeeId={setSalaryEmployeeId}
          computedPayroll={computedPayroll}
          bonusAmount={bonusAmount}
          setBonusAmount={setBonusAmount}
          bonusReason={bonusReason}
          setBonusReason={setBonusReason}
          penaltyAmount={penaltyAmount}
          setPenaltyAmount={setPenaltyAmount}
          penaltyReason={penaltyReason}
          setPenaltyReason={setPenaltyReason}
          handlePrintPayslip={handlePrintPayslip}
          handleWhatsAppShare={handleWhatsAppShare}
          settings={settings}
        />
      )}
    </motion.div>
  );
});
