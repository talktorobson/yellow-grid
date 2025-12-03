/**
 * Mobile Redirect Page
 * Redirects users to the mobile app or shows download/access instructions
 */

import { useEffect, useState } from 'react';
import { Smartphone, ExternalLink, ArrowLeft, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MobileRedirectPage() {
  const [countdown, setCountdown] = useState(5);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Mobile app URL - in production this would be the deployed mobile web app
  const mobileAppUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:8081' 
    : `${window.location.origin}/mobile-app`;

  useEffect(() => {
    if (!autoRedirect) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = mobileAppUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRedirect, mobileAppUrl]);

  const handleCancelRedirect = () => {
    setAutoRedirect(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to portals
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-10 h-10 text-amber-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Work Team Mobile App
          </h1>
          <p className="text-gray-600 mb-6">
            The Work Team experience is optimized for mobile devices.
          </p>

          {/* Auto-redirect notice */}
          {autoRedirect && countdown > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                Redirecting to mobile app in <span className="font-bold">{countdown}</span> seconds...
              </p>
              <button
                onClick={handleCancelRedirect}
                className="text-amber-600 hover:text-amber-800 text-sm underline mt-2"
              >
                Cancel redirect
              </button>
            </div>
          )}

          {/* Open App Button */}
          <a
            href={mobileAppUrl}
            className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-amber-700 transition-colors mb-4"
          >
            <ExternalLink className="w-5 h-5" />
            Open Mobile App
          </a>

          {/* Features */}
          <div className="border-t border-gray-100 pt-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Mobile Features
            </h3>
            <ul className="space-y-2 text-left text-gray-600 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                View daily job schedule
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Check-in/out at job sites
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Capture before/after photos
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Submit work completion forms
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Real-time chat with operators
              </li>
            </ul>
          </div>

          {/* QR Code placeholder */}
          <div className="border-t border-gray-100 pt-6 mt-6">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <QrCode className="w-4 h-4" />
              <span>Scan QR code on your mobile device</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-6">
          Yellow Grid Field Service Management
        </p>
      </div>
    </div>
  );
}
