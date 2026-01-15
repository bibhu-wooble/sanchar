'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowRight, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(formData);
      if (response.success) {
        setAuth(response.user, response.token);
        router.push('/chat');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[hsl(var(--card))] rounded-2xl p-8 border border-[hsl(var(--border))] shadow-2xl fade-in-up">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 bg-[hsl(var(--accent))] rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-[hsl(var(--accent-foreground))] font-bold">S</span>
            </div>
            <span className="font-bold text-xl text-[hsl(var(--foreground))]">Sanchar</span>
          </Link>

          <div className="text-center mb-8 fade-in-down">
            <h1 className="text-4xl font-bold text-[hsl(var(--foreground))] mb-2">Welcome Back</h1>
            <p className="text-[hsl(var(--muted-foreground))]">Sign in to continue to your workspace</p>
          </div>


          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm fade-in-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 fade-in-up">
            <div>
              <label className="block text-[hsl(var(--foreground))] mb-2 font-medium text-sm">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent transition"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[hsl(var(--foreground))] mb-2 font-medium text-sm">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent transition"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))]"
                />
                <span>Remember me</span>
              </label>
              <Link href="#" className="text-sm text-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]/80 transition">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold hover:opacity-90 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[hsl(var(--primary-foreground))] border-t-transparent rounded-full animate-spin"></div>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center fade-in-up">
            <p className="text-[hsl(var(--muted-foreground))]">
              Don't have an account?{' '}
              <Link href="/register" className="text-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]/80 font-semibold transition">
                Sign Up
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))] fade-in-up">
            <div className="text-center">
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">Or continue with</p>
              <div className="flex gap-3 justify-center">
                <button className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--secondary))] transition text-sm text-[hsl(var(--foreground))]">
                  Google
                </button>
                <button className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--secondary))] transition text-sm text-[hsl(var(--foreground))]">
                  Microsoft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[hsl(var(--card))] rounded-2xl p-8 border border-[hsl(var(--border))] shadow-2xl">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[hsl(var(--accent))] border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
