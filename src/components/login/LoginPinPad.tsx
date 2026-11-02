import React from 'react';
import { ArrowLeft, Delete, ShieldCheck } from 'lucide-react';
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
  return (
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
  );
};
