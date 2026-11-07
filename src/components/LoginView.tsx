import React from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { localDb } from '../services/LocalDatabase';
import { usePeopleStore } from '../store/usePeopleStore';
import {
  LoginHeader,
  LoginIdentifierForm,
  LoginPinPad,
  LoginAlternatives
} from './login';

interface LoginViewProps {
  loginIdentifier: string;
  setLoginIdentifier: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isLoggingIn: boolean;
  authError: any;
  setAuthError: (val: any) => void;
  handleIdentifierLogin: (identifier: string, password: string) => void;
  handleLogin: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  isLangMenuOpen: boolean;
  setIsLangMenuOpen: (val: boolean) => void;
  t: (key: string) => string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  loginIdentifier,
  setLoginIdentifier,
  loginPassword,
  setLoginPassword,
  showPassword,
  setShowPassword,
  isLoggingIn,
  authError,
  setAuthError,
  handleIdentifierLogin,
  handleLogin,
  language,
  setLanguage,
  isLangMenuOpen,
  setIsLangMenuOpen,
  t
}) => {
  const [loginMode, setLoginMode] = React.useState<'identifier' | 'pin'>('identifier');
  const [localUsers, setLocalUsers] = React.useState<any[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<any | null>(null);
  const [pinCode, setPinCode] = React.useState<string>('');

  const uniqueLocalUsers = React.useMemo(() => {
    const seen = new Set<string>();
    return localUsers.filter((u: any) => {
      const key = String(u?.uid || u?.id || u?.email || u?.phone || '').trim();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localUsers]);

  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        const [usersSnap, empSnap] = await Promise.all([
          localDb.get('users'),
          localDb.get('employees')
        ]);
        const usersObj = (usersSnap?.exists() && usersSnap?.val()) ? usersSnap.val() : {};
        const empObj = (empSnap?.exists() && empSnap?.val()) ? empSnap.val() : {};
        const combined = [
          ...Object.values(usersObj),
          ...Object.values(empObj),
          ...(usePeopleStore.getState().users || []),
          ...(usePeopleStore.getState().employees || [])
        ];
        if (combined.length > 0) {
          const list = combined.filter((u: any) => u && typeof u === 'object' && u.role !== 'customer' && u.role !== 'supplier');
          setLocalUsers(list);
          // Si des utilisateurs locaux existent et aucun mode sélectionné, on peut suggérer le mode PIN
          if (list.length > 0) {
            setLoginMode('pin');
          }
        }
      } catch (e) {
        console.warn("Failed to load local users for PIN login:", e);
      }
    };
    loadUsers();
  }, []);

  const handleKeypadPress = (val: string) => {
    if (isLoggingIn) return;
    setAuthError(null);
    // Harmonisation : supporte jusqu'à 8 chiffres numériques
    if (pinCode.length >= 8) return;
    setPinCode(prev => prev + val);
  };

  const handleKeypadBackspace = () => {
    if (isLoggingIn) return;
    setPinCode(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    if (isLoggingIn) return;
    setPinCode('');
  };

  const handlePinSubmit = () => {
    if (isLoggingIn || !selectedUser || pinCode.length < 4 || pinCode.length > 8) return;
    
    const identifier = selectedUser.email || selectedUser.phone || selectedUser.displayName || selectedUser.name || selectedUser.uid || selectedUser.id;
    setLoginIdentifier(identifier);
    setLoginPassword(pinCode);

    handleIdentifierLogin(identifier, pinCode);
  };

  React.useEffect(() => {
    if (loginMode !== 'pin' || !selectedUser || isLoggingIn) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeypadBackspace();
      } else if (e.key === 'Escape') {
        handleKeypadClear();
      } else if (e.key === 'Enter') {
        if (pinCode.length >= 4 && pinCode.length <= 8) {
          handlePinSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMode, selectedUser, pinCode, isLoggingIn]);

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.12)]',
          badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        };
      case 'manager':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.12)]',
          badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
        };
      case 'cashier':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
          badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        };
      default:
        return {
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.12)]',
          badge: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
        };
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-4 sm:p-6 relative select-none overflow-x-hidden">
      {/* Halo d'ambiance moderne en arrière-plan */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <LoginHeader
        language={language}
        setLanguage={setLanguage}
        isLangMenuOpen={isLangMenuOpen}
        setIsLangMenuOpen={setIsLangMenuOpen}
        t={t}
      />

      <main className="w-full max-w-md bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-2xl rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/60 space-y-5 relative z-10">
        {/* Sélecteur d'onglets moderne : PIN Caisse vs Identifiants */}
        <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-800/80 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => {
              setLoginMode('pin');
              setAuthError(null);
              setPinCode('');
              setSelectedUser(null);
            }}
            className={cn(
              "flex-1 py-2.5 rounded-lg font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-2",
              loginMode === 'pin'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <KeyRound size={14} />
            <span>{t("Code PIN Caisse")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginMode('identifier');
              setAuthError(null);
            }}
            className={cn(
              "flex-1 py-2.5 rounded-lg font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-2",
              loginMode === 'identifier'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Lock size={14} />
            <span>{t("Identifiants")}</span>
          </button>
        </div>

        {/* Mode 1 : Connexion Rapide par PIN */}
        {loginMode === 'pin' ? (
          <LoginPinPad
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            uniqueLocalUsers={uniqueLocalUsers}
            pinCode={pinCode}
            setPinCode={setPinCode}
            isLoggingIn={isLoggingIn}
            authError={authError}
            setAuthError={setAuthError}
            handleKeypadPress={handleKeypadPress}
            handleKeypadBackspace={handleKeypadBackspace}
            handleKeypadClear={handleKeypadClear}
            handlePinSubmit={handlePinSubmit}
            getRoleStyle={getRoleStyle}
            t={t}
          />
        ) : (
          /* Mode 2 : Identifiant & Mot de Passe */
          <LoginIdentifierForm
            loginIdentifier={loginIdentifier}
            setLoginIdentifier={setLoginIdentifier}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isLoggingIn={isLoggingIn}
            authError={authError}
            handleIdentifierLogin={handleIdentifierLogin}
            t={t}
          />
        )}

        {/* Alternatives Sécurisées & Footer (Zero Backdoor) */}
        <LoginAlternatives
          handleLogin={handleLogin}
          isLoggingIn={isLoggingIn}
        />
      </main>
    </div>
  );
};
