// --- Audio Utilities ---
export const playScanSound = () => {
  // Désactivé : Le lecteur de code-barres physique bipe déjà naturellement
};

export const announcePrice = (name: string, price: number, currency: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  try {
    // Cancel previous speech
    window.speechSynthesis.cancel();
    
    // Hardened check for SpeechSynthesisUtterance
    const Utterance = (window as any).SpeechSynthesisUtterance;
    if (typeof Utterance !== 'function') return;

    // Safely check if it's a constructor
    const canUseNew = Utterance.prototype && typeof Utterance.prototype === 'object';
    const msg = canUseNew ? new Utterance() : (typeof Utterance === 'function' ? Utterance() : null);
    if (!msg) return;

    // Traduction de la devise en mot français complet pour la voix
    const cleanCurrency = String(currency || '').trim().toUpperCase();
    let spokenCurrency = 'dinars';
    if (cleanCurrency === 'DA' || cleanCurrency === 'DZD' || !cleanCurrency) {
      spokenCurrency = Math.abs(price) <= 1 ? 'dinar' : 'dinars';
    } else if (cleanCurrency === 'EUR' || cleanCurrency === '€') {
      spokenCurrency = Math.abs(price) <= 1 ? 'euro' : 'euros';
    } else if (cleanCurrency === 'USD' || cleanCurrency === '$') {
      spokenCurrency = Math.abs(price) <= 1 ? 'dollar' : 'dollars';
    } else {
      spokenCurrency = currency;
    }

    // Formatage du prix pour la voix : pas de 'virgule zéro zéro' pour les nombres entiers
    const rounded = Math.round(Number(price || 0) * 100) / 100;
    let spokenPrice = '';
    if (Number.isInteger(rounded)) {
      spokenPrice = `${rounded} ${spokenCurrency}`;
    } else {
      const parts = rounded.toFixed(2).split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1].replace(/0+$/, '');
      spokenPrice = `${integerPart} virgule ${decimalPart} ${spokenCurrency}`;
    }

    msg.text = `${name}. ${spokenPrice}`;
    msg.lang = 'fr-FR';
    msg.rate = 1.05;
    msg.pitch = 1;
    
    window.speechSynthesis.speak(msg);
  } catch (e) {
    console.warn('Speech synthesis failed:', e);
  }
};
