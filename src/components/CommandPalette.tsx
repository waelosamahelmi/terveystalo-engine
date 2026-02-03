// ============================================================================
// SUUN TERVEYSTALO - Command Palette Component
// Spotlight-style command palette with AI integration
// ============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import {
  Search,
  Command,
  LayoutDashboard,
  Megaphone,
  MapPin,
  BarChart3,
  FileBarChart,
  Palette,
  MessageSquare,
  Users,
  Settings,
  Plus,
  Moon,
  Sun,
  ArrowRight,
  Clock,
  Star,
  Sparkles,
  TrendingUp,
  Zap,
  Target,
  Hash,
  Keyboard
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navigation' | 'action' | 'ai' | 'recent' | 'search';
  keywords?: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { campaigns, branches, services } = useStore();

  // Load recent items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('command-palette-recent');
    if (saved) {
      setRecentItems(JSON.parse(saved));
    }
  }, []);

  // Save recent item
  const addToRecent = (id: string) => {
    const updated = [id, ...recentItems.filter(i => i !== id)].slice(0, 5);
    setRecentItems(updated);
    localStorage.setItem('command-palette-recent', JSON.stringify(updated));
  };

  // Navigation commands
  const navigationCommands: CommandItem[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Yleisnäkymä ja tilastot',
      icon: LayoutDashboard,
      action: () => navigate('/'),
      category: 'navigation',
      keywords: ['koti', 'home', 'etusivu'],
      shortcut: 'G H'
    },
    {
      id: 'nav-campaigns',
      title: 'Kampanjat',
      subtitle: 'Hallinnoi kampanjoita',
      icon: Megaphone,
      action: () => navigate('/campaigns'),
      category: 'navigation',
      keywords: ['campaign', 'mainonta'],
      shortcut: 'G C'
    },
    {
      id: 'nav-branches',
      title: 'Toimipisteet',
      subtitle: 'Pisteiden hallinta',
      icon: MapPin,
      action: () => navigate('/branches'),
      category: 'navigation',
      keywords: ['locations', 'piste', 'sijainti'],
      shortcut: 'G B'
    },
    {
      id: 'nav-analytics',
      title: 'Analytiikka',
      subtitle: 'Suorituskykytilastot',
      icon: BarChart3,
      action: () => navigate('/analytics'),
      category: 'navigation',
      keywords: ['stats', 'tilastot', 'data'],
      shortcut: 'G A'
    },
    {
      id: 'nav-reports',
      title: 'Raportit',
      subtitle: 'Luo ja lataa raportteja',
      icon: FileBarChart,
      action: () => navigate('/reports'),
      category: 'navigation',
      keywords: ['export', 'lataa', 'pdf'],
      shortcut: 'G R'
    },
    {
      id: 'nav-creatives',
      title: 'Luovat',
      subtitle: 'Mainosmateriaalit',
      icon: Palette,
      action: () => navigate('/creatives'),
      category: 'navigation',
      keywords: ['creative', 'mainos', 'kuva'],
      shortcut: 'G L'
    },
    {
      id: 'nav-ai',
      title: 'AI Assistentti',
      subtitle: 'Keskustele AI:n kanssa',
      icon: MessageSquare,
      action: () => navigate('/ai-assistant'),
      category: 'navigation',
      keywords: ['chat', 'keskustelu', 'bot'],
      shortcut: 'G I'
    },
    {
      id: 'nav-users',
      title: 'Käyttäjät',
      subtitle: 'Käyttäjähallinta',
      icon: Users,
      action: () => navigate('/users'),
      category: 'navigation',
      keywords: ['user', 'admin'],
      shortcut: 'G U'
    },
    {
      id: 'nav-settings',
      title: 'Asetukset',
      subtitle: 'Sovelluksen asetukset',
      icon: Settings,
      action: () => navigate('/settings'),
      category: 'navigation',
      keywords: ['config', 'preferences'],
      shortcut: 'G S'
    }
  ], [navigate]);

  // Action commands
  const actionCommands: CommandItem[] = useMemo(() => [
    {
      id: 'action-new-campaign',
      title: 'Luo uusi kampanja',
      subtitle: 'Aloita kampanjan luonti',
      icon: Plus,
      action: () => navigate('/campaigns/create'),
      category: 'action',
      keywords: ['create', 'new', 'uusi'],
      shortcut: 'N'
    },
    {
      id: 'action-toggle-theme',
      title: 'Vaihda teema',
      subtitle: 'Tumma/vaalea tila',
      icon: Moon,
      action: () => {
        document.documentElement.classList.toggle('dark');
      },
      category: 'action',
      keywords: ['dark', 'light', 'mode']
    }
  ], [navigate]);

  // AI commands
  const aiCommands: CommandItem[] = useMemo(() => [
    {
      id: 'ai-analyze',
      title: 'Analysoi kampanjat',
      subtitle: 'AI analysoi kampanjoiden suorituskyvyn',
      icon: Sparkles,
      action: () => {
        navigate('/ai-assistant?prompt=' + encodeURIComponent('Analysoi aktiivisten kampanjoiden suorituskyky'));
      },
      category: 'ai',
      keywords: ['analyze', 'performance']
    },
    {
      id: 'ai-optimize',
      title: 'Budjettisuositukset',
      subtitle: 'AI ehdottaa budjettioptimointeja',
      icon: Target,
      action: () => {
        navigate('/ai-assistant?prompt=' + encodeURIComponent('Anna budjettioptimointiehdotuksia'));
      },
      category: 'ai',
      keywords: ['budget', 'optimize']
    },
    {
      id: 'ai-report',
      title: 'Generoi raportti',
      subtitle: 'AI luo viikkoraportin',
      icon: TrendingUp,
      action: () => {
        navigate('/ai-assistant?prompt=' + encodeURIComponent('Luo viikkoraportti kampanjoista'));
      },
      category: 'ai',
      keywords: ['report', 'weekly']
    },
    {
      id: 'ai-insights',
      title: 'Näytä oivallukset',
      subtitle: 'AI:n löytämät trendit ja anomaliat',
      icon: Zap,
      action: () => {
        navigate('/ai-assistant?prompt=' + encodeURIComponent('Mitä huomionarvoista datassa on?'));
      },
      category: 'ai',
      keywords: ['insights', 'trends', 'anomaly']
    }
  ], [navigate]);

  // Dynamic search results (campaigns, branches)
  const searchResults: CommandItem[] = useMemo(() => {
    if (!query || query.length < 2) return [];
    
    const results: CommandItem[] = [];
    const lowerQuery = query.toLowerCase();

    // Search campaigns
    campaigns
      .filter(c => c.name.toLowerCase().includes(lowerQuery))
      .slice(0, 3)
      .forEach(campaign => {
        results.push({
          id: `campaign-${campaign.id}`,
          title: campaign.name,
          subtitle: `Kampanja • ${campaign.status}`,
          icon: Megaphone,
          action: () => navigate(`/campaigns/${campaign.id}`),
          category: 'search'
        });
      });

    // Search branches
    branches
      .filter(b => 
        b.name.toLowerCase().includes(lowerQuery) || 
        b.city?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 3)
      .forEach(branch => {
        results.push({
          id: `branch-${branch.id}`,
          title: branch.name,
          subtitle: `Toimipiste • ${branch.city}`,
          icon: MapPin,
          action: () => navigate(`/branches?id=${branch.id}`),
          category: 'search'
        });
      });

    // Search services
    services
      .filter(s => s.name.toLowerCase().includes(lowerQuery))
      .slice(0, 2)
      .forEach(service => {
        results.push({
          id: `service-${service.id}`,
          title: service.name,
          subtitle: `Palvelu • ${service.default_price || ''}`,
          icon: Hash,
          action: () => navigate(`/campaigns/create?service=${service.id}`),
          category: 'search'
        });
      });

    return results;
  }, [query, campaigns, branches, services, navigate]);

  // All commands filtered by query
  const filteredCommands = useMemo(() => {
    const allCommands = [...navigationCommands, ...actionCommands, ...aiCommands];
    
    if (!query) {
      // Show recent + popular when no query
      const recentCommands = allCommands
        .filter(cmd => recentItems.includes(cmd.id))
        .map(cmd => ({ ...cmd, category: 'recent' as const }));
      
      return [...recentCommands, ...navigationCommands.slice(0, 5), ...aiCommands.slice(0, 2)];
    }

    const lowerQuery = query.toLowerCase();
    const filtered = allCommands.filter(cmd => {
      const matchTitle = cmd.title.toLowerCase().includes(lowerQuery);
      const matchSubtitle = cmd.subtitle?.toLowerCase().includes(lowerQuery);
      const matchKeywords = cmd.keywords?.some(k => k.includes(lowerQuery));
      return matchTitle || matchSubtitle || matchKeywords;
    });

    return [...searchResults, ...filtered];
  }, [query, navigationCommands, actionCommands, aiCommands, recentItems, searchResults]);

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            const cmd = filteredCommands[selectedIndex];
            addToRecent(cmd.id);
            cmd.action();
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'recent': return 'Viimeisimmät';
      case 'navigation': return 'Navigointi';
      case 'action': return 'Toiminnot';
      case 'ai': return 'AI-toiminnot';
      case 'search': return 'Hakutulokset';
      default: return '';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'recent': return Clock;
      case 'ai': return Sparkles;
      default: return null;
    }
  };

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-2xl z-50 animate-scale-in">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          {/* Search Input */}
          <div className="relative border-b border-gray-100 dark:border-white/10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hae komentoja, sivuja tai dataa..."
              className="w-full pl-12 pr-4 py-4 text-lg border-0 focus:ring-0 focus:outline-none placeholder-gray-400 bg-transparent dark:text-white"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-xs rounded-md font-mono">ESC</kbd>
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
            {filteredCommands.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Ei tuloksia haulle "{query}"</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Kokeile toista hakusanaa</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-2">
                  <div className="flex items-center space-x-2 px-3 py-2">
                    {getCategoryIcon(category) && (
                      <span className="text-gray-400">
                        {(() => {
                          const Icon = getCategoryIcon(category);
                          return Icon ? <Icon size={12} /> : null;
                        })()}
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {getCategoryLabel(category)}
                    </span>
                  </div>
                  {commands.map((cmd, idx) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          addToRecent(cmd.id);
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#00A5B5]/10 to-[#1B365D]/10 text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected
                              ? 'bg-gradient-to-br from-[#00A5B5] to-[#1B365D] text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            <cmd.icon size={16} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{cmd.title}</p>
                            {cmd.subtitle && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{cmd.subtitle}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {cmd.shortcut && (
                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-400 text-xs rounded font-mono">
                              {cmd.shortcut}
                            </kbd>
                          )}
                          {isSelected && (
                            <ArrowRight size={16} className="text-[#00A5B5]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-gray-200 dark:border-white/10 font-mono">↑↓</kbd>
                <span>Navigoi</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-gray-200 dark:border-white/10 font-mono">↵</kbd>
                <span>Valitse</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-gray-200 dark:border-white/10 font-mono">ESC</kbd>
                <span>Sulje</span>
              </span>
            </div>
            <div className="flex items-center space-x-1 text-gray-400">
              <Keyboard size={14} />
              <span>Cmd+K</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
