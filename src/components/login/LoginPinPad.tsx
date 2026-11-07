import React from 'react';
import { ArrowLeft, Delete, ShieldCheck, CheckCircle2, User, KeyRound } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoginPinPadProps {
  selectedUser: any | null;
  setSelectedUser: (user: any | null) => void;
  uniqueLocalUsers: any[];
  pinCode: string;
  setPinCode: (val: string | ((prev: string) => string)) => void;
  isLoggingIn: boolean;
  authError: any;
  setAuthError: (val: any) => void;
  handleKeypadPress: (val: string) => void;
  handleKeypadBackspace: () => void;
  handleKeypadClear: () => void;
  handlePinSubmit: () => void;
  getRoleStyle: (role: string) => { bg: string; badge: string };
  t: (key: string) => string;
}

export const LoginPinPad: React.FC<LoginPinPadProps> = ({
  selectedUser,
  setSelectedUser,
  uniqueLocalUsers,
  pinCode,
  setPinCode,
  isLoggingIn,
  authError,
  setAuthError,
  handleKeypadPress,
  handleKeypadBackspace,
  handleKeypadClear,
  handlePinSubmit,
  getRoleStyle,
  t
}) => {
  // Calcul dynamique des bulles d'indicateur : minimum 4, s'étend jusqu'à 8
  const indicatorSlots = React.useMemo(() => {
    const minSlots = 4;
    const maxSlots = 8;
    const currentLength = pinCode.length;
    // Si la saisie dépasse 4, on affiche les slots saisis + 1 slot d'attente (jusqu'à 8)
    const targetSlots = Math.min(maxSlots, Math.max(minSlots, currentLength + (currentLength < maxSlots ? 1 : 0)));
    return Array.from({ length: targetSlots });
  }, [pinCode.length]);

  const isPinValidLength = pinCode.length >= 4 && pinCode.length <= 8;

  return (
    <div className="space-y-4">
      {!selectedUser ? (
        /* Étape 1 : Choix du compte utilisateur */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <User size={14} className="text-indigo-400" />
              <span>{t("Sélectionnez votre compte caisse :")}</span>
            </p>
            <span className="text-[10px] text-zinc-500 font-mono">
              {uniqueLocalUsers.length} profil{uniqueLocalUsers.length > 1 ? 's' : ''}
            </span>
          </div>

          {uniqueLocalUsers.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {uniqueLocalUsers.map((user) => {
                const style = getRoleStyle(user.role);
                const displayName = user.displayName || user.name || 'Utilisateur';
                const initials = displayName
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <button
                    key={user.uid || user.id || user.email || user.phone}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setPinCode('');
                      setAuthError(null);
                    }}
                    className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-800/60 transition-all flex flex-col items-center justify-center text-center cursor-pointer group shadow-sm active:scale-[0.98]"
                  >
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm mb-2 transition-transform group-hover:scale-105 border",
                        style.bg
                      )}
                    >
                      {initials}
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-full">
                      {displayName}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5",
                        style.badge
                      )}
                    >
                      {user.role}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center bg-zinc-950/80 rounded-xl border border-zinc-800/80 text-zinc-400 text-xs space-y-2">
              <p className="font-semibold text-zinc-300">Aucun profil enregistré localement.</p>
              <p className="text-[11px] text-zinc-500">
                Basculez sur l'onglet <strong className="text-zinc-300">Identifiants</strong> pour votre première connexion.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Étape 2 : Pavé tactile PIN de l'utilisateur */
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinSubmit();
          }}
          className="space-y-4"
        >
          {/* Bandeau profil actif */}
          <div className="flex items-center justify-between bg-zinc-950/90 p-3 rounded-xl border border-zinc-800/90 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm",
                  getRoleStyle(selectedUser.role).bg
                )}
              >
                {(selectedUser.displayName || selectedUser.name || 'U')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">
                  {selectedUser.displayName || selectedUser.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full", getRoleStyle(selectedUser.role).badge)}>
                    {selectedUser.role}
                  </span>
                  <span className="text-[10px] text-zinc-500">• Caisse locale</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedUser(null);
                setPinCode('');
                setAuthError(null);
              }}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 hover:text-white rounded-lg text-zinc-400 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-zinc-800"
              title="Changer de profil"
            >
              <ArrowLeft size={14} />
              <span>Changer</span>
            </button>
          </div>

          {/* Affichage dynamique du Code PIN (4 à 8 chiffres) */}
          <div className="flex flex-col items-center justify-center gap-2 py-1">
            <div className="flex items-center justify-center gap-2.5 min-h-[42px] px-4 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80 shadow-inner">
              {indicatorSlots.map((_, idx) => {
                const isFilled = idx < pinCode.length;
                const isCurrent = idx === pinCode.length;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "w-3.5 h-3.5 rounded-full transition-all duration-200 flex items-center justify-center",
                      isFilled
                        ? "bg-indigo-500 scale-110 shadow-sm shadow-indigo-500/50"
                        : isCurrent
                        ? "border-2 border-indigo-400 bg-indigo-500/10 animate-pulse"
                        : "border-2 border-zinc-700/80 bg-zinc-900"
                    )}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              {!isPinValidLength ? (
                <span className="text-zinc-500 flex items-center gap-1">
                  <KeyRound size={12} className="text-zinc-500" />
                  <span>{pinCode.length} / 4 min. (max. 8 chiffres)</span>
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>PIN prêt ({pinCode.length} chiffres) — Validez ou Entrée</span>
                </span>
              )}
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-rose-500" />
              <span>{authError}</span>
            </div>
          )}

          {/* Pavé tactile 3x4 ergonomique */}
          <div className="grid grid-cols-3 gap-2 max-w-[270px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                disabled={isLoggingIn}
                className="h-12 rounded-xl bg-zinc-950/90 border border-zinc-800/90 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 text-lg font-bold text-white transition-all font-mono cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-50"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleKeypadClear}
              disabled={isLoggingIn || pinCode.length === 0}
              className="h-12 rounded-xl bg-zinc-950/90 border border-zinc-800/90 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 active:scale-95 text-[11px] font-bold text-zinc-500 transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t("Effacer")}
            </button>

            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              disabled={isLoggingIn}
              className="h-12 rounded-xl bg-zinc-950/90 border border-zinc-800/90 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 text-lg font-bold text-white transition-all font-mono cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-50"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleKeypadBackspace}
              disabled={isLoggingIn || pinCode.length === 0}
              className="h-12 rounded-xl bg-zinc-950/90 border border-zinc-800/90 hover:bg-zinc-800 hover:text-white active:scale-95 text-zinc-400 transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              title="Supprimer un chiffre"
            >
              <Delete size={18} />
            </button>
          </div>

          {/* Bouton de validation tactile & clavier */}
          <button
            type="submit"
            disabled={isLoggingIn || !isPinValidLength}
            className={cn(
              "w-full py-3.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2",
              isPinValidLength
                ? "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50 shadow-none"
            )}
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{t("Ouvrir la session caisse")}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
