import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'motion/react';
import { 
  History, FileSpreadsheet, Lock, UserCog, UserPlus, Trash2, Edit, CheckSquare, Search, Award, DollarSign, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { localDb } from '../../services/LocalDatabase';
import { Employee, AttendanceRecord, AdvanceRecord, CompanySettings, UserProfile } from '../../types';
import { Card } from '../ui';
import { cn, formatSafe } from '../../lib/utils';
import { printPayslip, generateWhatsAppMessage } from './payrollHelpers';
import { ExpressClockIn } from './ExpressClockIn';
import { PayrollReportModal } from './PayrollReportModal';

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

  const handleClockOut = async (id: string) => {
    try {
      await localDb.update(`attendance/${id}`, {
        clockOut: new Date().toISOString()
      });
    } catch (error: any) {
      alert("Erreur: " + error.message);
    }
  };

  const handleExpressClockIn = async (employeeId: string) => {
    try {
      const targetUser = users.find(u => u.employeeId === employeeId);
      const targetEmp = employees.find(e => e.id === employeeId);
      const now = new Date();
      const newId = Math.random().toString(36).substring(2, 10);
      await localDb.insert(`attendance/${newId}`, {
        id: newId,
        userId: targetUser?.uid || null,
        employeeId: employeeId,
        employeeName: targetEmp?.name || 'Inconnu',
        date: format(now, 'yyyy-MM-dd'),
        clockIn: now.toISOString(),
        status: 'present'
      });
    } catch (error: any) {
      alert("Erreur: " + error.message);
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
      alert("Aucune donnée à exporter.");
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

      <div className="flex flex-col xl:flex-row justify-between items-end gap-6 mt-12 bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5">
        <div>
          <h4 className="font-black text-white italic uppercase tracking-wider flex items-center gap-2">
            <History size={18} className="text-indigo-400" />
            Historique de Pointage
          </h4>
          <p className="text-[10px] font-black text-white/30 tracking-[0.2em] mt-1 uppercase">ARCHIVE & VERIFIED RECORDS</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="flex flex-col gap-2 shrink-0">
            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Période</label>
            <input 
              type="month" 
              className="px-6 py-3 bg-black/40 border border-white/10 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Employé</label>
            <select
              className="px-6 py-3 bg-black/40 border border-white/10 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={selectedEmployeeFilter}
              onChange={e => setSelectedEmployeeFilter(e.target.value)}
            >
              <option value="all">TOUS LES EMPLOYÉS</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 items-center pt-5 sm:pt-0">
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-indigo-500/20"
              title="Exporter l'historique en format tableur CSV"
            >
              <FileSpreadsheet size={14} /> EXPORTER CSV
            </button>
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
              title="Générer les bulletins de paie et les rapports mensuels"
            >
              <DollarSign size={14} /> BULLETIN & PAIE
            </button>
          </div>
        </div>
      </div>
      
      <Card className="overflow-hidden border-white/5 bg-white/5 backdrop-blur-md rounded-[2.5rem] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-white/30 uppercase border-b border-white/5">
                <th className="p-6 text-[10px] font-black tracking-[0.2em]">EMPLOYÉ</th>
                <th className="p-6 text-[10px] font-black tracking-[0.2em]">DATE</th>
                <th className="p-6 text-[10px] font-black tracking-[0.2em]">ARRIVÉE</th>
                <th className="p-6 text-[10px] font-black tracking-[0.2em]">DÉPART</th>
                <th className="p-6 text-[10px] font-black tracking-[0.2em]">DURÉE</th>
                <th className="p-6 text-[10px] font-black tracking-[0.2em]">STATUT</th>
                <th className="p-6 text-[10px] font-black tracking-[0.2em] text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAttendance.map((record, idx) => {
                const emp = employees.find(e => e.id === record.employeeId);
                let hoursWorked = '-';
                if (record.clockIn && record.clockOut) {
                   const durationMs = new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime();
                   const hours = durationMs / (1000 * 60 * 60);
                   hoursWorked = hours > 0 ? hours.toFixed(2) + 'h' : '-';
                }
                return (
                  <motion.tr 
                    key={record.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-6 font-black text-[11px] text-white">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-xs text-indigo-400 font-black uppercase border border-white/10 shadow-lg group-hover:border-indigo-500 transition-colors">
                          {(emp?.name || record.employeeName || '?').charAt(0)}
                        </div>
                        <div className="flex flex-col">
                           <span className="uppercase tracking-widest">{emp?.name || record.employeeName || 'Inconnu'}</span>
                           <span className="text-[9px] text-white/20 tracking-[0.2em]">ID: {record.employeeId.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-[11px] text-white/60 font-black tracking-[0.1em]">{format(new Date(record.date), 'dd MMMM yyyy', { locale: fr }).toUpperCase()}</td>
                    <td className="p-6">
                       <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-sm tracking-tighter border border-emerald-500/10">
                          {formatSafe(record.clockIn, 'HH:mm')}
                       </span>
                    </td>
                    <td className="p-6">
                       {record.clockOut ? (
                         <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 font-black text-sm tracking-tighter border border-rose-500/10">
                            {formatSafe(record.clockOut, 'HH:mm')}
                         </span>
                       ) : (
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic animate-pulse">Running...</span>
                       )}
                    </td>
                    <td className="p-6 text-base font-black text-indigo-400 tracking-tighter">{hoursWorked}</td>
                    <td className="p-6">
                      <span className={cn("px-4 py-1.5 text-[9px] font-black rounded-full uppercase tracking-[0.2em] border shadow-xl flex items-center gap-2 w-fit", 
                        record.status === 'present' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        record.status === 'late' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", record.status === 'present' ? "bg-emerald-400" : record.status === 'late' ? "bg-amber-400" : "bg-rose-400")} />
                        {record.status === 'present' ? 'PRÉSENT' : record.status === 'late' ? 'EN RETARD' : record.status === 'absent' ? 'ABSENT' : 'PRÉSENT'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      {!record.clockOut && record.status !== 'absent' && (
                        <button 
                          onClick={() => handleClockOut(record.id)} 
                          className="px-6 py-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95"
                        >
                          POINTER SORTIE
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-white/20 mb-4">
                        <Calendar size={32} />
                      </div>
                      <p className="font-black text-white uppercase tracking-widest">Aucun pointage archivé</p>
                      <p className="text-[10px] font-black text-white/30 uppercase mt-2 tracking-widest italic">Nexus pointage system v4.0</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
