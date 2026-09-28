import React from 'react';
import { 
  ShoppingCart, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Globe, 
  ShieldCheck, 
  Languages, 
  ChevronDown,
  ArrowLeft,
  Delete
} from 'lucide-react';
import { cn } from '../lib/utils';
import { get as getIDB } from 'idb-keyval';

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
        const usersObj = await getIDB('nexus_db_users');
        if (usersObj) {
          const list = Object.values(usersObj).filter((u: any) => u && u.role !== 'customer' && u.role !== 'supplier');
          setLocalUsers(list);
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
    if (pinCode.length >= 6) return;
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
    if (isLoggingIn || !selectedUser || pinCode.length < 4) return;
    
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
        if (pinCode.length >= 4) {
          handlePinSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMode, selectedUser, pinCode, isLoggingIn]);

  // Color helper for avatars and roles
  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]',
          badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        };
      case 'manager':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]',
          badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
        };
      case 'cashier':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
          badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        };
      default:
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]',
          badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        };
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-4 sm:p-6 relative select-none">
      {/* Top Bar: Language Selector & Status */}
      <div className="absolute top-5 right-5 z-20">
        <div className="relative">
          <button 
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Languages size={15} className="text-indigo-400" />
            <span>{language === 'fr' ? 'Français' : 'العربية'}</span>
            <ChevronDown size={13} className={cn("transition-transform duration-200", isLangMenuOpen && "rotate-180")} />
          </button>
          
          {isLangMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-zinc-900 border border-zinc-800 p-1.5 shadow-md z-50 animate-in fade-in zoom-in-95 duration-150">
              <button 
                type="button"
                onClick={() => { setLanguage('fr'); setIsLangMenuOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
                  language === 'fr' ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <span>Français</span>
                <span>🇫🇷</span>
              </button>
              <button 
                type="button"
                onClick={() => { setLanguage('ar'); setIsLangMenuOpen(false); }} 
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
                  language === 'ar' ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <span>العربية</span>
                <span>🇩🇿</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Login Card */}
      <main className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 sm:p-5 shadow-md space-y-6 relative">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/30 text-white mb-1">
            <ShoppingCart size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            NEXUS <span className="text-indigo-400">POS PRO</span>
          </h1>
          <p className="text-xs text-zinc-400">
            {t("Accès sécurisé au terminal de caisse")}
          </p>
        </div>

        {/* Tab Switcher: Identifiants vs PIN */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 text-xs">
          <button
            type="button"
            onClick={() => {
              setLoginMode('identifier');
              setAuthError(null);
            }}
            className={cn(
              "flex-1 py-2 rounded-lg font-bold transition-all text-center cursor-pointer",
              loginMode === 'identifier'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            )}
          >
            {t("Identifiants")}
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('pin');
              setAuthError(null);
              setPinCode('');
              setSelectedUser(null);
            }}
            className={cn(
              "flex-1 py-2 rounded-lg font-bold transition-all text-center cursor-pointer",
              loginMode === 'pin'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            )}
          >
            {t("Code PIN")}
          </button>
        </div>

        {/* Mode 1 : Identifiant & Mot de Passe */}
        {loginMode === 'identifier' ? (
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleIdentifierLogin(loginIdentifier, loginPassword); 
            }} 
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="login-identifier-input" className="text-xs font-semibold text-zinc-400">
                {t("E-mail ou Identifiant")}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="login-identifier-input"
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                  placeholder="nom@exemple.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password-input" className="text-xs font-semibold text-zinc-400">
                {t("Mot de passe")}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="login-password-input"
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
                  title={showPassword ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2.5">
                <ShieldCheck size={16} className="shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{t("Se connecter")}</span>
              )}
            </button>
          </form>
        ) : (
          /* Mode 2 : Connexion PIN Rapide */
          <div className="space-y-4">
            {!selectedUser ? (
              /* Étape 1 : Choix de l'utilisateur */
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-400">
                  {t("Sélectionnez votre compte :")}
                </p>
                {uniqueLocalUsers.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {uniqueLocalUsers.map((user) => {
                      const style = getRoleStyle(user.role);
                      const displayName = user.displayName || user.name || 'Utilisateur';
                      const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <button
                          key={user.uid || user.id || user.email || user.phone}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setPinCode('');
                            setAuthError(null);
                          }}
                          className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs mb-2 transition-transform group-hover:scale-105", style.bg)}>
                            {initials}
                          </div>
                          <span className="text-xs font-bold text-white truncate max-w-full">
                            {displayName}
                          </span>
                          <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5", style.badge)}>
                            {user.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-500 text-xs space-y-2">
                    <p>Aucun utilisateur en mémoire locale.</p>
                    <p className="text-[11px] text-zinc-600">Connectez-vous une première fois avec vos identifiants pour enregistrer votre profil.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Étape 2 : Pavé PIN de l'utilisateur sélectionné */
              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  handlePinSubmit(); 
                }} 
                className="space-y-4"
              >
                {/* Utilisateur actif avec bouton retour */}
                <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs", getRoleStyle(selectedUser.role).bg)}>
                      {(selectedUser.displayName || selectedUser.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">
                        {selectedUser.displayName || selectedUser.name}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-semibold uppercase">
                        {selectedUser.role}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setPinCode('');
                    }}
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 hover:text-white rounded-xl text-zinc-400 transition-all cursor-pointer"
                    title="Changer de profil"
                  >
                    <ArrowLeft size={16} />
                  </button>
                </div>

                {/* Bulles d'indicateur du PIN */}
                <div className="flex justify-center gap-3 py-1">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border-2 transition-all duration-200",
                        pinCode.length > idx 
                          ? "bg-indigo-500 border-indigo-500 scale-110 shadow-sm shadow-indigo-500/50" 
                          : "border-zinc-700 bg-transparent"
                      )}
                    />
                  ))}
                </div>

                {authError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                    <ShieldCheck size={15} className="shrink-0 text-rose-500" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Pavé numérique tactile 3x4 compact */}
                <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-12 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 active:scale-95 text-lg font-bold text-white transition-all font-mono cursor-pointer flex items-center justify-center shadow-sm"
                    >
                      {num}
                    </button>
                  ))}
                  
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="h-12 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 active:scale-95 text-[11px] font-bold text-zinc-500 transition-all cursor-pointer flex items-center justify-center"
                  >
                    {t("Effacer")}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 active:scale-95 text-lg font-bold text-white transition-all font-mono cursor-pointer flex items-center justify-center shadow-sm"
                  >
                    0
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-12 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white active:scale-95 text-zinc-500 transition-all cursor-pointer flex items-center justify-center"
                    title="Supprimer un chiffre"
                  >
                    <Delete size={18} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn || pinCode.length < 4}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{t("Valider le PIN")}</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Google OAuth Option (si configuré) */}
        <div className="pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800/60 text-xs font-semibold text-zinc-300 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
          >
            <Globe size={15} className="text-zinc-400" />
            <span>Continuer avec Google</span>
          </button>
        </div>

        {/* Footer simple */}
        <div className="text-center pt-1">
          <span className="text-[10px] text-zinc-600 font-mono">
            Nexus POS Pro v1.2.15 • Architecture Offline-First
          </span>
        </div>
      </main>
    </div>
  );
};
