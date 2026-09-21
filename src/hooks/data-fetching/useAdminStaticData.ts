import { useEffect } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { convertKeysToCamel, TABLE_COLUMNS } from '../../lib/db-converters';
import { CompanySettings, Employee, InvoicePattern, SupplierSync, UserProfile } from '../../types';
import { safeOptionalQuery } from '../../lib/supabase/safeOptional';
import { setLocalState, saveStateToStorage } from '../../lib/local-db';
import { usePeopleStore } from '../../store/usePeopleStore';
import { withNetworkTimeout } from '../../services/networkErrorHandler';

interface useAdminStaticDataParams {
  loading: boolean;
  appMode: string;
  userId: string | undefined;
  userRole: string | undefined;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  setPatterns: React.Dispatch<React.SetStateAction<InvoicePattern[]>>;
  setSupplierSyncs: React.Dispatch<React.SetStateAction<SupplierSync[]>>;
}

export function useAdminStaticData({
  loading,
  appMode,
  userId,
  userRole,
  setSettings,
  setEmployees,
  setPatterns,
  setSupplierSyncs
}: useAdminStaticDataParams) {
  useEffect(() => {
    if (loading) return;
    if (appMode !== 'price_checker' && !userId) return;

    let isSubscribed = true;

    const fetchStaticData = async () => {
      try {
        const cachedSettingsSnap = await localDb.get('settings/company');
        if (cachedSettingsSnap.exists() && isSubscribed) {
          setSettings(cachedSettingsSnap.val() as CompanySettings);
        }

        const cachedEmployees = await idbGet<Employee[]>('nexus_employees_cache');
        if (cachedEmployees && isSubscribed) setEmployees(cachedEmployees);

        if (isSupabaseConfigured) {
          try {
            const empCols = TABLE_COLUMNS['employees'] ? TABLE_COLUMNS['employees'].join(',') : '*';
            const syncsCols = TABLE_COLUMNS['supplier_syncs'] ? TABLE_COLUMNS['supplier_syncs'].join(',') : '*';
            const settingsCols = TABLE_COLUMNS['settings'] ? TABLE_COLUMNS['settings'].join(',') : '*';
            const patCols = TABLE_COLUMNS['invoice_patterns'] ? TABLE_COLUMNS['invoice_patterns'].join(',') : '*';
            const patDataPromise = userRole === 'admin'
              ? withNetworkTimeout(
                  safeOptionalQuery<any[]>(
                    'invoice_patterns.fetch',
                    () => supabase.from('invoice_patterns').select(patCols),
                    [],
                    { module: 'useAdminStaticData' }
                  ),
                  5000,
                  [],
                  'invoice_patterns'
                )
              : Promise.resolve([] as any[]);

            const settingsPromise = withNetworkTimeout(
              supabase.from('settings').select(settingsCols).then(async (res: any) => {
                if (res.error) {
                  return supabase.from('settings').select('*');
                }
                return res;
              }),
              5000,
              { data: null, error: null },
              'settings'
            );

            const employeesPromise = withNetworkTimeout(
              supabase.from('employees').select(empCols),
              5000,
              { data: null, error: null },
              'employees'
            );

            const syncsPromise = userRole === 'admin' 
              ? withNetworkTimeout(
                  supabase.from('supplier_syncs').select(syncsCols),
                  5000,
                  { data: null, error: null },
                  'supplier_syncs'
                )
              : Promise.resolve({ data: null, error: null });

            const [
              employeesRes, patternsData, syncsRes, settingsRes
            ] = await Promise.all([
              employeesPromise,
              patDataPromise,
              syncsPromise,
              settingsPromise
            ]);
            
            if (isSubscribed) {
              if (employeesRes.data && Array.isArray(employeesRes.data)) {
                const updatedEmployees = employeesRes.data.map((item: any) => convertKeysToCamel(item) as Employee);
                if (updatedEmployees.length > 0) {
                  setEmployees(updatedEmployees);
                  idbSet('nexus_employees_cache', updatedEmployees);
                }
              }
              if (patternsData && Array.isArray(patternsData)) {
                setPatterns(patternsData.map((item: any) => convertKeysToCamel(item) as InvoicePattern));
              }
              if (syncsRes.data && Array.isArray(syncsRes.data)) {
                setSupplierSyncs(syncsRes.data.map((item: any) => convertKeysToCamel(item) as SupplierSync));
              }
              if (settingsRes.data && settingsRes.data.length > 0) {
                const companyRow = settingsRes.data.find((r: any) => r.id === 'company') || settingsRes.data[0];
                if (companyRow) {
                  const jsonFields = ['site_locations', 'role_kpis', 'notifications', 'operational_costs', 'delivery_zones', 'api_keys', 'available_taxes', 'loyalty_tiers', 'role_permissions', 'favorite_category_ids', 'quick_select_groups'];
                  jsonFields.forEach(field => {
                    if (companyRow[field] && typeof companyRow[field] === 'string') {
                      try { companyRow[field] = JSON.parse(companyRow[field]); } catch (e) {}
                    }
                  });
                  const camelSettings = convertKeysToCamel(companyRow) as CompanySettings;
                  setSettings(prev => ({ ...prev, ...camelSettings }));
                  setLocalState('settings/company', camelSettings);
                  saveStateToStorage('settings');
                }
              }
            }
          } catch (e) {
            console.warn('[useDataFetching] Static Supabase fetch handled:', e);
          }
        }

        // Always merge local ground truth from localDb
        const [
          employeesSnap, usersSnap, patternsSnap, syncsSnap, settingsSnap
        ] = await Promise.all([
          localDb.get('employees'),
          localDb.get('users'),
          userRole === 'admin' ? localDb.get('invoicePatterns') : Promise.resolve({ exists: () => false } as any),
          userRole === 'admin' ? localDb.get('supplierSyncs') : Promise.resolve({ exists: () => false } as any),
          localDb.get('settings/company')
        ]);

        if (!isSubscribed) return;

        if (settingsSnap.exists()) setSettings(settingsSnap.val() as CompanySettings);

        const employeesData = employeesSnap.val();
        const employeesDocs = employeesData ? Object.keys(employeesData).map(id => ({ id, ...employeesData[id] } as Employee)) : [];
        if (employeesDocs.length > 0) {
          setEmployees(prev => {
            const map = new Map<string, Employee>();
            (Array.isArray(prev) ? prev : []).forEach(e => map.set(e.id, e));
            employeesDocs.forEach(e => map.set(e.id, e));
            return Array.from(map.values());
          });
          idbSet('nexus_employees_cache', employeesDocs);
        }

        const usersData = usersSnap?.val?.();
        if (usersData && typeof usersData === 'object') {
          const usersDocs = Object.keys(usersData).map(id => ({ id, ...usersData[id] } as UserProfile));
          if (usersDocs.length > 0) {
            usePeopleStore.getState().setUsers(prev => {
              const map = new Map<string, UserProfile>();
              (Array.isArray(prev) ? prev : []).forEach(u => map.set(u.id || u.uid, u));
              usersDocs.forEach(u => map.set(u.id || u.uid, u));
              return Array.from(map.values());
            });
          }
        }

        if (patternsSnap.exists() && !isSupabaseConfigured) {
          const patternsData = patternsSnap.val();
          setPatterns(Object.keys(patternsData).map(id => ({ id, ...patternsData[id] } as InvoicePattern)));
        }
        if (syncsSnap.exists() && !isSupabaseConfigured) {
          const syncsData = syncsSnap.val();
          setSupplierSyncs(Object.keys(syncsData).map(id => ({ id, ...syncsData[id] } as SupplierSync)));
        }
      } catch (err) {
        console.warn("Static data fetch failed:", err);
      }
    };

    fetchStaticData();

    return () => {
      isSubscribed = false;
    };
  }, [loading, appMode, userId, userRole]);
}
