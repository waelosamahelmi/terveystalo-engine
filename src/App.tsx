// ============================================================================
// SUUN TERVEYSTALO - App.tsx
// Clean, fast, stable - using singleton store pattern
// ============================================================================

import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store, useStore } from './lib/store';
import { isDemoMode, isDemoWizardCompleted, isDemoUser } from './lib/demoService';
import DemoWizard from './components/DemoWizard';

// Pages - Direct imports (no lazy loading for instant navigation)
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import ActivityLog from './pages/ActivityLog';
import AdCreatives from './pages/AdCreatives';
import BidTheatre from './pages/BidTheatre';
import MediaScreens from './pages/MediaScreens';
import NotFound from './pages/NotFound';
import VideoLibrary from './pages/VideoLibrary';
import Branches from './pages/Branches';
import Campaigns from './pages/Campaigns';
import CampaignCreate from './pages/CampaignCreate';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Creatives from './pages/Creatives';
import AIAssistant from './pages/AIAssistant';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import ResetPassword from './components/ResetPassword';
import CampaignDetails from './components/CampaignDetails';

// ============================================================================
// LOADING SCREEN
// ============================================================================
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 rounded-xl bg-[#00A5B5] flex items-center justify-center mx-auto mb-4">
        <span className="text-white font-bold text-xl">S</span>
      </div>
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#00A5B5] border-t-transparent mx-auto"></div>
    </div>
  </div>
);

// ============================================================================
// PROTECTED LAYOUT - Uses global store, no context re-renders
// ============================================================================
const ProtectedLayout = () => {
  const { user, authInitialized, isReady } = useStore();
  const [showDemoWizard, setShowDemoWizard] = useState(false);
  
  // Check if we should show demo wizard when user logs in
  useEffect(() => {
    if (user && isDemoUser(user.email) && isDemoMode() && !isDemoWizardCompleted()) {
      setShowDemoWizard(true);
    }
  }, [user]);
  
  if (!authInitialized) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Layout renders ONCE - show loading inside if data not ready
  return (
    <>
      <Layout user={user}>
        {isReady ? <Outlet /> : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00A5B5] border-t-transparent"></div>
          </div>
        )}
      </Layout>
      
      {/* Demo Wizard Modal */}
      <DemoWizard
        isOpen={showDemoWizard}
        onClose={() => setShowDemoWizard(false)}
        onComplete={() => setShowDemoWizard(false)}
      />
    </>
  );
};

// ============================================================================
// APP ROUTES
// ============================================================================
const AppRoutes = () => {
  const { user, authInitialized } = useStore();

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1F2937',
            color: '#fff',
            borderRadius: '0.75rem',
          },
        }}
      />
      <Routes>
        {/* Login - public */}
        <Route 
          path="/login" 
          element={
            !authInitialized ? <LoadingScreen /> : 
            user ? <Navigate to="/" replace /> : 
            <Login />
          } 
        />
        
        {/* Protected routes - Layout renders ONCE with Outlet */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/create" element={<CampaignCreate />} />
          <Route path="/campaigns/:campaignId" element={<CampaignDetails />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/creatives" element={<Creatives />} />
          <Route path="/ad-creatives" element={<AdCreatives />} />
          <Route path="/video-library" element={<VideoLibrary />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bidtheatre" element={<BidTheatre />} />
          <Route path="/media-screens" element={<MediaScreens />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
};

// ============================================================================
// APP - Initialize store ONCE
// ============================================================================
function App() {
  useEffect(() => {
    const init = async () => {
      const user = await store.initAuth();
      if (user) {
        store.loadAllData();
      }
    };
    init();

    // Silent token refresh every 10 minutes
    const tokenRefresh = setInterval(async () => {
      try {
        const { supabase } = await import('./lib/supabase');
        await supabase.auth.refreshSession();
      } catch {
        // Silent
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(tokenRefresh);
  }, []);

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
