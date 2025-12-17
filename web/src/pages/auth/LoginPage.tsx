/**
 * Login Page
 * SSO login with fallback to email/password for development
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithSSO, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDevLogin, setShowDevLogin] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSSOLogin = async () => {
    try {
      await loginWithSSO();
      // SSO will redirect, so we don't navigate here
    } catch (error) {
      toast.error('SSO login failed. Please try again.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    try {
      await login(email, password);
      toast.success('Login successful');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Yellow Grid</h1>
          <p className="text-gray-600">Operator Portal</p>
        </div>

        {/* Login card */}
        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Sign In</h2>

          {/* SSO Login Button */}
          <button
            onClick={handleSSOLogin}
            disabled={isLoading}
            className="btn btn-primary w-full mb-4"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign in with SSO (PingID)
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or for development</span>
            </div>
          </div>

          {/* Toggle dev login */}
          {!showDevLogin ? (
            <button
              onClick={() => setShowDevLogin(true)}
              className="btn btn-secondary w-full"
            >
              Use Email & Password
            </button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="operator@yellowgrid.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-primary w-full">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => setShowDevLogin(false)}
                className="btn btn-secondary w-full"
              >
                Back to SSO
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Yellow Grid Field Service Management Platform
          <br />
          © 2025 GlobalCorp Home Services
        </p>
      </div>
    </div>
  );
}
