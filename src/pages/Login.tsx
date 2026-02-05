import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { store } from '../lib/store';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import defaultLogo from '../assets/logo.png';
import { DEMO_CREDENTIALS, setDemoMode, isDemoUser } from '../lib/demoService';

// Static Terveystalo logo for login page (doesn't require auth)
const terveystaloLogo = '/SuunTerveystalo_logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // First, try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw error;
      }

      if (!data.session || !data.user) {
        throw new Error('Login successful but no session created');
      }

      // After successful sign-in, verify the user exists in the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found in database');
      }

      // Log the successful login
      try {
        await supabase.from('activity_logs').insert({
          user_id: data.user.id,
          user_email: data.user.email || email,
          action: 'login',
          details: 'User logged in successfully',
        });
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      // Store some user data in localStorage for quick access
      localStorage.setItem('norr3-user-data', JSON.stringify({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        name: userData.name,
      }));

      // Check if this is a demo user and set demo mode
      if (isDemoUser(userData.email)) {
        setDemoMode(true, userData.email);
      } else {
        // Make sure demo mode is OFF for regular users
        setDemoMode(false);
      }

      toast.success('Login successful!');
      
      // Update global store and load data
      store.setUser(userData);
      store.loadAllData();
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error('Error logging in with Google: ' + error.message);
    }
  }, []);

  const handleMagicLink = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: forgotPasswordEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/reset-password`,
        },
      });

      if (error) throw error;

      toast.success('Magic link sent! Check your email.');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('Magic link error:', error);
      toast.error(error.message);
    } finally {
      setForgotPasswordLoading(false);
    }
  }, [forgotPasswordEmail]);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      toast.success('Password reset email sent! Check your email.');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message);
    } finally {
      setForgotPasswordLoading(false);
    }
  }, [forgotPasswordEmail]);

  // Handle demo login
  const handleDemoLogin = useCallback(async () => {
    setDemoLoading(true);
    
    try {
      // Sign in with demo credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
      });

      if (error) {
        throw new Error('Demo login failed. Please contact support.');
      }

      if (!data.session || !data.user) {
        throw new Error('Demo login successful but no session created');
      }

      // After successful sign-in, verify the user exists in the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('Demo user not found in database');
      }

      // Store some user data in localStorage for quick access
      localStorage.setItem('norr3-user-data', JSON.stringify({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        name: userData.name,
      }));

      // Set demo mode - this will also reset the wizard state
      setDemoMode(true, userData.email);

      toast.success('Demo mode activated!');
      
      // Update global store and load data
      store.setUser(userData);
      store.loadAllData();
    } catch (error: any) {
      console.error('Demo login error:', error);
      toast.error(error.message);
      await supabase.auth.signOut();
    } finally {
      setDemoLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0046AD] via-[#003485] to-[#1B365D]">
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00A5B5]/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#0046AD]/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#00A5B5]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src={defaultLogo} 
              alt="Suun Logo" 
              className="h-14 w-auto object-contain drop-shadow-lg"
            />
            <div className="w-px h-10 bg-white/30"></div>
            <img 
              src={terveystaloLogo} 
              alt="Terveystalo Logo" 
              className="h-14 max-w-[180px] w-auto object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8">

            {!showForgotPassword ? (
              <>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                      Sähköposti
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent transition-all"
                      placeholder="esim. etunimi.sukunimi@terveystalo.fi"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                      Salasana
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00A5B5] hover:text-[#4DC4CF] transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-[#00A5B5] hover:text-[#4DC4CF] transition-colors font-medium"
                    >
                      Unohditko salasanan?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-white/15 backdrop-blur-md hover:bg-white/25 text-white font-semibold rounded-xl border border-white/30 hover:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Kirjaudutaan...
                      </span>
                    ) : (
                      'Kirjaudu sisään'
                    )}
                  </button>
                </form>

                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-transparent text-white/60 text-xs uppercase tracking-wider">Tai jatka</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center py-3 px-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300"
                    >
                      <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                          <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                          <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                          <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                          <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                        </g>
                      </svg>
                      Kirjaudu Googlella
                    </button>

                    {/* Demo Access Button */}
                    <button
                      onClick={handleDemoLogin}
                      disabled={demoLoading}
                      className="w-full mt-3 flex items-center justify-center py-3 px-4 bg-gradient-to-r from-[#00A5B5]/20 to-[#0046AD]/20 backdrop-blur border border-[#00A5B5]/40 rounded-xl text-white font-medium hover:from-[#00A5B5]/30 hover:to-[#0046AD]/30 hover:border-[#00A5B5]/60 focus:outline-none focus:ring-2 focus:ring-[#00A5B5]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {demoLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Ladataan demoa...
                        </span>
                      ) : (
                        <>
                          <Sparkles size={18} className="mr-2 text-[#00A5B5]" />
                          Kokeile demoa
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <h3 className="text-xl font-semibold text-center text-white mb-6">
                  Salasanan palautus
                </h3>
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-white/90 mb-2">
                    Sähköposti
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent transition-all"
                    placeholder="esim. etunimi.sukunimi@terveystalo.fi"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleMagicLink}
                    disabled={forgotPasswordLoading}
                    className="flex-1 py-3 px-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {forgotPasswordLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    ) : (
                      'Kirjautumislinkki'
                    )}
                  </button>

                  <button
                    onClick={handleResetPassword}
                    disabled={forgotPasswordLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-[#00A5B5] to-[#008A98] text-white font-medium rounded-xl shadow-lg shadow-[#00A5B5]/30 focus:outline-none focus:ring-2 focus:ring-[#00A5B5] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {forgotPasswordLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    ) : (
                      'Vaihda salasana'
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    ← Takaisin kirjautumiseen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/50 text-xs mt-8">
          © 2026 Suun Terveystalo. Kaikki oikeudet pidätetään.
        </p>
      </div>
    </div>
  );
};

export default Login;