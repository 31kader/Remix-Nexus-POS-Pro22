import React from 'react';

export function formatAuthErrorMessage(
  error: any,
  windowHref: string = typeof window !== 'undefined' ? window.location.href : '',
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''
): React.ReactNode {
  const errorCode = error?.code || (error?.message && error.message.includes('auth/') ? error.message.match(/auth\/[a-z0-9-]+/)?.[0] : null);
  const errorMsgString = error?.message || error?.msg || (typeof error === 'string' ? error : JSON.stringify(error || ''));

  if (errorMsgString.includes('already registered') || errorMsgString.includes('already exists') || errorMsgString.includes('user_already_exists')) {
    return (
      <>
        <div className="font-bold mb-1 text-amber-200">Cet e-mail est déjà enregistré.</div>
        <div className="space-y-2 text-[10px] opacity-90 leading-tight">
          <p>• Cet e-mail est déjà associé à un compte existant.</p>
          <p>• <b>Que faire ?</b> Utilisez le formulaire pour vous connecter en utilisant cet e-mail et le mot de passe associé, ou cliquez sur "Se Connecter" ci-dessous.</p>
        </div>
      </>
    );
  }

  if (errorMsgString.includes('Signups not allowed for this instance') || errorMsgString.includes('signup_disabled')) {
    return (
      <>
        <div className="font-bold mb-1 text-amber-200">Inscriptions désactivées sur votre projet Supabase</div>
        <div className="space-y-2 text-[10px] opacity-90 leading-tight">
          <p>• <b>Problème :</b> L'inscription de nouveaux comptes par e-mail/mot de passe est bloquée par votre projet Supabase.</p>
          <p>• <b>Comment régler cela dans Supabase :</b></p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Accédez à votre <b>Tableau de bord Supabase</b> (Authentication).</li>
            <li>Allez dans <b>Authentication → Providers → Email</b>.</li>
            <li>Cochez ou activez la case <b>"Allow new users to sign up"</b> (Autoriser les nouveaux utilisateurs à s'inscrire).</li>
            <li><i>Conseil pratique :</i> Décochez également <b>"Confirm email"</b> si vous souhaitez que la validation de l'e-mail ne soit pas obligatoire lors de la création du compte.</li>
            <li>Cliquez sur <b>Save</b> (Enregistrer) pour appliquer le changement.</li>
          </ul>
          <p className="mt-1 text-green-300">• <b>Solution de secours immédiate :</b> Utilisez le bouton de connexion <b>"Google Administrateur"</b>, qui est déjà fonctionnel et configuré pour votre projet !</p>
        </div>
      </>
    );
  }

  if (errorMsgString.includes('provider is not enabled') || errorMsgString.includes('Unsupported provider')) {
    return (
      <>
        <div className="font-bold mb-1">Fournisseur d'authentification désactivé (Bouton Google)</div>
        <div className="space-y-2 text-[10px] opacity-90 leading-tight">
          <p>• <b>Problème :</b> L'authentification par Google est bloquée car le fournisseur de connexion Google (OAuth) n'est pas activé dans votre tableau de bord Supabase.</p>
          <p>• <b>Action :</b> Veuillez activer le fournisseur Google dans la console Supabase (<b>Authentication → Providers → Google</b>).</p>
          <p>• <b>Solution de secours :</b> Pour vous connecter dès maintenant, vous pouvez utiliser le formulaire standard en créant un compte par e-mail/mot de passe à l'aide du lien en bas de la carte.</p>
        </div>
      </>
    );
  }

  if (errorCode === 'auth/network-request-failed') {
    return (
      <>
        <div className="font-bold mb-1">Erreur réseau lors de la connexion.</div>
        <div className="space-y-2 text-[10px] opacity-90 leading-tight">
          <p>• <b>Cookies Tiers Bloqués :</b> Votre navigateur (ex: Brave, Safari, Chrome Incognito) bloque probablement l'authentification. <b>Veuillez autoriser les cookies tiers ou désactiver les "Shields" / bloqueurs de publicités pour cette page.</b></p>
          <p>• <b>Nouvel Onglet :</b> Si vous êtes dans un aperçu (iframe), essayez d'ouvrir l'application dans un <a href={windowHref} target="_blank" rel="noopener noreferrer" className="underline text-indigo-200">nouvel onglet</a>.</p>
          <p>• Vérifiez également votre connexion Internet.</p>
        </div>
      </>
    );
  }

  if (errorCode === 'auth/cancelled-popup-request' || errorCode === 'auth/popup-closed-by-user') {
    console.log("Popup closed or cancelled by user.");
    return null;
  }

  if (errorCode === 'auth/visibility-check-was-unavailable') {
    return "La connexion a échoué car la fenêtre a perdu le focus ou a été bloquée. Veuillez réessayer. Si le problème persiste, essayez d'autoriser les cookies tiers.";
  }

  if (errorCode === 'auth/popup-blocked') {
    return "Le popup de connexion a été bloqué par votre navigateur. Veuillez autoriser les popups pour ce site.";
  }

  if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorMsgString.toLowerCase().includes('invalid login credentials') || errorMsgString.toLowerCase().includes('invalid_credentials')) {
    return (
      <>
        <div className="font-bold mb-1">Identifiant ou mot de passe incorrect.</div>
        <div className="space-y-2 text-[10px] opacity-90 leading-tight">
          <p>• Veuillez vérifier votre adresse e-mail (ou numéro de téléphone) et votre mot de passe.</p>
          <p>• Si vous êtes l'administrateur, vous pouvez également vous connecter en utilisant le bouton <b>"Google Administrateur"</b>.</p>
          <p>• Les comptes d'employés doivent être créés et configurés par le manager depuis le panneau d'administration.</p>
        </div>
      </>
    );
  }

  return (
    <>
      Erreur de connexion: {error?.message || "Une erreur inconnue est survenue."}
      <br />
      <span className="mt-1 block text-[10px] opacity-80 font-bold">
        Code d'erreur: {errorCode || 'unknown'}
      </span>
      <br />
      <span className="mt-1 block text-[10px] opacity-80">
        Astuce: Si le problème persiste, essayez d'ouvrir l'application dans un nouvel onglet ou de vérifier votre configuration Supabase.
      </span>
    </>
  );
}
