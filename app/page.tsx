'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import {
  Hash,
  Lock,
  Users,
  MessageSquare,
  Zap,
  Shield,
  Smartphone,
  ArrowRight,
  Check,
  Menu,
  X,
  ChevronRight,
  Search,
  Link2,
  Headphones,
} from 'lucide-react';

// Navigation Component
function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] backdrop-blur-lg bg-opacity-80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-[hsl(var(--accent))] rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-[hsl(var(--accent-foreground))] font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg text-[hsl(var(--foreground))]">Sanchar</span>
          </Link>

          <div className="hidden md:flex gap-8">
            <Link href="#features" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
              Features
            </Link>
            <Link href="#testimonials" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
              Testimonials
            </Link>
            <Link href="#about" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
              About
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-6 py-2 rounded-full font-medium hover:opacity-90 transition"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-[hsl(var(--border))] animate-slide-down">
            <div className="flex flex-col gap-3">
              <Link
                href="#features"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition"
              >
                Features
              </Link>
              <Link
                href="#testimonials"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition"
              >
                Testimonials
              </Link>
              <Link
                href="#about"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition"
              >
                About
              </Link>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Hero Component
function Hero() {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--accent))]/10 via-transparent to-transparent"></div>
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-block px-4 py-2 bg-[hsl(var(--secondary))] rounded-full mb-6 fade-in-down border border-[hsl(var(--border))]">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Welcome to the future of team communication</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight fade-in-up">
          Better communication,
          <span className="block text-[hsl(var(--accent))]">zero friction</span>
        </h1>

        <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] mb-8 text-balance max-w-2xl mx-auto fade-in-up">
          Sanchar brings teams together with intuitive messaging, powerful integrations, and lightning-fast performance
          that gets out of your way.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-up">
          <Link
            href="/register"
            className="px-8 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full font-semibold hover:opacity-90 transition transform hover:scale-105 hover-glow flex items-center justify-center gap-2 group"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-[hsl(var(--border))] rounded-full font-semibold hover:bg-[hsl(var(--secondary))] transition hover-lift text-[hsl(var(--foreground))]"
          >
            View Demo
          </Link>
        </div>

        <div className="mt-16 pt-16 border-t border-[hsl(var(--border))] fade-in">
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-sm">Trusted by leading teams</p>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            {["Acme", "TechFlow", "DataSync", "CloudWorks"].map((name, idx) => (
              <div
                key={name}
                className="text-[hsl(var(--foreground))] font-semibold opacity-40 fade-in-up transition-smooth hover:opacity-60"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Component
function Features() {
  const features = [
    {
      title: "Instant Messaging",
      description: "Real-time messaging with typing indicators, reactions, and file sharing built-in.",
      icon: MessageSquare,
    },
    {
      title: "Threaded Conversations",
      description: "Keep discussions organized with threaded replies that stay synchronized.",
      icon: Hash,
    },
    {
      title: "Powerful Search",
      description: "Find exactly what you need with advanced search across all conversations.",
      icon: Search,
    },
    {
      title: "Custom Integrations",
      description: "Connect your favorite tools and automate workflows seamlessly.",
      icon: Link2,
    },
    {
      title: "Enterprise Security",
      description: "End-to-end encryption, SSO, and compliance with industry standards.",
      icon: Shield,
    },
    {
      title: "24/7 Support",
      description: "Our dedicated support team is always ready to help your team succeed.",
      icon: Headphones,
    },
  ];

  return (
    <section id="features" className="px-4 sm:px-6 lg:px-8 py-20 lg:py-32 bg-[hsl(var(--secondary))]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 fade-in-down">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-[hsl(var(--foreground))]">
            Everything you need for <span className="text-[hsl(var(--accent))]">seamless collaboration</span>
          </h2>
          <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
            Packed with powerful features designed to make team communication effortless.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-container">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="bg-[hsl(var(--background))] rounded-xl p-6 hover:border-[hsl(var(--accent))] border border-[hsl(var(--border))] transition fade-in-up hover-glow group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-[hsl(var(--accent))]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <IconComponent className="w-6 h-6 text-[hsl(var(--accent))]" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-[hsl(var(--foreground))]">{feature.title}</h3>
                <p className="text-[hsl(var(--muted-foreground))]">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Testimonials Component
function Testimonials() {
  const testimonials = [
    {
      quote: "Sanchar completely transformed how our team communicates. We're more productive than ever.",
      author: "Sarah Chen",
      role: "Product Manager at TechFlow",
      initials: "SC",
    },
    {
      quote: "The speed and reliability are unmatched. Our team can focus on work, not on tools.",
      author: "Marcus Rodriguez",
      role: "CTO at DataSync",
      initials: "MR",
    },
    {
      quote: "Best communication platform we've tried. The integrations save us hours every week.",
      author: "Emily Watson",
      role: "Operations Lead at CloudWorks",
      initials: "EW",
    },
  ];

  return (
    <section id="testimonials" className="px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 fade-in-down">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-[hsl(var(--foreground))]">Loved by teams worldwide</h2>
          <p className="text-lg text-[hsl(var(--muted-foreground))]">See what our users have to say about Sanchar</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 stagger-container">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-[hsl(var(--card))] rounded-xl p-8 border border-[hsl(var(--border))] fade-in-up hover-glow transition"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-lg mb-6 text-[hsl(var(--foreground))]">"{testimonial.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] flex items-center justify-center font-bold">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold text-[hsl(var(--foreground))]">{testimonial.author}</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Component
function CTA() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[hsl(var(--accent))] rounded-2xl p-12 text-center fade-in-up">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-[hsl(var(--accent-foreground))]">
            Ready to transform your team communication?
          </h2>
          <p className="text-lg text-[hsl(var(--accent-foreground))]/80 mb-8 max-w-2xl mx-auto">
            Join thousands of teams using Sanchar to communicate better, collaborate faster, and ship more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-[hsl(var(--accent-foreground))] text-[hsl(var(--accent))] rounded-full font-semibold hover:opacity-90 transition transform hover:scale-105"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border-2 border-[hsl(var(--accent-foreground))] text-[hsl(var(--accent-foreground))] rounded-full font-semibold hover:bg-[hsl(var(--accent-foreground))]/10 transition"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-[hsl(var(--secondary))] border-t border-[hsl(var(--border))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-[hsl(var(--accent))] rounded flex items-center justify-center">
                <span className="text-[hsl(var(--accent-foreground))] font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-[hsl(var(--foreground))]">Sanchar</span>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] text-sm">Better communication, zero friction.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[hsl(var(--foreground))]">Product</h4>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li>
                <Link href="#features" className="hover:text-[hsl(var(--foreground))] transition">
                  Features
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(var(--foreground))] transition">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(var(--foreground))] transition">
                  Security
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[hsl(var(--foreground))]">Company</h4>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li>
                <Link href="#about" className="hover:text-[hsl(var(--foreground))] transition">
                  About
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(var(--foreground))] transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(var(--foreground))] transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[hsl(var(--foreground))]">Legal</h4>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li>
                <a href="#" className="hover:text-[hsl(var(--foreground))] transition">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(var(--foreground))] transition">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(var(--foreground))] transition">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[hsl(var(--border))] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[hsl(var(--muted-foreground))] text-sm">© {new Date().getFullYear()} Sanchar. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
              Twitter
            </a>
            <a href="#" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
              GitHub
            </a>
            <a href="#" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// About Section
function About() {
  return (
    <section id="about" className="px-4 sm:px-6 lg:px-8 py-20 lg:py-32 bg-[hsl(var(--secondary))]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[hsl(var(--foreground))] mb-6 fade-in-down">
          About Sanchar
        </h2>
        <p className="text-lg md:text-xl text-[hsl(var(--muted-foreground))] leading-relaxed mb-8 fade-in-up">
          Sanchar is a modern, enterprise-ready communication platform designed to replace Slack for your organization. 
          Built with Next.js, Socket.io, and Prisma, it provides secure, real-time messaging with organized channels, 
          direct messages, and powerful collaboration features - all without per-user pricing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 fade-in-up">
          {[
            'Real-time messaging',
            'Public & private channels',
            'Email verification',
            'Direct messages',
            'User presence indicators',
            'Channel invitations',
            'Responsive design',
            'Secure authentication',
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-[hsl(var(--foreground))] fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
              <Check className="w-5 h-5 text-[hsl(var(--accent))] flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-4 fade-in-up">
          {['Next.js', 'Socket.io', 'Prisma', 'TypeScript', 'Tailwind CSS'].map((tech, index) => (
            <span
              key={tech}
              className="px-4 py-2 bg-[hsl(var(--background))] rounded-full text-sm font-medium text-[hsl(var(--foreground))] border border-[hsl(var(--border))] fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// Main Landing Page
export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Hero />
        <Features />
        <Testimonials />
        <About />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
