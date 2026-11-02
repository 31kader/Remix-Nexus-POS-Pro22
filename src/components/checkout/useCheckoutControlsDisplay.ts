import { useState, useEffect } from 'react';

export function useCheckoutControlsDisplay() {
  const [showControlsPanel, setShowControlsPanel] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_pos_show_controls_panel');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexus_pos_show_controls_panel', JSON.stringify(showControlsPanel));
    } catch {}
  }, [showControlsPanel]);

  return {
    showControlsPanel,
    setShowControlsPanel
  };
}
