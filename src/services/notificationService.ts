export const playNotificationSound = () => {
  try {
    const NotificationCls = (window as any).Notification;
    if (typeof NotificationCls === 'function' && NotificationCls.permission === 'granted') {
      try {
        // Safely attempt to use Notification constructor
        const canUseNew = NotificationCls.prototype && typeof NotificationCls.prototype === 'object';
        if (canUseNew) {
          new NotificationCls('🚨 Nouvelle commande en ligne !', {
            body: 'Une nouvelle commande vient d\'arriver pour vos livreurs.',
          });
        } else {
          throw new Error('Not a constructor');
        }
      } catch (e) {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            if (registration && registration.showNotification) {
              registration.showNotification('🚨 Nouvelle commande en ligne !', {
                body: 'Une nouvelle commande vient d\'arriver pour vos livreurs.',
              });
            }
          }).catch(() => {});
        }
      }
    }

    const AudioContextCls = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (typeof AudioContextCls === 'function') {
      try {
        // Safely check if it's a constructor before using 'new'
        const canUseNew = AudioContextCls.prototype && typeof AudioContextCls.prototype === 'object';
        const ctx = canUseNew ? new AudioContextCls() : (typeof AudioContextCls === 'function' ? AudioContextCls() : null);
        if (!ctx) return;
        
        const playBeep = (freq: number, startTime: number) => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.3);
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + 0.3);
          } catch (e) {}
        };

        playBeep(880, 0);       // A5
        playBeep(1046.50, 0.15); // C6
      } catch (audioErr) {
        console.warn('AudioContext failed:', audioErr);
      }
    }
  } catch (e) {
    console.error('Notification logic failed:', e);
  }
};
