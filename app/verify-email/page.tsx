'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing');
      return;
    }

    // Verify email - the API route redirects, so we need to handle it differently
    fetch(`/api/auth/verify-email?token=${token}`, {
      redirect: 'manual', // Don't follow redirects automatically
    })
      .then(async (res) => {
        if (res.status === 302 || res.ok) {
          // Success - redirect to login
          setStatus('success');
          setMessage('Email verified successfully! You can now log in.');
          // Redirect to login after 2 seconds
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 2000);
        } else {
          const data = await res.json();
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      })
      .catch((error) => {
        setStatus('error');
        setMessage('An error occurred during verification');
        console.error('Verification error:', error);
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <h1 className="text-3xl font-bold text-white mb-2">Verifying Email</h1>
                <p className="text-white/70">Please wait...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Email Verified!</h1>
                <p className="text-white/70 mb-6">{message}</p>
                <p className="text-white/50 text-sm mb-4">Redirecting to login...</p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-300"
                >
                  Go to Login
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Verification Failed</h1>
                <p className="text-white/70 mb-6">{message}</p>
                <div className="space-y-3">
                  <Link
                    href="/register"
                    className="block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-300 text-center"
                  >
                    Register Again
                  </Link>
                  <Link
                    href="/login"
                    className="block px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transform hover:scale-105 transition-all duration-300 text-center"
                  >
                    Go to Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <h1 className="text-3xl font-bold text-white mb-2">Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
