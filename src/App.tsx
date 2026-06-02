/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { FormWizard } from './components/FormWizard';
import { AdminPanel } from './components/AdminPanel';
import { ShieldAlert, KeyRound, CheckCircle2, Copy, FileText, ExternalLink, HelpCircle, User, Users, ArrowLeft } from 'lucide-react';

// -----------------------------------------------------------------
// Route Protection Guard
// -----------------------------------------------------------------
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const token = localStorage.getItem('luzie_admin_token');
        const headers: any = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/auth/me', { headers });
        const json = await res.json();

        if (res.ok && json.authenticated) {
          setAuthorized(true);
          setEmail(json.email);
        } else {
          localStorage.removeItem('luzie_admin_token');
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    };
    verifySession();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 space-y-3">
        <div className="h-8 w-8 text-brand-500 border-4 border-brand-200 border-t-brand-500 animate-spin rounded-full"></div>
        <span className="text-xs font-bold text-stone-500 uppercase tracking-widest font-sans">Mengamankan Sesi Admin</span>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/admin/login" replace />;
  }

  // Inject user info
  return React.cloneElement(children as React.ReactElement, { adminEmail: email });
};

// -----------------------------------------------------------------
// SUCCESS COMPONENT (Confirmation Screen)
// -----------------------------------------------------------------
const ApplicationSuccess: React.FC = () => {
  const navigate = useNavigate();
  const applicantId = sessionStorage.getItem('luzie_submitted_id') || 'APP-UNKNOWN';
  const name = sessionStorage.getItem('luzie_submitted_name') || 'Pelamar';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(applicantId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-tr from-brand-900 via-brand-600 to-amber-500 flex items-center justify-center relative overflow-hidden">
      {/* Background decorations for a beautiful organic layout */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-linear-to-br from-amber-400/20 to-orange-500/20 opacity-45 blur-3xl animate-pulse" style={{ animationDuration: '7s' }}></div>
        <div className="absolute -bottom-[15%] -right-[15%] w-[65%] h-[65%] rounded-full bg-linear-to-br from-brand-700/25 to-brand-950/45 opacity-45 blur-3xl animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute top-[30%] left-[20%] w-[45%] h-[45%] rounded-full bg-orange-400/10 blur-3xl"></div>
        <div className="absolute inset-0 opacity-15 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Botanical visual SVG underlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none flex items-end justify-center">
        <svg viewBox="0 0 100 100" className="w-[80vw] max-w-(--size-xs) h-auto">
          <path d="M50,0 Q60,25 50,50 Q40,75 50,100" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,20 Q70,10 75,25 Q55,30 50,20" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,40 Q30,30 25,45 Q45,50 50,40" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,60 Q70,50 75,65 Q55,70 50,60" fill="none" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      </div>

      <div className="w-full max-w-lg bg-white rounded-[--radius-bento] border border-bento-sand shadow-[--shadow-bento] overflow-hidden p-8 sm:p-10 text-center space-y-6 relative animate-bounce-in before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-brand-500 before:to-brand-700">
        <div className="inline-flex p-4 bg-green-50 text-state-success border border-green-200 rounded-2xl">
          <CheckCircle2 className="h-12 w-12" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest block">Pengiriman Sukses</span>
          <h1 className="font-serif font-black text-3xl tracking-tight text-editorial-navy">Terima Kasih, {name}!</h1>
          <p className="text-sm text-stone-500 font-medium leading-relaxed px-2">
            Formulir Data Personal Anda telah berhasil disubmit dan akan dicek langsung oleh Tim Rekrutmen Luzie Group.
          </p>
        </div>

        {/* Generated Applicant ID card widget */}
        <div className="p-5 bg-bento-cream border border-bento-sand rounded-[--radius-bento] space-y-3 relative">
          <span className="block text-[9px] font-bold text-brand-600 uppercase tracking-widest">Nomor Berkas Administrasi Anda</span>
          <div className="flex items-center justify-center space-x-3">
            <span className="font-serif font-black text-2xl tracking-tight text-editorial-navy">{applicantId}</span>
            <button
              onClick={handleCopy}
              className="p-2 border border-bento-sand hover:border-brand-400 bg-white hover:bg-brand-50 text-brand-600 rounded-xl transition-all cursor-pointer shadow-[--shadow-bento]"
              title="Salin ID"
            >
              {copied ? <span className="text-[10px] font-bold text-green-600 px-0.5">Disalin</span> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <span className="block text-[10px] text-stone-500 leading-none font-medium">
            Gunakan ID di atas untuk melakukan koordinasi atau tindak lanjut ke HRD.
          </span>
        </div>

        {/* Steps forward */}
        <div className="text-left bg-bento-cream p-5 border border-bento-sand rounded-[--radius-bento] space-y-2 text-sm text-stone-600 font-medium">
          <span className="font-bold text-editorial-navy block uppercase tracking-wider text-[10px]">Langkah Selanjutnya:</span>
          <p className="leading-relaxed">1. Tim HRD kami akan meninjau kelengkapan berkas lamaran Anda.</p>
          <p className="leading-relaxed">2. Silahkan menunggu informasi lebih lanjutnya yang akan di kirimkan via pesan WhatsApp.</p>
        </div>

        <button
          onClick={() => {
            sessionStorage.clear();
            navigate('/apply', { replace: true });
          }}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-[--radius-bento] py-3.5 shadow-[--shadow-bento] transition-all cursor-pointer"
        >
          Isi Formulir Baru
        </button>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------
// ADMIN LOGIN COMPONENT
// -----------------------------------------------------------------
const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorError, setErrorError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const navigate = useNavigate();

  // If already logged in, skip login page
  useEffect(() => {
    const checkLogged = async () => {
      const token = localStorage.getItem('luzie_admin_token');
      if (token) {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.ok ? await res.json() : null;
        if (json?.authenticated) {
          navigate('/admin', { replace: true });
        }
      }
    };
    checkLogged();
  }, [navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorError('Masukkan email korporat dan password.');
      return;
    }

    setLoggingIn(true);
    setErrorError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        localStorage.setItem('luzie_admin_token', json.token);
        navigate('/admin', { replace: true });
      } else {
        setErrorError(json.error || 'Autentikasi gagal. Silakan periksa kredensial admin.');
      }
    } catch {
      setErrorError('Kegagalan sistem di gerbang auth server.');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-tr from-brand-900 via-brand-600 to-amber-500 flex items-center justify-center relative overflow-hidden">
      {/* Background decorations for a beautiful organic layout */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-linear-to-br from-amber-400/25 to-orange-500/20 opacity-45 blur-3xl animate-pulse" style={{ animationDuration: '9s' }}></div>
        <div className="absolute -bottom-[15%] -right-[15%] w-[65%] h-[65%] rounded-full bg-linear-to-br from-brand-700/25 to-brand-950/45 opacity-45 blur-3xl animate-pulse" style={{ animationDuration: '11s' }}></div>
        <div className="absolute inset-0 opacity-15 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden p-8 text-center space-y-6 relative animate-fade-in before:absolute before:top-0 before:left-0 before:right-0 before:h-1.5 before:bg-gradient-to-r before:from-amber-400 before:via-brand-500 before:to-brand-700">
        <div className="inline-flex p-4 bg-brand-100 text-brand-600 rounded-2xl shadow-sm">
          <KeyRound className="h-10 w-10 animate-wiggle" />
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block leading-none">Command Center Portal</span>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">Login Portal Admin</h1>
          <p className="text-xs text-stone-400">Verifikasi kredensial peninjau berkas lamaran.</p>
        </div>

        {errorError && (
          <div className="bg-red-50 border border-red-200 text-state-error p-3 rounded-lg text-xs font-semibold">
            {errorError}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4 text-left text-xs font-medium">
          <div className="space-y-1.5">
            <label className="block text-stone-600 font-bold">Email Admin</label>
            <input
              type="email"
              placeholder="admin@luzie.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-stone-600 font-bold">Kata Sandi</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold text-xs rounded-xl py-3 shadow-md transition-all cursor-pointer mt-2"
          >
            {loggingIn ? 'Membuka Kunci...' : 'Masuk Dashboard'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full border border-stone-200 hover:bg-stone-50 text-stone-600 font-bold text-xs rounded-xl py-2.5 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------
// PUBLIC APPLY MAIN STEP WRAPPER
// -----------------------------------------------------------------
const CandidateFormPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccessRedirect = (newId: string) => {
    sessionStorage.setItem('luzie_submitted_id', newId);
    // Find name from session cache or default
    const nameInput = (document.querySelector('input[placeholder*="Luzie Hermawan"]') as HTMLInputElement)?.value;
    sessionStorage.setItem('luzie_submitted_name', nameInput || 'Pelamar');
    navigate('/success', { replace: true });
  };

  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-tr from-brand-900 via-brand-600 to-amber-500 relative overflow-hidden">
      {/* Background decorations for a beautiful organic layout */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-linear-to-br from-amber-400/25 to-orange-500/20 opacity-45 blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute -bottom-[15%] -right-[15%] w-[65%] h-[65%] rounded-full bg-linear-to-br from-brand-700/25 to-brand-950/45 opacity-45 blur-3xl animate-pulse" style={{ animationDuration: '13s' }}></div>
        <div className="absolute inset-0 opacity-15 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Botanical visual overlay background */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none flex items-end justify-center animate-fade-in">
        <svg viewBox="0 0 100 100" className="w-[85vw] max-w-(--size-xs) h-auto">
          <path d="M50,0 Q60,25 50,50 Q40,75 50,100" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,20 Q70,10 75,25 Q55,30 50,20" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,40 Q30,30 25,45 Q45,50 50,40" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,60 Q70,50 75,65 Q55,70 50,60" fill="none" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      </div>

      <div className="relative z-10 space-y-6">
        {/* Dynamic header navbar logo */}
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between px-2 text-white pb-3 sm:pb-0">
          <div className="font-serif font-black text-2xl tracking-tight text-white select-none">
            Luzie Group
          </div>

          <div className="flex items-center space-x-4 text-xs font-bold text-brand-100">
            <span className="cursor-pointer hover:text-white transition-colors flex items-center space-x-1.5" onClick={() => window.open('mailto:recruitmentluziegroup@gmail.com')}>
              <HelpCircle className="h-4 w-4" />
              <span>Butuh Bantuan?</span>
            </span>
          </div>
        </div>

        <FormWizard onSubmitSuccess={handleSuccessRedirect} />
      </div>
    </div>
  );
};

// -----------------------------------------------------------------
// ROLE SELECTION / LANDING PAGE COMPONENT
// -----------------------------------------------------------------
const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-tr from-brand-900 via-brand-600 to-amber-500 flex items-center justify-center relative overflow-hidden">
      {/* Background decorations for a beautiful organic layout */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-linear-to-br from-amber-400/25 to-orange-500/20 opacity-45 blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute -bottom-[15%] -right-[15%] w-[65%] h-[65%] rounded-full bg-linear-to-br from-brand-700/25 to-brand-950/45 opacity-45 blur-3xl animate-pulse" style={{ animationDuration: '12s' }}></div>
        <div className="absolute inset-0 opacity-15 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Botanical visual SVG underlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none flex items-end justify-center animate-fade-in">
        <svg viewBox="0 0 100 100" className="w-[80vw] max-w-(--size-xs) h-auto">
          <path d="M50,0 Q60,25 50,50 Q40,75 50,100" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,20 Q70,10 75,25 Q55,30 50,20" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,40 Q30,30 25,45 Q45,50 50,40" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,60 Q70,50 75,65 Q55,70 50,60" fill="none" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      </div>

      <div className="w-full max-w-lg bg-white rounded-[--radius-bento] border border-bento-sand shadow-[--shadow-bento] overflow-hidden p-8 sm:p-10 text-center space-y-8 relative animate-bounce-in before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-brand-500 before:to-brand-700">
        {/* Logo Badge */}
        <div className="flex flex-col items-center space-y-2">
          <div className="font-serif text-4xl sm:text-5xl font-black text-editorial-navy tracking-tight select-none pb-1">
            Luzie Group
          </div>
          <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-widest block">Official Recruitment Form</span>
        </div>

        <div className="text-xs text-stone-500 font-medium leading-relaxed max-w-md mx-auto">
          Selamat datang di portal pendaftaran dan peninjauan berkas administrasi pelamar kerja Luzie Group. Silakan masuk sesuai dengan kebutuhan Anda.
        </div>

        {/* Roles Grid — bento cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {/* Candidate Option */}
          <button
            onClick={() => navigate('/apply')}
            className="group p-5 border border-bento-sand hover:border-brand-400 bg-white hover:bg-brand-50/30 rounded-[--radius-bento] transition-all duration-300 text-left shadow-[--shadow-bento] hover:shadow-lg cursor-pointer flex flex-col justify-between space-y-4 bento-card"
          >
            <div className="p-3 bg-brand-50 text-brand-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <User className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-editorial-navy text-sm group-hover:text-brand-600 transition-colors">
                Pelamar
              </h3>
              <p className="text-[11px] text-stone-500 leading-normal font-medium">
                Selesaikan administrasi berkas anda secara lengkap dan detail disini.
              </p>
            </div>
          </button>

          {/* Admin Option */}
          <button
            onClick={() => navigate('/admin')}
            className="group p-5 border border-bento-sand hover:border-brand-400 bg-white hover:bg-brand-50/30 rounded-[--radius-bento] transition-all duration-300 text-left shadow-[--shadow-bento] hover:shadow-lg cursor-pointer flex flex-col justify-between space-y-4 bento-card"
          >
            <div className="p-3 bg-brand-100/75 text-brand-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-editorial-navy text-sm group-hover:text-brand-600 transition-colors">
                System Admin
              </h3>
              <p className="text-[11px] text-stone-500 leading-normal font-medium">
                Limited Access Only.
              </p>
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-bento-sand flex items-center justify-center space-x-2 text-[10px] text-stone-400 font-bold tracking-wide uppercase">
          <span>Recruitment</span>
          <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse"></span>
          <span>Sistem Online</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const handleAdminLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    } finally {
      localStorage.removeItem('luzie_admin_token');
      // Force return to login page
      window.location.href = '/admin/login';
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelectionPage />} />
        <Route path="/apply" element={<CandidateFormPage />} />
        <Route path="/success" element={<ApplicationSuccess />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel onLogout={handleAdminLogout} adminEmail="" />
            </ProtectedRoute>
          }
        />
        {/* Fallback endpoints mappings */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
