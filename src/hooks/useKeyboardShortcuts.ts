// ============================================================================
// SUUN TERVEYSTALO - Keyboard Shortcuts Hook
// Global keyboard shortcuts handler with support for sequential keys (G+H)
// ============================================================================

import { useEffect, useCallback, useRef } from 'react';

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

// For sequential shortcuts like G+H
interface SequentialShortcut {
  sequence: string[];
  action: () => void;
  description: string;
  category?: string;
}

// Global state for AI chat (can be controlled from outside)
let aiChatOpenCallback: (() => void) | null = null;

export const registerAIChatCallback = (callback: () => void) => {
  aiChatOpenCallback = callback;
};

export const unregisterAIChatCallback = () => {
  aiChatOpenCallback = null;
};

export const triggerOpenAIChat = () => {
  if (aiChatOpenCallback) {
    aiChatOpenCallback();
  }
};

const useKeyboardShortcuts = (
  shortcuts: ShortcutConfig[],
  enabled: boolean = true,
  sequentialShortcuts: SequentialShortcut[] = []
) => {
  const sequenceBuffer = useRef<string[]>([]);
  const sequenceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSequence = useCallback(() => {
    sequenceBuffer.current = [];
    if (sequenceTimeout.current) {
      clearTimeout(sequenceTimeout.current);
      sequenceTimeout.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInputField) {
        // Allow Escape in inputs
        if (event.key !== 'Escape') return;
      }

      // Check for sequential shortcuts (like G+H) - only when no modifiers
      if (sequentialShortcuts.length > 0 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        const key = event.key.toLowerCase();
        
        // Only consider letter keys for sequences
        if (key.length === 1 && key >= 'a' && key <= 'z') {
          // Add to sequence buffer
          sequenceBuffer.current.push(key);
          
          // Clear sequence after 800ms of inactivity
          if (sequenceTimeout.current) {
            clearTimeout(sequenceTimeout.current);
          }
          sequenceTimeout.current = setTimeout(clearSequence, 800);

          // Check if current sequence matches any sequential shortcut
          for (const seqShortcut of sequentialShortcuts) {
            const sequence = seqShortcut.sequence.map(s => s.toLowerCase());
            const bufferStr = sequenceBuffer.current.join('');
            const sequenceStr = sequence.join('');
            
            if (bufferStr === sequenceStr) {
              event.preventDefault();
              clearSequence();
              seqShortcut.action();
              return;
            }
          }
          
          // If buffer is > 2 chars and no match, reset
          if (sequenceBuffer.current.length >= 2) {
            // Check if it could still match something
            let couldMatch = false;
            for (const seqShortcut of sequentialShortcuts) {
              const sequenceStr = seqShortcut.sequence.map(s => s.toLowerCase()).join('');
              const bufferStr = sequenceBuffer.current.join('');
              if (sequenceStr.startsWith(bufferStr)) {
                couldMatch = true;
                break;
              }
            }
            if (!couldMatch) {
              clearSequence();
            }
          }
        }
      }

      // Check single-key shortcuts with modifiers
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        
        // Check modifier keys - if shortcut requires it, event must have it
        // If shortcut doesn't require it, event must NOT have it
        const ctrlRequired = shortcut.ctrlKey || shortcut.metaKey;
        const ctrlPressed = event.ctrlKey || event.metaKey;
        const ctrlMatch = ctrlRequired ? ctrlPressed : !ctrlPressed;
        
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, sequentialShortcuts, enabled, clearSequence]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearSequence();
    };
  }, [handleKeyDown, clearSequence]);
};

// Predefined shortcuts
export const defaultShortcuts = (actions: {
  openCommandPalette?: () => void;
  createCampaign?: () => void;
  goToDashboard?: () => void;
  goToCampaigns?: () => void;
  goToBranches?: () => void;
  goToAnalytics?: () => void;
  goToReports?: () => void;
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
    altKey: true,
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

// Navigation shortcuts (sequential: G+H, G+C, etc.)
export const navigationShortcuts = (actions: {
  goToDashboard?: () => void;
  goToCampaigns?: () => void;
  goToBranches?: () => void;
  goToAnalytics?: () => void;
  goToReports?: () => void;
  goToSettings?: () => void;
  goToCreatives?: () => void;
  goToTemplates?: () => void;
}): SequentialShortcut[] => [
  {
    sequence: ['g', 'h'],
    action: actions.goToDashboard || (() => {}),
    description: 'Siirry Dashboardiin',
    category: 'Navigointi'
  },
  {
    sequence: ['g', 'c'],
    action: actions.goToCampaigns || (() => {}),
    description: 'Siirry Kampanjoihin',
    category: 'Navigointi'
  },
  {
    sequence: ['g', 'b'],
    action: actions.goToBranches || (() => {}),
    description: 'Siirry Toimipisteisiin',
    category: 'Navigointi'
  },
  {
    sequence: ['g', 'a'],
    action: actions.goToAnalytics || (() => {}),
    description: 'Siirry Analytiikkaan',
    category: 'Navigointi'
  },
  {
    sequence: ['g', 'r'],
    action: actions.goToReports || (() => {}),
    description: 'Siirry Raportteihin',
    category: 'Navigointi'
  },
  {
    sequence: ['g', 's'],
    action: actions.goToSettings || (() => {}),
    description: 'Siirry Asetuksiin',
    category: 'Navigointi'
  },
  {
    sequence: ['g', 'e'],
    action: actions.goToCreatives || (() => {}),
    description: 'Siirry Luoviin',
    category: 'Navigointi'
  },
  {
    sequence: ['g', 't'],
    action: actions.goToTemplates || (() => {}),
    description: 'Siirry Mallipohjiin',
    category: 'Navigointi'
  }
];

export default useKeyboardShortcuts;
