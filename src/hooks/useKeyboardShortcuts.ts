// ============================================================================
// SUUN TERVEYSTALO - Keyboard Shortcuts Hook
// Global keyboard shortcuts handler
// ============================================================================

import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

const useKeyboardShortcuts = (
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape in inputs
        if (event.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

        // For Mac, allow both Cmd and Ctrl
        const metaMatch = shortcut.metaKey 
          ? (event.metaKey || event.ctrlKey)
          : !(event.metaKey && !shortcut.ctrlKey);

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Predefined shortcuts
export const defaultShortcuts = (actions: {
  openCommandPalette?: () => void;
  createCampaign?: () => void;
  goToDashboard?: () => void;
  goToCampaigns?: () => void;
  goToAnalytics?: () => void;
  goToSettings?: () => void;
  toggleDarkMode?: () => void;
  openAIChat?: () => void;
  showHelp?: () => void;
}): ShortcutConfig[] => [
  {
    key: 'k',
    ctrlKey: true,
    action: actions.openCommandPalette || (() => {}),
    description: 'Avaa komentovalikko',
    category: 'Yleinen'
  },
  {
    key: 'n',
    ctrlKey: true,
    action: actions.createCampaign || (() => {}),
    description: 'Luo uusi kampanja',
    category: 'Kampanjat'
  },
  {
    key: '/',
    ctrlKey: true,
    action: actions.openCommandPalette || (() => {}),
    description: 'Haku',
    category: 'Yleinen'
  },
  {
    key: '.',
    ctrlKey: true,
    action: actions.openAIChat || (() => {}),
    description: 'Avaa AI-chat',
    category: 'AI'
  },
  {
    key: 'd',
    ctrlKey: true,
    shiftKey: true,
    action: actions.toggleDarkMode || (() => {}),
    description: 'Vaihda tumma/vaalea tila',
    category: 'Ulkoasu'
  },
  {
    key: '?',
    shiftKey: true,
    action: actions.showHelp || (() => {}),
    description: 'Näytä pikanäppäimet',
    category: 'Yleinen'
  }
];

export default useKeyboardShortcuts;
