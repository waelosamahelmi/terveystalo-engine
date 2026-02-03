// ============================================================================
// SUUN TERVEYSTALO - Keyboard Shortcuts Modal
// Shows all available keyboard shortcuts
// ============================================================================

import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutItem[];
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal = ({ isOpen, onClose }: KeyboardShortcutsModalProps) => {
  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  const shortcutCategories: ShortcutCategory[] = [
    {
      name: 'Yleinen',
      shortcuts: [
        { keys: [cmdKey, 'K'], description: 'Avaa komentovalikko' },
        { keys: [cmdKey, '/'], description: 'Hae' },
        { keys: ['ESC'], description: 'Sulje modaali' },
        { keys: ['?'], description: 'Näytä pikanäppäimet' }
      ]
    },
    {
      name: 'Navigointi',
      shortcuts: [
        { keys: ['G', 'H'], description: 'Siirry Dashboardiin' },
        { keys: ['G', 'C'], description: 'Siirry Kampanjoihin' },
        { keys: ['G', 'B'], description: 'Siirry Toimipisteisiin' },
        { keys: ['G', 'A'], description: 'Siirry Analytiikkaan' },
        { keys: ['G', 'R'], description: 'Siirry Raportteihin' },
        { keys: ['G', 'S'], description: 'Siirry Asetuksiin' }
      ]
    },
    {
      name: 'Toiminnot',
      shortcuts: [
        { keys: [cmdKey, 'N'], description: 'Luo uusi kampanja' },
        { keys: [cmdKey, 'S'], description: 'Tallenna' },
        { keys: [cmdKey, '.'], description: 'Avaa AI-chat' },
        { keys: [cmdKey, 'Shift', 'D'], description: 'Vaihda tumma/vaalea tila' }
      ]
    },
    {
      name: 'Taulukot ja listat',
      shortcuts: [
        { keys: ['↑', '↓'], description: 'Navigoi rivien välillä' },
        { keys: ['Enter'], description: 'Avaa valittu' },
        { keys: ['Space'], description: 'Valitse/poista valinta' },
        { keys: [cmdKey, 'A'], description: 'Valitse kaikki' }
      ]
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#00A5B5]/5 to-[#1B365D]/5">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00A5B5] to-[#1B365D]">
                <Keyboard size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pikanäppäimet</h2>
                <p className="text-sm text-gray-500">Navigoi nopeammin näppäimistöllä</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-6">
              {shortcutCategories.map((category) => (
                <div key={category.name}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                    {category.name}
                  </h3>
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                      >
                        <span className="text-sm text-gray-600">{shortcut.description}</span>
                        <div className="flex items-center space-x-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx} className="flex items-center">
                              {keyIdx > 0 && <span className="text-gray-300 mx-1">+</span>}
                              <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs font-mono text-gray-600 shadow-sm">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Command size={14} />
              <span>Paina <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-xs">?</kbd> nähdäksesi tämän milloin tahansa</span>
            </div>
            <span className="text-gray-400">
              {isMac ? 'macOS' : 'Windows/Linux'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default KeyboardShortcutsModal;
