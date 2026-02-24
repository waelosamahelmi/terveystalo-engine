// ============================================================================
// SUUN TERVEYSTALO - Layout Component
// Main layout with sidebar navigation and header
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getBrandAssets } from '../lib/creativeService';
import { getAppSetting, updateAppSetting } from '../lib/settingsService';
import { isDemoMode, isDemoUser } from '../lib/demoService';
import type { User } from '../types';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  MapPin,
  Megaphone,
  FileBarChart,
  Palette,
  MessageSquare,
  Search,
  Moon,
  Sun,
  HelpCircle,
  Activity,
  Command,
  Keyboard,
  Sparkles,
  FileEdit
} from 'lucide-react';
import toast from 'react-hot-toast';
import UserProfileModal from './UserProfileModal';
import NotificationCenter from './NotificationCenter';
import AIChatbot from './AIChatbot';
import CommandPalette from './CommandPalette';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import Breadcrumbs from './Breadcrumbs';
import useKeyboardShortcuts, { defaultShortcuts, navigationShortcuts, triggerOpenAIChat } from '../hooks/useKeyboardShortcuts';
import defaultLogo from '../assets/logo.png';

interface LayoutProps {
  user: User | null;
  children?: React.ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles?: string[];
  badge?: number;
}

const Layout = ({ user, children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [darkMode, setDarkMode] = useState<boolean | null>(null); // null = loading
  const [searchQuery, setSearchQuery] = useState('');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';

  // Keyboard shortcuts
  const shortcuts = defaultShortcuts({
    openCommandPalette: () => setShowCommandPalette(true),
    showHelp: () => setShowShortcutsModal(true),
    toggleDarkMode: () => toggleDarkMode(),
    createCampaign: () => navigate('/campaigns/create'),
    openAIChat: () => triggerOpenAIChat(),
  });

  // Navigation shortcuts (G+H, G+C, etc.)
  const navShortcuts = navigationShortcuts({
    goToDashboard: () => navigate('/'),
    goToCampaigns: () => navigate('/campaigns'),
    goToBranches: () => navigate('/branches'),
    goToAnalytics: () => navigate('/analytics'),
    goToReports: () => navigate('/reports'),
    goToSettings: () => navigate('/settings'),
    goToCreatives: () => navigate('/creatives'),
    goToTemplates: () => navigate('/admin/templates'),
  });
  
  useKeyboardShortcuts(shortcuts, true, navShortcuts);

  // Fetch brand logo on mount
  useEffect(() => {
    const loadBrandLogo = async () => {
      const assets = await getBrandAssets();
      if (assets.logos.length > 0) {
        setBrandLogo(assets.logos[0]);
      }
    };
    loadBrandLogo();
  }, []);

  // Load dark mode setting from database
  useEffect(() => {
    const loadDarkMode = async () => {
      const features = await getAppSetting<{ dark_mode?: boolean }>('features');
      setDarkMode(features?.dark_mode ?? false);
    };
    loadDarkMode();
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode !== null) {
      document.documentElement.classList.toggle('dark', darkMode);
    }
  }, [darkMode]);

  // Toggle dark mode and save to database
  const toggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    
    // Get current features and update dark_mode
    const currentFeatures = await getAppSetting<Record<string, any>>('features') || {};
    await updateAppSetting('features', { ...currentFeatures, dark_mode: newValue });
  };

  // Navigation items
  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Pisteet', path: '/branches', icon: MapPin },
    { name: 'Kampanjat', path: '/campaigns', icon: Megaphone },
    { name: 'Analytiikka', path: '/analytics', icon: BarChart3 },
    { name: 'Raportit', path: '/reports', icon: FileBarChart, roles: ['admin', 'manager'] },
    { name: 'Luovat', path: '/creatives', icon: Palette },
    { name: 'Mallipohjat', path: '/admin/templates', icon: FileEdit, roles: ['admin', 'manager'] },
    { name: 'AI Assistentti', path: '/ai-assistant', icon: MessageSquare },
    { name: 'Käyttäjät', path: '/users', icon: Users, roles: ['admin', 'manager'] },
    { name: 'Toimintaloki', path: '/activity-log', icon: Activity, roles: ['admin', 'manager'] },
    { name: 'Asetukset', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch {
      toast.error('Uloskirjautuminen epäonnistui');
    }
  };

  const handleProfileUpdate = async () => {
    window.location.reload();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or filter current view
      toast.success(`Haetaan: ${searchQuery}`);
    }
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentItem = navItems.find(item => item.path === location.pathname);
    return currentItem?.name || 'Suun Terveystalo';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } bg-gradient-to-b from-[#0046AD] to-[#003485] text-white transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:relative overflow-hidden flex flex-col shadow-xl shadow-[#0046AD]/20`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-3 border-b border-white/10">
          <Link to="/" className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} w-full`}>
            <img 
              src={defaultLogo} 
              alt="Logo" 
              className={`${sidebarCollapsed ? 'h-8' : 'h-8'} w-auto object-contain flex-shrink-0`}
            />
            {brandLogo && !sidebarCollapsed && (
              <img 
                src={brandLogo} 
                alt="Brand Logo" 
                className="h-8 max-w-[120px] w-auto object-contain flex-shrink-0"
              />
            )}
          </Link>
          
          {/* Mobile close button */}
          <button 
            className="md:hidden text-white focus:outline-none ml-auto" 
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 px-2">
          <ul className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                    <span className={`transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                      {item.name}
                    </span>
                    
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <span className={`${sidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} bg-[#E31E24] text-white text-xs font-medium px-2 py-0.5 rounded-full`}>
                        {item.badge}
                      </span>
                    )}
                    
                    {/* Tooltip for collapsed sidebar */}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-white/10">
          <button
            onClick={toggleSidebarCollapse}
            className="w-full flex items-center justify-center p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-[#0046AD]/10 dark:border-white/10 h-16 flex items-center px-4 md:px-6 sticky top-0 z-30 shadow-sm">
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 rounded-lg text-[#0046AD] dark:text-white hover:bg-[#0046AD]/10 dark:hover:bg-white/10 mr-2" 
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          {/* Page title with Breadcrumbs */}
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>

          {/* Search bar - Opens Command Palette */}
          <button 
            onClick={() => setShowCommandPalette(true)}
            className="hidden md:flex items-center ml-8 flex-1 max-w-md"
          >
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0046AD]/40 dark:text-white/40 group-hover:text-[#0046AD] dark:group-hover:text-white transition-colors" size={18} />
              <div className="w-full pl-10 pr-4 py-2 bg-white/60 dark:bg-white/10 backdrop-blur-sm border border-[#0046AD]/10 dark:border-white/10 rounded-xl text-sm text-gray-500 dark:text-gray-300 group-hover:bg-white/80 dark:group-hover:bg-white/20 group-hover:border-[#0046AD]/20 dark:group-hover:border-white/20 group-hover:shadow-md transition-all cursor-pointer flex items-center justify-between">
                <span>Hae kampanjoita, pisteita...</span>
                <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[#0046AD]/60 bg-[#0046AD]/5 border border-[#0046AD]/10 rounded">
                  <Command size={12} />K
                </kbd>
              </div>
            </div>
          </button>

          {/* Right side actions */}
          <div className="flex items-center ml-auto space-x-1">
            {/* Demo Mode Badge */}
            {isDemoMode() && isDemoUser(user?.email) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#00A5B5]/10 to-[#0046AD]/10 dark:from-[#00A5B5]/20 dark:to-[#0046AD]/20 border border-[#00A5B5]/30 rounded-full mr-2">
                <Sparkles size={14} className="text-[#00A5B5]" />
                <span className="text-xs font-semibold text-[#00A5B5]">DEMO</span>
              </div>
            )}

            {/* Keyboard shortcuts */}
            <button 
              onClick={() => setShowShortcutsModal(true)}
              className="p-2 rounded-xl text-[#0046AD]/60 dark:text-white/60 hover:text-[#0046AD] dark:hover:text-white hover:bg-[#0046AD]/10 dark:hover:bg-white/10 transition-colors hidden lg:block"
              title="Pikanäppäimet (Shift + ?)"
            >
              <Keyboard size={20} />
            </button>

            {/* Help */}
            <button className="p-2 rounded-xl text-[#0046AD]/60 dark:text-white/60 hover:text-[#0046AD] dark:hover:text-white hover:bg-[#0046AD]/10 dark:hover:bg-white/10 transition-colors">
              <HelpCircle size={20} />
            </button>

            {/* Notifications */}
            <NotificationCenter />

            {/* Dark mode toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-[#0046AD]/60 dark:text-yellow-400 hover:text-[#0046AD] dark:hover:text-yellow-300 hover:bg-[#0046AD]/10 dark:hover:bg-white/10 transition-colors"
              disabled={darkMode === null}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#0046AD]/10 dark:hover:bg-white/10 transition-colors ml-2"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0046AD] to-[#00A5B5] flex items-center justify-center text-white font-medium text-sm shadow-md">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                  {user?.full_name || 'Käyttäjä'}
                </span>
                <ChevronDown size={16} className={`hidden lg:block text-[#0046AD]/60 dark:text-white/60 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-xl border border-[#0046AD]/10 dark:border-white/10 py-1 animate-scale-in">
                  <div className="px-4 py-3 border-b border-[#0046AD]/10 dark:border-white/10">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-xs font-medium text-[#0046AD] dark:text-[#00A5B5] bg-[#0046AD]/10 dark:bg-[#00A5B5]/20 px-2 py-0.5 rounded-full capitalize">
                      {user?.role}
                    </span>
                  </div>
                  
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-[#0046AD]/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Users size={16} className="mr-3 text-[#0046AD]/60 dark:text-white/60" />
                      Profiili
                    </button>
                    
                    {isAdmin && (
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-[#0046AD]/5 dark:hover:bg-white/10 transition-colors"
                      >
                        <Settings size={16} className="mr-3 text-[#0046AD]/60 dark:text-white/60" />
                        Asetukset
                      </Link>
                    )}
                  </div>
                  
                  <div className="border-t border-[#0046AD]/10 dark:border-white/10 py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={16} className="mr-3" />
                      Kirjaudu ulos
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Profile Modal */}
      {showProfileModal && user && (
        <UserProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdate={handleProfileUpdate}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
};

export default Layout;
