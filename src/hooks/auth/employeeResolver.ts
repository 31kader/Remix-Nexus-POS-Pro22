import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { convertKeysToCamel } from '../../lib/db-converters';
import { Employee } from '../../types';

export interface ResolveEmployeeResult {
  employee?: Employee;
  employeeId?: string;
}

export async function resolveEmployeeAndUser(
  matchEmail: string,
  matchPhone: string | null,
  currentUserUid: string
): Promise<ResolveEmployeeResult> {
  let employee: Employee | undefined;
  let employeeId: string | undefined;

  try {
    const employeesSnap = await localDb.get('employees');
    let employeesData: any = employeesSnap.exists() ? employeesSnap.val() : null;

    // 🛡️ REPLI SUPABASE DISTANT : Si IndexedDB est encore vierge (nouveau terminal/téléphone), interroger Supabase
    if (!employeesData && isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        const { data: remoteEmps } = await supabase
          .from('employees')
          .select('id, name, role, phone, email, hire_date, status, is_clocked_in, permissions, updated_at');
        if (Array.isArray(remoteEmps) && remoteEmps.length > 0) {
          employeesData = {};
          for (const emp of remoteEmps) {
            const camel = convertKeysToCamel(emp);
            delete camel.passwordHash;
            delete camel.password_hash;
            delete camel.password;
            delete camel.pin;
            employeesData[camel.id] = camel;
            localDb.updateLocalOnly(`employees/${camel.id}`, camel);
          }
        }
      } catch (rErr) {
        console.warn("Could not fetch remote employees:", rErr);
      }
    }

    if (employeesData) {
      const employeeEntry = Object.entries(employeesData).find(([_, data]: [string, any]) => {
        return (data.email && data.email.toLowerCase() === matchEmail) || 
               (matchPhone && data.phone === matchPhone);
      });
      if (employeeEntry) {
        const [id, data] = employeeEntry;
        employee = { id, ...(data as any) } as Employee;
        employeeId = id;
      }
    }

    // 🛡️ Deuxième vérification dans public.users si l'employé est déclaré dans users
    if (!employee && isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        const { data: remoteUsers } = await supabase
          .from('users')
          .select('id, uid, email, display_name, name, phone, role, employee_id, status, join_date, updated_at');
        if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
          for (const u of remoteUsers) {
            const camel = convertKeysToCamel(u);
            delete camel.passwordHash;
            delete camel.password_hash;
            delete camel.password;
            delete camel.pin;
            localDb.updateLocalOnly(`users/${camel.id || camel.uid}`, camel);
          }
          const matchedUser = remoteUsers.find((u: any) => 
            (u.email && u.email.toLowerCase() === matchEmail) || (u.uid === currentUserUid)
          );
          if (matchedUser) {
            employee = {
              id: matchedUser.id || matchedUser.uid,
              name: matchedUser.display_name || matchedUser.name || 'Employé',
              email: matchedUser.email,
              role: matchedUser.role || 'cashier',
              status: 'active'
            } as any;
            employeeId = employee?.id;
          }
        }
      } catch (uErr) {
        console.warn("Could not fetch remote users:", uErr);
      }
    }
  } catch (ee) {
    console.warn("Could not fetch employee status", ee);
  }

  return { employee, employeeId };
}
