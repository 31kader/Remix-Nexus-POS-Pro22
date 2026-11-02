import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { isTabAllowed } from '../../lib/permissions';

interface UseAppTabNavigationProps {
  profile: any;
  canAccess: (permission: any) => boolean;
  isOwner: boolean;
  t: (key: string) => string;
}

export function useAppTabNavigation({
  profile,
  canAccess,
  isOwner,
  t
}: UseAppTabNavigationProps) {
  const isCameraAgent = (profile?.role as string) === 'camera_agent';
  const isVerifiedAdmin = isOwner || (profile?.role === 'admin' && canAccess('canAccessSettings'));

  const getInitialTab = useCallback(() => {
    if (isCameraAgent) return 'camera';
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash.includes('=') || hash.includes('&') || hash === 'dashboard' || hash === 'ai_assistant' || hash === 'pos' || hash === 'caisse') {
      return 'checkout';
    }
    if (!isTabAllowed(hash, canAccess, { isAdmin: isVerifiedAdmin, isOwner, isManager: profile?.role === 'manager', isCameraAgent })) {
      return 'checkout';
    }
    return hash;
  }, [profile, canAccess, isOwner, isCameraAgent, isVerifiedAdmin]);

  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = useCallback((tab: string) => {
    const targetTab = (tab === 'dashboard' || tab === 'ai_assistant' || tab === 'pos' || tab === 'caisse') ? 'checkout' : tab;
    // 🛡️ Vérification d'autorisation (Défense en profondeur)
    if (!isTabAllowed(targetTab, canAccess, { isAdmin: isVerifiedAdmin, isOwner, isManager: profile?.role === 'manager', isCameraAgent })) {
      toast.error(t("Accès refusé : vous n'avez pas l'autorisation pour ce module."));
      window.location.hash = 'checkout';
      setActiveTabState('checkout');
      return;
    }
    window.location.hash = targetTab;
    setActiveTabState(targetTab);
  }, [canAccess, profile, isOwner, isCameraAgent, isVerifiedAdmin, t]);

  // Synchronisation dynamique avec la barre d'adresse pour support multi-fenêtres & multi-onglets
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && !hash.includes('=') && !hash.includes('&')) {
        const target = (hash === 'dashboard' || hash === 'ai_assistant' || hash === 'pos' || hash === 'caisse') ? 'checkout' : hash;
        if (!isTabAllowed(target, canAccess, { isAdmin: isVerifiedAdmin, isOwner, isManager: profile?.role === 'manager', isCameraAgent })) {
          setActiveTab('checkout');
        } else {
          setActiveTabState(target);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveTab, canAccess, profile, isOwner, isCameraAgent, isVerifiedAdmin]);

  // Écouteur global pour les événements 'change-tab' (ex: encaissement rapide depuis la fiche client)
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent && customEvent.detail) {
        const tab = customEvent.detail;
        const targetTab = (tab === 'dashboard' || tab === 'ai_assistant' || tab === 'pos' || tab === 'caisse') ? 'checkout' : tab;
        setActiveTab(targetTab);
      }
    };
    window.addEventListener('change-tab', handleTabChange);
    return () => window.removeEventListener('change-tab', handleTabChange);
  }, [setActiveTab]);

  // Si le profil utilisateur change (connexion d'un employé), forcer le retour à un onglet permis
  useEffect(() => {
    if (profile && !isTabAllowed(activeTab, canAccess, { isAdmin: isVerifiedAdmin, isOwner, isManager: profile.role === 'manager', isCameraAgent })) {
      setActiveTab('checkout');
    }
  }, [profile, activeTab, canAccess, isOwner, isCameraAgent, isVerifiedAdmin, setActiveTab]);

  return {
    activeTab,
    setActiveTab,
    isCameraAgent,
    isVerifiedAdmin
  };
}
