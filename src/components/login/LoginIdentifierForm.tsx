import React from 'react';
import { User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export interface LoginIdentifierFormProps {
  loginIdentifier: string;
  setLoginIdentifier: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isLoggingIn: boolean;
  authError: any;
  handleIdentifierLogin: (identifier: string, password: string) => void;
  t: (key: string) => string;
}

export const LoginIdentifierForm: React.FC<LoginIdentifierFormProps> = ({
  loginIdentifier,
  setLoginIdentifier,
  loginPassword,
  setLoginPassword,
  showPassword,
  setShowPassword,
  isLoggingIn,
  authError,
  handleIdentifierLogin,
  t
}) => {
  return (
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
  );
};
