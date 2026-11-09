import React, { useEffect } from 'react';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider } from '../services/AuthService';
import { localDb } from '../services/LocalDatabase';
import { UserProfile, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { checkIsOwner } from '../config/ownerConfig';
import { formatAuthErrorMessage } from './auth/authErrorHandler';
import { resolveEmployeeAndUser } from './auth/employeeResolver';
import { getCachedUserSession, cacheActiveOnlineSession } from './auth/sessionRestorer';

export function useAuthUser(appMode: string, setLoading: (loading: boolean) => void) {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const profile = useAuthStore(s => s.profile);
  const setProfile = useAuthStore(s => s.setProfile);
  const authError = useAuthStore(s => s.authError);
  const setAuthError = useAuthStore(s => s.setAuthError);
  const isLoggingIn = useAuthStore(s => s.isLoggingIn);
  const setIsLoggingIn = useAuthStore(s => s.setIsLoggingIn);
  const isUnauthorized = useAuthStore(s => s.isUnauthorized);
  const setIsUnauthorized = useAuthStore(s => s.setIsUnauthorized);

  useEffect(() => {
    // initialize user from offline cache once
    if (!user) {
      const { session, isOffline } = getCachedUserSession();
      if (session) {
        const isOwnerSession = checkIsOwner(session.email, session.uid) || session.role === 'admin';
        const isAdminPinUnlocked = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('nexus_admin_pin_unlocked') === 'true';
        if (isOwnerSession && !isAdminPinUnlocked && !isOffline) {
          useAuthStore.getState().setPendingAdminUnlockUser({
            uid: session.uid,
            email: session.email,
            displayName: session.displayName
          });
          setLoading(false);
        } else {
          try {
            setUser({
              uid: session.uid,
              email: session.email || null,
              displayName: session.displayName || 'Utilisateur',
              isOffline
            });
            setProfile({
              uid: session.uid,
              displayName: session.displayName || 'Utilisateur',
              email: session.email || '',
              role: session.role,
              employeeId: session.employeeId || null
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    // 1. Initial check: Try to restore offline session immediately if present
    const { session, isOffline } = getCachedUserSession();
    if (session && isOffline) {
      try {
        setUser({
          uid: session.uid,
          email: session.email || null,
          displayName: session.displayName || 'Utilisateur',
          isOffline: true
        });
        setProfile({
          uid: session.uid,
          displayName: session.displayName || 'Utilisateur',
          email: session.email || '',
          role: session.role,
          employeeId: session.employeeId || null
        });
        setIsUnauthorized(false);
        setLoading(false);
      } catch (e) {
        console.error("Failed to restore offline session", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser: any) => {
      try {
        if (!currentUser) {
          const { session, isOffline } = getCachedUserSession();
          if (session && isOffline) {
            try {
              setUser({
                uid: session.uid,
                email: session.email || null,
                displayName: session.displayName || 'Utilisateur',
                isOffline: true
              });
              setProfile({
                uid: session.uid,
                displayName: session.displayName || 'Utilisateur',
                email: session.email || '',
                role: session.role,
                employeeId: session.employeeId || null
              });
              setIsUnauthorized(false);
              setLoading(false);
              return;
            } catch (err) {}
          }
          setUser(null);
          setProfile(null);
          setIsUnauthorized(false);
          setLoading(false);
          return;
        }

        const mainEmail = currentUser.email?.toLowerCase();
        const providerEmail = currentUser.providerData?.[0]?.email?.toLowerCase();
        const matchEmail = (mainEmail || providerEmail || '').trim();
        const isOwnerLocally = checkIsOwner(matchEmail, currentUser.uid);

        // 🛡️ Step-Up 2FA Gérant : Si l'utilisateur est Propriétaire / Admin, vérifier le déverrouillage par PIN
        const isAdminPinUnlocked = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('nexus_admin_pin_unlocked') === 'true';
        if (isOwnerLocally && !isAdminPinUnlocked) {
          useAuthStore.getState().setPendingAdminUnlockUser(currentUser);
          setUser(null);
          setProfile(null);
          setIsUnauthorized(false);
          setLoading(false);
          return;
        }

        // Si le PIN est déverrouillé, on réinitialise l'attente et on valide la session
        useAuthStore.getState().setPendingAdminUnlockUser(null);
        setUser(currentUser);
        setIsUnauthorized(false);
        
        let matchPhone = null;
        if (matchEmail && matchEmail.endsWith('@nexus-pos.internal')) {
          matchPhone = matchEmail.replace('@nexus-pos.internal', '');
        }

        // Check if user is an employee (for non-owners or to get additional info)
        const { employee, employeeId } = await resolveEmployeeAndUser(matchEmail, matchPhone, currentUser.uid);

        if (!isOwnerLocally && (appMode === 'pos' || appMode === 'price_checker')) {
          if (!employee || employee.status !== 'active') {
            setIsUnauthorized(true);
            setProfile(null);
            setLoading(false);
            return;
          }
        }

        // Try to fix missing profile doc if created from AddStaff
        let userSnap = await localDb.get(`users/${currentUser.uid}`);
        let userData = userSnap.exists() ? userSnap.val() : null;
        
        if (!userData) {
          try {
            const usersSnap = await localDb.get('users');
            if (usersSnap.exists()) {
              const usersData = usersSnap.val();
              const oldUserEntry = Object.entries(usersData).find(([_, data]: [string, any]) => {
                  return (data.email && data.email.toLowerCase() === matchEmail) || 
                         (matchPhone && data.phone === matchPhone);
              });
              
              if (oldUserEntry) {
                 const [oldId, oldData] = oldUserEntry;
                 userData = { ...(oldData as any), uid: currentUser.uid };
                 await localDb.insert(`users/${currentUser.uid}`, userData);
                 
                 // Migrer les transactions de l'ancien ID utilisateur vers le nouvel ID réel pour respecter les contraintes de clés étrangères
                 try {
                   const txsSnap = await localDb.get('transactions');
                   if (txsSnap.exists()) {
                     const txsData = txsSnap.val();
                     const txsToMigrate = Object.entries(txsData).filter(([_, data]: [string, any]) => data && data.userId === oldId);
                     for (const [txId, txData] of txsToMigrate) {
                       await localDb.insert(`transactions/${txId}`, { ...(txData as any), userId: currentUser.uid });
                     }
                   }
                 } catch (migrationErr) {
                   console.warn("Erreur lors de la migration des transactions vers le nouvel ID utilisateur :", migrationErr);
                 }
  
                 await localDb.delete(`users/${oldId}`);
              } else if (employee) {
                 userData = {
                    uid: currentUser.uid,
                    displayName: employee.name,
                    email: employee.email || matchEmail || '',
                    phone: employee.phone || matchPhone || '',
                    role: employee.role,
                    employeeId: employeeId
                 };
                 await localDb.insert(`users/${currentUser.uid}`, userData);
              }
            }
          } catch (profileErr) {
            console.warn("Error fixing missing profile doc:", profileErr);
          }
        }
        
        if (isOwnerLocally) {
          setIsUnauthorized(false);
        }
 
        // Aggressive role override for owner
        const currentRole: UserRole = isOwnerLocally ? 'admin' : (employee?.role || (userData ? (userData as UserProfile).role : (currentUser.role || 'cashier')));
        
        // Cache the successful online session to avoid loading spinners on start
        cacheActiveOnlineSession({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Utilisateur',
          role: currentRole,
          employeeId: employeeId || null,
          isOffline: false
        });
        
        if (userData) {
          const existingProfile = userData as UserProfile;
          const currentEmployeeId = isOwnerLocally ? null : (employeeId || null);
          
          const needsUpdate = existingProfile.role !== currentRole || 
                             existingProfile.employeeId !== currentEmployeeId || 
                             (isOwnerLocally && existingProfile.role !== 'admin');
 
          if (needsUpdate) {
            try {
              await localDb.update(`users/${currentUser.uid}`, {
                role: currentRole,
                employeeId: currentEmployeeId 
              });
              const updatedProfile: UserProfile = { 
                ...existingProfile, 
                role: currentRole, 
                employeeId: currentEmployeeId 
              };
              setProfile(updatedProfile);
            } catch (error: any) {
              if (error?.message?.includes('Quota') || error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('resource-exhausted')) {
                console.warn("[Quota/Permission] Fallback profile update due to limits:", error.message);
              } else {
                console.error("Error updating user profile:", error);
              }
              setProfile({ 
                ...existingProfile, 
                role: currentRole, 
                employeeId: currentEmployeeId 
              });
            }
          } else {
            setProfile({
              ...existingProfile,
              employeeId: existingProfile.employeeId || null
            });
         }
       } else {
         const isOwner = checkIsOwner(matchEmail, currentUser.uid);
         let defaultRole: UserRole = isOwner ? 'admin' : 'cashier';
         if (appMode === 'customer') defaultRole = 'customer';
         if (appMode === 'supplier') defaultRole = 'supplier';
         
         const newProfile: UserProfile = {
           uid: currentUser.uid,
           displayName: currentUser.displayName || 'Utilisateur',
           email: currentUser.email || '',
           role: employee?.role || defaultRole,
           employeeId: employeeId || null
         };
         try {
           await localDb.insert(`users/${currentUser.uid}`, newProfile);
           setProfile(newProfile);
         } catch (error: any) {
           if (error?.message?.includes('Quota') || error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('resource-exhausted')) {
             console.warn("[Quota/Permission] Fallback profile creation due to limits:", error.message);
           } else {
             console.error("Error creating user profile:", error);
           }
           setProfile(newProfile);
         }
       }
      } catch (e: any) {
        console.warn("Auth state change error (possibly offline or quota):", e.message);
        if (currentUser && (e?.message?.includes("Quota") || e?.code === 'resource-exhausted')) {
           const isOwner = checkIsOwner(currentUser.email, currentUser.uid);
           if (isOwner) setIsUnauthorized(false);
           setProfile({
             uid: currentUser.uid,
             displayName: currentUser.displayName || 'Utilisateur Hors Ligne',
             email: currentUser.email || '',
             role: isOwner ? 'admin' : 'cashier',
             employeeId: null
           });
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [appMode, setLoading]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      handleAuthError(error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAuthError = (
    error: any,
    windowHref: string = typeof window !== 'undefined' ? window.location.href : '',
    hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''
  ) => {
    const messageNode = formatAuthErrorMessage(error, windowHref, hostname);
    if (messageNode !== null) {
      setAuthError(messageNode);
    }
  };

  return {
    handleLogin, handleAuthError
  };
}
