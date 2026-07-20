import React from 'react';
import { 
  ShoppingCart, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Plus, 
  LogOut, 
  ChevronRight, 
  Globe, 
  ShieldCheck, 
  Star, 
  Zap, 
  Palette, 
  Languages, 
  ChevronDown,
  ArrowLeft,
  Users,
  Delete
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LoginClock } from './LoginClock';
import { Button } from './ui';
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
    <div className="h-screen w-full flex flex-col lg:flex-row bg-[#05070a] text-slate-100 overflow-hidden relative font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/5 blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/5 blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Left Panel: Brand & Vision */}
      <div className="hidden lg:flex lg:w-[40%] bg-black/20 border-r border-white/5 flex-col justify-between p-16 relative overflow-hidden backdrop-blur-3xl ring-1 ring-white/5">
        <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
        
        <div className="flex items-center gap-5 z-10 group cursor-default">
          <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center shadow-neon-indigo relative transition-transform duration-500 group-hover:rotate-12">
            <ShoppingCart size={28} className="text-white relative" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">NEXUS <span className="text-indigo-400">PRO</span></h2>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1.5 ml-0.5 italic opacity-80">INTEGRATED SYSTEMS</span>
          </div>
        </div>
        
        <div className="space-y-12 z-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 ring-1 ring-white/5 shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 italic">Core v1.2.6 Stable Runtime</span>
            </div>
            <h1 className="text-6xl xl:text-7xl font-black text-white leading-[1.0] tracking-tighter italic">
              GESTION <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 drop-shadow-2xl">EVOLVED.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium max-w-sm leading-relaxed italic opacity-80">
              L'infrastructure POS cloud-native la plus avancée du marché, optimisée pour la vitesse et l'intelligence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 pr-8">
            {[
              { icon: <ShieldCheck size={20} />, title: "SECURED", desc: "Military Grade" },
              { icon: <Zap size={20} />, title: "REALTIME", desc: "0ms Latency" },
              { icon: <Star size={20} />, title: "INSIGHTS", desc: "AI Powered" },
              { icon: <Palette size={20} />, title: "UI/UX", desc: "Industrial design" }
            ].map((feature, i) => (
              <div key={i} className="p-5 rounded-[1.75rem] bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-white/10 transition-all duration-500 group cursor-default shadow-2xl ring-1 ring-white/5">
                <div className="text-indigo-400 mb-3 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">{feature.title}</h4>
                <p className="text-[8px] text-slate-600 font-black mt-1 uppercase tracking-widest">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between z-10 pt-10 border-t border-white/5">
          <div className="flex items-center gap-5">
            <LoginClock />
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-neon-indigo animate-pulse" />
              <span className="text-[9px] font-black tracking-[0.3em] uppercase text-slate-600 italic">EN-REGION-WEST</span>
            </div>
          </div>
          <div className="text-[8px] text-slate-700 font-black tracking-[0.4em] uppercase italic opacity-40">
            © 2026 NEXUS CORP.
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-20 relative bg-black/40 backdrop-blur-3xl overflow-y-auto">
        <div className="absolute top-10 right-10 z-20">
          <div className="relative">
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 group ring-1 ring-white/5"
            >
              <Languages size={16} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
              {language === 'fr' ? 'FRANÇAIS' : 'العربية'}
              <ChevronDown size={14} className={cn("transition-transform duration-500", isLangMenuOpen && "rotate-180")} />
            </button>
            
            {isLangMenuOpen && (
              <div className="absolute right-0 mt-4 w-56 rounded-3xl bg-[#0a0c10] border border-white/10 p-2 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] z-50 animate-in fade-in zoom-in-95 duration-300 ring-1 ring-white/10 backdrop-blur-2xl">
                <button onClick={() => { setLanguage('fr'); setIsLangMenuOpen(false); }} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group", language === 'fr' ? "bg-indigo-600 text-white shadow-neon-indigo" : "text-slate-500 hover:bg-white/5 hover:text-white")}>
                  <span className="text-lg">🇫🇷</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">FRANÇAIS</span>
                </button>
                <button onClick={() => { setLanguage('ar'); setIsLangMenuOpen(false); }} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-right group", language === 'ar' ? "bg-indigo-600 text-white shadow-neon-indigo" : "text-slate-500 hover:bg-white/5 hover:text-white")}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] font-sans-arabic ml-auto">العربية</span>
                  <span className="text-lg">🇩🇿</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-[460px] space-y-10 py-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="lg:hidden flex justify-center">
             <div className="flex items-center gap-4 bg-white/5 p-4 rounded-[2rem] border border-white/10 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-neon-indigo">
                <ShoppingCart size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none">NEXUS <span className="text-indigo-400">PRO</span></h2>
            </div>
          </div>

          <div className="space-y-3 text-center lg:text-left border-l-4 border-indigo-600 pl-8">
            <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              {t("AUTHENTIFICATION")}
            </h3>
            <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-[9px] italic">
              {t("Accès sécurisé au terminal de gestion")}
            </p>
          </div>

          {/* Login Mode Tabs */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full">
            <button
              type="button"
              onClick={() => {
                setLoginMode('identifier');
                setAuthError(null);
              }}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300",
                loginMode === 'identifier' ? "bg-indigo-600 text-white shadow-neon-indigo" : "text-slate-500 hover:text-slate-300"
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
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300",
                loginMode === 'pin' ? "bg-indigo-600 text-white shadow-neon-indigo" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {t("Code PIN")}
            </button>
          </div>

          {loginMode === 'identifier' ? (
            <form onSubmit={(e) => { e.preventDefault(); handleIdentifierLogin(loginIdentifier, loginPassword); }} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 italic">{t("IDENTIFIANT RÉSEAU")}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-700 group-focus-within:text-indigo-400 transition-colors">
                      <User size={20} />
                    </div>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] py-5 pl-14 pr-5 text-white text-sm font-bold placeholder:text-slate-800 focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20"
                      placeholder={t("E-mail ou ID employé...")}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 italic">{t("CODE D'ACCÈS")}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-700 group-focus-within:text-indigo-400 transition-colors">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] py-5 pl-14 pr-14 text-white text-sm font-bold placeholder:text-slate-800 focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-700 hover:text-white transition-colors active:scale-90"
                    >
                      {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </div>
              </div>

              {authError && (
                <div className="p-5 rounded-[1.5rem] bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[11px] font-black uppercase tracking-wider flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl italic ring-1 ring-rose-500/10">
                  <ShieldCheck size={20} className="shrink-0 text-rose-500 shadow-neon-rose" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-6 rounded-[1.75rem] bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 relative overflow-hidden group border border-indigo-400 ring-1 ring-white/20 italic"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                  {isLoggingIn ? (
                    <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-3 relative z-10">
                      {t("VALIDER L'ACCÈS SYSTÈME")}
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {!selectedUser ? (
                /* Profile Selection List */
                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 italic">
                    {t("SÉLECTIONNEZ VOTRE COMPTE")}
                  </label>
                  
                  {uniqueLocalUsers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                      {uniqueLocalUsers.map((user) => {
                        const style = getRoleStyle(user.role);
                        const initials = (user.displayName || user.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <button
                            key={user.uid || user.id || user.email || user.phone}
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setPinCode('');
                              setAuthError(null);
                            }}
                            className="p-4 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-white/10 transition-all duration-300 flex flex-col items-center justify-center text-center group relative shadow-lg"
                          >
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm mb-3 transition-transform group-hover:scale-110", style.bg)}>
                              {initials}
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-full">
                              {user.displayName || user.name}
                            </span>
                            <span className={cn("text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-2 shrink-0 scale-90", style.badge)}>
                              {user.role}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/5 text-slate-500 text-xs italic">
                      {t("Aucun compte enregistré localement. Veuillez vous connecter une fois avec vos identifiants réseau.")}
                    </div>
                  )}
                </div>
              ) : (
                /* Keypad Input Screen */
                <form onSubmit={(e) => { e.preventDefault(); handlePinSubmit(); }} className="space-y-6 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3.5">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs", getRoleStyle(selectedUser.role).bg)}>
                        {(selectedUser.displayName || selectedUser.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-white uppercase tracking-tight">
                          {selectedUser.displayName || selectedUser.name}
                        </p>
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
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
                      className="p-2 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl text-slate-500 transition-all flex items-center justify-center"
                      title="Changer de compte"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  </div>

                  {/* Dot Indicators */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 italic flex justify-center">
                      {t("SAISISSEZ VOTRE PIN")}
                    </label>
                    <div className="flex justify-center gap-4 py-2">
                      {[0, 1, 2, 3, 4, 5].map((idx) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "w-4 h-4 rounded-full border-2 transition-all duration-300",
                            pinCode.length > idx 
                              ? "bg-indigo-500 border-indigo-400 shadow-neon-indigo scale-110" 
                              : "border-slate-800 bg-transparent"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {authError && (
                    <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-wider flex items-start gap-3 shadow-md italic">
                      <ShieldCheck size={16} className="shrink-0 text-rose-500 shadow-neon-rose mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {/* Visual Numeric Keypad Grid */}
                  <div className="grid grid-cols-3 gap-3.5 max-w-[280px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeypadPress(num)}
                        className="h-16 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 text-xl font-black text-white transition-all shadow-inner flex items-center justify-center font-mono"
                      >
                        {num}
                      </button>
                    ))}
                    
                    <button
                      type="button"
                      onClick={handleKeypadClear}
                      className="h-16 rounded-2xl bg-white/5 border border-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 active:scale-95 text-xs font-black text-slate-500 transition-all flex items-center justify-center"
                    >
                      {t("EFFACER")}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      className="h-16 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 text-xl font-black text-white transition-all shadow-inner flex items-center justify-center font-mono"
                    >
                      0
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleKeypadBackspace}
                      className="h-16 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 text-slate-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <Delete size={20} />
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoggingIn || pinCode.length < 4}
                      className="w-full py-6 rounded-[1.75rem] bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden group border border-indigo-400 ring-1 ring-white/20 italic"
                    >
                      <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                      {isLoggingIn ? (
                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                      ) : (
                        <span className="flex items-center justify-center gap-3 relative z-10">
                          {t("VALIDER LE CODE PIN")}
                          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.4em] italic">
              <span className="bg-[#05070a] px-6 text-slate-800 uppercase">{t("OU PASSERELLE EXTERNE")}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-4 py-5 rounded-[1.5rem] bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-xs font-black tracking-[0.2em] transition-all active:scale-95 shadow-2xl ring-1 ring-white/5 group italic"
            >
              <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center border border-white/10 group-hover:border-indigo-500/40 transition-colors shadow-inner">
                <Globe size={18} className="text-indigo-400" />
              </div>
              <span>CONTINUER AVEC GOOGLE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
