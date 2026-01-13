'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowRight, Mail, Lock, User, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.register(formData);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
            <h1 className="text-4xl font-bold text-[hsl(var(--foreground))] mb-2">Create Account</h1>
            <p className="text-[hsl(var(--muted-foreground))]">Join Sanchar and start collaborating</p>
          </div>

          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm fade-in-up flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Registration successful! Please check your email to verify your account.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm fade-in-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 fade-in-up">
            <div>
              <label className="block text-[hsl(var(--foreground))] mb-2 font-medium text-sm">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent transition"
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

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
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent transition"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Must be at least 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold hover:opacity-90 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[hsl(var(--primary-foreground))] border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Account Created!
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center fade-in-up">
            <p className="text-[hsl(var(--muted-foreground))]">
              Already have an account?{' '}
              <Link href="/login" className="text-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]/80 font-semibold transition">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))] fade-in-up">
            <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
