import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Lock, LogOut, ArrowRight, Delete, RotateCcw, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { verifyAdminPin, resetAdminPin, cancelAdminUnlock } from '../../services/auth/adminPinService';
import { auth } from '../../services/auth/AuthEmulator';
import { toast } from 'sonner';

interface AdminPinUnlockModalProps {
  user: any;
  t: (key: string) => string;
}

export const AdminPinUnlockModal: React.FC<AdminPinUnlockModalProps> = ({ user, t }) => {
  const [pinCode, setPinCode] = useState<string>('');
  const [confirmPinCode, setConfirmPinCode] = useState<string>('');
  const [isResetMode, setIsResetMode] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<'enter_new' | 'confirm_new'>('enter_new');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userEmail = user?.email || 'Gérant Propriétaire';
  const displayName = user?.displayName || user?.name || userEmail.split('@')[0];

  const currentInput = isResetMode && resetStep === 'confirm_new' ? confirmPinCode : pinCode;

  // Indicateurs dynamiques : 4 bulles par défaut, s'étendant jusqu'à 8
  const indicatorSlots = useMemo(() => {
    const minSlots = 4;
    const maxSlots = 8;
    const currentLength = currentInput.length;
    const targetSlots = Math.min(maxSlots, Math.max(minSlots, currentLength + (currentLength < maxSlots ? 1 : 0)));
    return Array.from({ length: targetSlots });
  }, [currentInput.length]);

  const handleKeyPress = (digit: string) => {
    if (isVerifying || currentInput.length >= 8) return;
    setErrorMessage(null);
    if (isResetMode && resetStep === 'confirm_new') {
      setConfirmPinCode(prev => prev + digit);
    } else {
      setPinCode(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setErrorMessage(null);
    if (isResetMode && resetStep === 'confirm_new') {
      setConfirmPinCode(prev => prev.slice(0, -1));
    } else {
      setPinCode(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (isVerifying) return;
    setErrorMessage(null);
    if (isResetMode && resetStep === 'confirm_new') {
      setConfirmPinCode('');
    } else {
      setPinCode('');
    }
  };

  const handleUnlockSubmit = async (overridePin?: string) => {
    const candidate = overridePin || pinCode;
    if (isVerifying || candidate.length < 4 || candidate.length > 8) return;

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyAdminPin(candidate, user);
      if (res.success) {
        if (res.isFirstSetup) {
          toast.success(t("Code PIN secret Gérant configuré avec succès !"));
        } else {
          toast.success(t("Accès Gérant déverrouillé avec succès."));
        }
        auth.trigger(user);
      } else {
        setErrorMessage(res.message || t("Code PIN incorrect."));
        setPinCode('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || t("Erreur lors de la vérification du code PIN."));
      setPinCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNextResetStep = () => {
    if (pinCode.length < 4 || pinCode.length > 8) {
      setErrorMessage(t("Le code PIN doit comporter entre 4 et 8 chiffres."));
      return;
    }
    setErrorMessage(null);
    setResetStep('confirm_new');
  };

  const handleApplyResetPin = async () => {
    if (confirmPinCode !== pinCode) {
      setErrorMessage(t("Les deux codes PIN saisis ne correspondent pas."));
      setConfirmPinCode('');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await resetAdminPin(pinCode, user);
      if (res.success) {
        toast.success(t("Nouveau code PIN Gérant défini avec succès !"));
        auth.trigger(user);
      } else {
        setErrorMessage(res.message || t("Erreur lors de la réinitialisation du PIN."));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || t("Impossible de réinitialiser le code PIN."));
    } finally {
      setIsVerifying(false);
    }
  };

  // Support du clavier physique du PC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isVerifying) return;
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (isResetMode) {
          if (resetStep === 'enter_new' && pinCode.length >= 4) {
            handleNextResetStep();
          } else if (resetStep === 'confirm_new' && confirmPinCode.length >= 4) {
            handleApplyResetPin();
          }
        } else if (pinCode.length >= 4 && pinCode.length <= 8) {
          handleUnlockSubmit();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentInput, isVerifying, isResetMode, resetStep, pinCode, confirmPinCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/80 space-y-4 text-zinc-100 relative">
        
        {/* En-tête de Sécurité */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            {isResetMode ? <KeyRound size={26} /> : <ShieldCheck size={26} />}
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>{isResetMode ? t("Nouveau PIN Gérant") : t("Sécurité Gérant Renforcée")}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {isResetMode ? "RESET" : "MFA"}
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-1 truncate max-w-[280px]">
              {displayName} ({userEmail})
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {isResetMode
                ? (resetStep === 'enter_new'
                    ? t("Saisissez votre nouveau code PIN secret (4 à 8 chiffres).")
                    : t("Confirmez votre nouveau code PIN secret."))
                : t("Saisissez votre code PIN secret Gérant pour continuer.")}
            </p>
          </div>
        </div>

        {/* Message d'erreur éventuel */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in shake duration-200">
            <AlertTriangle size={15} className="shrink-0" />
            <span className="font-semibold text-[11px]">{errorMessage}</span>
          </div>
        )}

        {/* Indicateurs dynamiques de bulles PIN */}
        <div className="flex justify-center items-center gap-2.5 py-1">
          {indicatorSlots.map((_, idx) => {
            const isFilled = idx < currentInput.length;
            const isNext = idx === currentInput.length;
            return (
              <div
                key={idx}
                className={cn(
                  "w-3.5 h-3.5 rounded-full transition-all duration-200",
                  isFilled
                    ? (isResetMode ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] scale-110" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] scale-110")
                    : isNext
                    ? (isResetMode ? "border-2 border-amber-400/60 bg-transparent scale-100" : "border-2 border-rose-400/60 bg-transparent scale-100")
                    : "bg-zinc-800 border border-zinc-700/80"
                )}
              />
            );
          })}
        </div>

        {/* Clavier Tactile Numérique 3x4 */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              disabled={isVerifying}
              className="h-11 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 text-lg font-bold text-white transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={isVerifying || currentInput.length === 0}
            className="h-11 rounded-xl bg-zinc-950/40 hover:bg-zinc-800/60 border border-zinc-800/60 text-xs font-bold text-zinc-400 hover:text-white transition-all active:scale-95 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1"
          >
            <RotateCcw size={14} />
            <span>C</span>
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isVerifying}
            className="h-11 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 text-lg font-bold text-white transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isVerifying || currentInput.length === 0}
            className="h-11 rounded-xl bg-zinc-950/40 hover:bg-zinc-800/60 border border-zinc-800/60 text-zinc-400 hover:text-white transition-all active:scale-95 disabled:opacity-30 cursor-pointer flex items-center justify-center"
          >
            <Delete size={17} />
          </button>
        </div>

        {/* Boutons d'Action */}
        <div className="space-y-2 pt-1">
          {isResetMode ? (
            resetStep === 'enter_new' ? (
              <button
                type="button"
                onClick={handleNextResetStep}
                disabled={isVerifying || pinCode.length < 4}
                className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-lg shadow-amber-600/30"
              >
                <span>{t("Continuer vers la confirmation")}</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyResetPin}
                disabled={isVerifying || confirmPinCode.length < 4}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                {isVerifying ? (
                  <span className="animate-pulse">{t("Enregistrement du PIN...")}</span>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>{t("Valider et déverrouiller")}</span>
                  </>
                )}
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => handleUnlockSubmit()}
              disabled={isVerifying || pinCode.length < 4 || pinCode.length > 8}
              className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-lg shadow-rose-600/30"
            >
              {isVerifying ? (
                <span className="animate-pulse">{t("Vérification en cours...")}</span>
              ) : (
                <>
                  <Lock size={15} />
                  <span>{t("Déverrouiller l'accès Gérant")}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          )}

          {isResetMode ? (
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setResetStep('enter_new');
                setPinCode('');
                setConfirmPinCode('');
                setErrorMessage(null);
              }}
              disabled={isVerifying}
              className="w-full h-9 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800/70 text-zinc-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{t("Retour à la saisie du PIN")}</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(true);
                  setResetStep('enter_new');
                  setPinCode('');
                  setConfirmPinCode('');
                  setErrorMessage(null);
                }}
                disabled={isVerifying}
                className="text-[11px] font-semibold text-rose-400/90 hover:text-rose-300 underline underline-offset-4 cursor-pointer transition-colors"
              >
                {t("Code PIN oublié ? Réinitialiser")}
              </button>

              <button
                type="button"
                onClick={() => cancelAdminUnlock()}
                disabled={isVerifying}
                className="w-full h-9 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800/70 text-zinc-400 hover:text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut size={13} />
                <span>{t("Annuler et se déconnecter")}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
