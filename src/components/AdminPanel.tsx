import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Download, Check, X, Edit2, LogOut, LayoutDashboard, ListFilter, User, FileText, ArrowLeft, RefreshCw, Calendar, Eye, Briefcase, Plus, Trash2, Save, Printer } from 'lucide-react';
import { Applicant, ApplicationStatus, Anak, Saudara, PendidikanFormal, Kursus, PengalamanKerja, ReferensiPerusahaan, Organisasi, ReferensiKontak } from '../types';
import { AdminDashboard } from './AdminDashboard';
import { VacancyManager } from './VacancyManager';
import { PrintableDetail } from './dashboard/PrintableDetail';

// Indonesian label for each status (used in list and detail badges)
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Pending: 'Belum Direview',
  Reviewed: 'Sedang di Review',
  Accepted: 'Lolos Seleksi',
  Rejected: 'Gugur Seleksi',
  'Interview HR': 'Wawancara HR',
  'Interview User': 'Wawancara User',
};

// Tailwind class for the status badge (used in list and detail pages)
const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  Pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  Reviewed: 'bg-blue-100 text-blue-700 border border-blue-200',
  Accepted: 'bg-green-100 text-green-700 border border-green-200',
  Rejected: 'bg-red-100 text-red-700 border border-red-200',
  'Interview HR': 'bg-purple-100 text-purple-700 border border-purple-200',
  'Interview User': 'bg-indigo-100 text-indigo-700 border border-indigo-200',
};

interface AdminPanelProps {
  onLogout: () => void;
  adminEmail: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout, adminEmail }) => {
  const [candidates, setCandidates] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // View state tracking
  const [viewMode, setViewMode] = useState<'dashboard' | 'list' | 'vacancies'>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Edit Mode state tracking
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecord, setEditedRecord] = useState<Applicant | null>(null);
  const [saving, setSaving] = useState(false);

  // Active section tab inside individual candidate detail view
  const [activeDetailTab, setActiveDetailTab] = useState<number>(1);

  // Print Mode state tracking
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Vacancies manager states
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [vacanciesLoading, setVacanciesLoading] = useState(false);
  const [vacanciesError, setVacanciesError] = useState<string | null>(null);
  const [vacanciesSuccessMsg, setVacanciesSuccessMsg] = useState<string | null>(null);

  const fetchVacancies = async () => {
    setVacanciesLoading(true);
    setVacanciesError(null);
    try {
      const token = localStorage.getItem('luzie_admin_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      // Use the protected admin endpoint — returns ALL vacancies including archived
      const res = await fetch('/api/admin/vacancies', { headers });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setVacancies(data);
      } else if (!res.ok) {
        setVacanciesError(data?.error || 'Gagal memuat daftar lowongan pekerjaan dari server.');
      } else {
        // Response ok but not array — unexpected server response
        setVacanciesError('Respons server tidak valid. Silakan coba refresh.');
      }
    } catch (err) {
      setVacanciesError('Gagal memuat daftar lowongan pekerjaan dari server.');
    } finally {
      setVacanciesLoading(false);
    }
  };

  const saveVacancies = async (updatedVacancies: any[]) => {
    setVacanciesLoading(true);
    setVacanciesError(null);
    setVacanciesSuccessMsg(null);
    try {
      const token = localStorage.getItem('luzie_admin_token');
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use the protected admin endpoint — persists to Google Sheets
      const res = await fetch('/api/admin/vacancies', {
        method: 'POST',
        headers,
        body: JSON.stringify(updatedVacancies)
      });
      const json = await res.json();
      if (res.ok) {
        setVacancies(updatedVacancies);
        setVacanciesSuccessMsg('Daftar lowongan pekerjaan berhasil diaplikasikan dan diaktifkan langsung!');
        setTimeout(() => setVacanciesSuccessMsg(null), 5000);
      } else {
        setVacanciesError(json.error || 'Gagal mengirim draf daftar lowongan ke server.');
      }
    } catch (err) {
      setVacanciesError('Terjadi kegagalan jaringan saat mengirim data ke server.');
    } finally {
      setVacanciesLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, []);

  // Fetch all rows
  const fetchApplicants = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('luzie_admin_token');
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/applications', { headers });
      const json = await res.json();

      if (res.ok && json.data) {
        setCandidates(json.data);
        setLastSyncAt(new Date());
      } else {
        setError(json.error || 'Gagal memuat daftar pelamar dari Google Sheets.');
      }
    } catch (err) {
      setError('Sistem mendeteksi kegagalan koneksi ke API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  // Fetch individual record details if select candidate is triggered
  const fetchSingleApplicant = async (id: string) => {
    try {
      const token = localStorage.getItem('luzie_admin_token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/applications/${id}`, { headers });
      const json = await res.json();
      if (res.ok && json.data) {
        setEditedRecord(json.data);
      }
    } catch (err) {
      console.error('Error fetching details', err);
    }
  };

  useEffect(() => {
    if (selectedId) {
      fetchSingleApplicant(selectedId);
      setIsEditing(false);
      setActiveDetailTab(1);
    } else {
      setEditedRecord(null);
    }
  }, [selectedId]);

  // Map candidate position option based on active vacancies configured on server
  const getOfficialPositionName = (rawTitle: string) => {
    if (!rawTitle) return '';
    const match = vacancies.find(
      (v) => v.title && v.title.toLowerCase().trim() === rawTitle.toLowerCase().trim()
    );
    return match ? match.title : rawTitle;
  };

  // Use vacancies list for position filters instead of form inputs
  const dynamicPositions = useMemo(() => {
    const list = vacancies.map(v => (v.title || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [vacancies]);

  // Filter & Search logic
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter((c) => {
        const query = searchQuery.toLowerCase();
        const nameMatch = (c.namaLengkap || '').toLowerCase().includes(query);
        const phoneMatch = (c.noTelp || '').toLowerCase().includes(query);
        const idMatch = (c.id || '').toLowerCase().includes(query);
        const positionMatch = (c.jabatanDituju || '').toLowerCase().includes(query);
        const searchOk = nameMatch || phoneMatch || idMatch || positionMatch;

        const statusOk = !statusFilter || c.status === statusFilter;
        const cPosition = getOfficialPositionName(c.jabatanDituju);
        const positionOk = !positionFilter || cPosition.toLowerCase().trim() === positionFilter.toLowerCase().trim();

        return searchOk && statusOk && positionOk;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
        if (sortBy === 'oldest') return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();
        return (a.namaLengkap || '').localeCompare(b.namaLengkap || '');
      });
  }, [candidates, searchQuery, statusFilter, positionFilter, sortBy]);

  // Handle Quick Status Change
  const handleStatusChange = async (targetId: string, newStatus: ApplicationStatus) => {
    try {
      const token = localStorage.getItem('luzie_admin_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/applications/${targetId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        // Update local state locally
        setCandidates(prev =>
          prev.map(c => c.id === targetId ? { ...c, status: newStatus, lastUpdated: new Date().toISOString() } : c)
        );
        if (editedRecord && editedRecord.id === targetId) {
          setEditedRecord(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        alert('Gagal memperbaharui status pendaftar.');
      }
    } catch {
      alert('Kegagalan jaringan saat mengirim data update status.');
    }
  };

  // Handle Save of Modified Candidate Data
  const handleSaveEditedForm = async () => {
    if (!editedRecord) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('luzie_admin_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/applications/${editedRecord.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editedRecord)
      });

      if (res.ok) {
        setIsEditing(false);
        // Refresh local items
        await fetchApplicants();
        // Fetch to confirm update
        await fetchSingleApplicant(editedRecord.id);
        alert('Data personal pelamar berhasil dipos dan disimpan ke Google Sheets!');
      } else {
        const errorRes = await res.json();
        alert(errorRes.error || 'Gagal menyimpan data perubahan.');
      }
    } catch {
      alert('Gagal menyinkronkan data perubahan ke server.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerPdfDownload = async (id: string) => {
    try {
      const token = localStorage.getItem('luzie_admin_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/admin/applications/${id}`, { headers });
      if (!res.ok) throw new Error('Gagal mengambil data pelamar.');
      const { data: applicant } = await res.json();
      if (!applicant) throw new Error('Data pelamar tidak ditemukan.');

      const { pdf } = await import('@react-pdf/renderer');
      const { MyPdfDocument } = await import('../lib/pdf');
      const React = await import('react');
      const blob = await pdf(React.createElement(MyPdfDocument, { applicant })).toBlob();

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Data_Personal_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('Sistem gagal mencetak dokumen PDF. Silahkan periksa koneksi atau coba masuk kembali.');
    }
  };

  // Multi-fields edit state setters
  const editField = (key: keyof Applicant, val: any) => {
    setEditedRecord(prev => prev ? { ...prev, [key]: val } : null);
  };

  const handleEditNested = (field: 'anak' | 'saudara' | 'pendidikanFormal' | 'kursus' | 'pengalamanKerja' | 'referensiPerusahaan' | 'organisasi' | 'referensiKontak', index: number, subField: string, value: any) => {
    setEditedRecord(prev => {
      if (!prev) return null;
      const arr = [...(prev[field] as any[])];
      arr[index] = { ...arr[index], [subField]: value };
      return { ...prev, [field]: arr };
    });
  };

  const handleAddNestedRow = (field: 'anak' | 'saudara' | 'pendidikanFormal' | 'kursus' | 'pengalamanKerja' | 'referensiPerusahaan' | 'organisasi' | 'referensiKontak', defaultObj: any) => {
    setEditedRecord(prev => {
      if (!prev) return null;
      const arr = [...(prev[field] as any[])];
      arr.push(defaultObj);
      return { ...prev, [field]: arr };
    });
  };

  const handleRemoveNestedRow = (field: 'anak' | 'saudara' | 'pendidikanFormal' | 'kursus' | 'pengalamanKerja' | 'referensiPerusahaan' | 'organisasi' | 'referensiKontak', index: number) => {
    setEditedRecord(prev => {
      if (!prev) return null;
      const arr = [...(prev[field] as any[])];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  };

  const notificationList = useMemo(() => {
    return candidates.filter(c =>
      c.status === 'Pending' ||
      c.status === 'Reviewed' ||
      c.status === 'Interview HR' ||
      c.status === 'Interview User'
    );
  }, [candidates]);

  const selectedCandidate = candidates.find(c => c.id === selectedId);

  // Quick tabs toggles referencing recruit screenshot
  const handleNavTabClick = (mode: 'dashboard' | 'list' | 'vacancies') => {
    setSelectedId(null); // clear individual view to show overview
    setIsPrintMode(false);
    setViewMode(mode);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-stone-900" id="admin-panel-master">
      {/* Top Navbar styled after recruit mockup */}
      <nav className="no-print sticky top-0 z-50 bg-white border-b border-stone-100 shadow-xs h-16 flex items-center justify-between px-6">
        {/* Left Side: Brand Logo */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2 select-none">
            <div className="h-8 w-8 rounded-lg bg-stone-900 flex items-center justify-center text-white">
              <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12 2L2 22h20zM12 6l7.5 13h-15z" />
              </svg>
            </div>
            <span className="font-sans font-extrabold text-lg text-stone-950 tracking-tight">Luzie Group</span>
          </div>

          {/* Navigation Tabs based on Mockup */}
          <div className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => handleNavTabClick('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'dashboard' && !selectedId
                  ? 'bg-[#EEF2F6] text-indigo-650'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => handleNavTabClick('list')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                (viewMode === 'list' && !selectedId) || (selectedId && viewMode !== 'vacancies')
                  ? 'bg-[#EEF2F6] text-indigo-650'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <ListFilter className="h-4 w-4" />
              <span>Daftar Pelamar</span>
            </button>
            <button
              onClick={() => handleNavTabClick('vacancies')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'vacancies'
                  ? 'bg-[#EEF2F6] text-indigo-650'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Kelola Lowongan</span>
            </button>
          </div>
        </div>

        {/* Center/Right: Interactive Search and Utilities */}
        <div className="flex items-center space-x-6 flex-1 justify-end max-w-4xl">
          {/* Mockup styled rounded search box */}
          <div className="relative w-full max-w-xs hidden sm:block">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search here..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (viewMode !== 'list') setViewMode('list');
              }}
              className="w-full bg-[#F4F6F9] border-0 rounded-full pl-10 pr-4 py-2 text-xs transition-all outline-hidden focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Status Indicators & Action Icons */}
          <div className="flex items-center space-x-3.5 text-stone-500 relative">
            {/* Interactive Notifications Dial */}
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`h-9 w-9 rounded-full transition-all flex items-center justify-center relative cursor-pointer ${
                isNotifOpen ? 'bg-indigo-50 text-indigo-650' : 'hover:bg-stone-100'
              }`} 
              title="Notifikasi Tindak Lanjut"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notificationList.length > 0 && (
                <>
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-[10px] font-black text-white rounded-full flex items-center justify-center shadow-xs">
                    {notificationList.length}
                  </span>
                  <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-400 rounded-full animate-ping"></span>
                </>
              )}
            </button>

            {/* Notifications Dropdown menu */}
            {isNotifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-stone-200 shadow-xl p-4 z-[99] text-xs font-sans space-y-3.5 text-stone-700 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                    <h4 className="font-extrabold text-stone-900">Perlu Tindakan ({notificationList.length})</h4>
                  </div>
                  <button 
                    onClick={() => setIsNotifOpen(false)}
                    className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2.5 divide-y divide-stone-50 pr-1">
                  {notificationList.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="h-10 w-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-100">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">Semua Berkas Bersih</p>
                        <p className="text-[10px] text-stone-405 leading-none mt-1">Sangat bagus! Tidak ada tugas tinjauan pelamar yang tersisa.</p>
                      </div>
                    </div>
                  ) : (
                    notificationList.map((c, idx) => {
                      const status = c.status;
                      const isPending = status === 'Pending';
                      const isReviewed = status === 'Reviewed';
                      const isInterviewHR = status === 'Interview HR';
                      const isInterviewUser = status === 'Interview User';
                      const notifBadgeClass = isPending
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : isReviewed
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                        : isInterviewHR
                        ? 'bg-purple-50 text-purple-700 border border-purple-150'
                        : isInterviewUser
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        : 'bg-stone-50 text-stone-700 border border-stone-100';
                      const notifLabel = isPending
                        ? 'Verifikasi'
                        : isReviewed
                        ? 'Shortlisted'
                        : isInterviewHR
                        ? 'Wawancara HR'
                        : isInterviewUser
                        ? 'Wawancara User'
                        : status;
                      return (
                        <div
                          key={c.id || idx}
                          onClick={() => {
                            if (c.id) {
                              setSelectedId(c.id);
                              setIsNotifOpen(false);
                            }
                          }}
                          className="pt-2 flex flex-col text-left space-y-1 hover:bg-stone-50/70 p-2 rounded-xl transition-all cursor-pointer first:pt-0 border-transparent!"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900 text-xs truncate max-w-[140px]">{c.namaLengkap}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${notifBadgeClass}`}>
                              {notifLabel}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-405 font-semibold">Tujuan: {getOfficialPositionName(c.jabatanDituju) || '-'}</p>
                          <span className="text-[9px] text-[#4F46E5] font-bold hover:underline flex items-center space-x-0.5 mt-1">
                            <span>Lakukan Evaluasi Profil &rarr;</span>
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Frame with Green Indicator */}
          <div className="flex items-center space-x-3 pl-3 border-l border-stone-200">
            <div className="relative cursor-pointer group">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center border border-indigo-100 shadow-xs">
                {adminEmail.substring(0, 2).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            
            <div className="text-left hidden md:block">
              <h4 className="text-xs font-bold text-stone-900 leading-tight">Admin Luzie</h4>
              <p className="text-[10px] text-stone-400 font-medium">{adminEmail}</p>
            </div>

            {/* Logout Action */}
            <button
              onClick={onLogout}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Body */}
      <main className="grain-overlay max-w-7xl mx-auto py-8 px-6">
        {!selectedId ? (
          <>
            {/* Header Title and Dynamic Filter view selectors */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4 lg:hidden">
                {/* Responsive View Switches on small viewports */}
                <div className="flex items-center space-x-1 bg-stone-200/50 p-1.5 rounded-xl">
                  <button
                    onClick={() => setViewMode('dashboard')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Ikhtisar
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Daftar ({candidates.length})
                  </button>
                  <button
                    onClick={() => setViewMode('vacancies')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      viewMode === 'vacancies' ? 'bg-white text-indigo-600 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Lowongan ({vacancies.length})
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-10 w-10 text-brand-500 animate-spin" />
                <p className="text-sm text-stone-500 font-medium">Menghubungi Google Sheets API...</p>
              </div>
            ) : error ? (
              <div className="py-12 px-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex flex-col items-center space-y-3">
                <p className="font-semibold">{error}</p>
                <button
                  onClick={fetchApplicants}
                  className="px-4 py-2 text-xs font-bold bg-white text-red-700 hover:bg-red-100 rounded-xl shadow-xs border border-red-200 transition-all cursor-pointer"
                >
                  Coba Sinkron Ulang
                </button>
              </div>
            ) : viewMode === 'dashboard' ? (
              <AdminDashboard
                applicants={candidates}
                onSelectApplicant={(id) => setSelectedId(id)}
                onViewAll={() => setViewMode('list')}
                vacancies={vacancies}
                adminEmail={adminEmail}
                lastSyncAt={lastSyncAt}
              />
            ) : viewMode === 'vacancies' ? (
              <VacancyManager
                vacancies={vacancies}
                onSave={saveVacancies}
                loading={vacanciesLoading}
                successMessage={vacanciesSuccessMsg}
                errorMessage={vacanciesError}
                onRefresh={fetchVacancies}
              />
            ) : (
              // Filter and Listing Space
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  {/* Search query field */}
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-stone-500">Cari Pelamar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Cari nama, no. hp, atau ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Status filter select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-stone-500">Filter Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs transition-all outline-hidden cursor-pointer"
                    >
                      <option value="">Semua Status ({candidates.length})</option>
                      <option value="Pending">Belum Direview ({candidates.filter(c => c.status === 'Pending').length})</option>
                      <option value="Reviewed">Sedang Direview ({candidates.filter(c => c.status === 'Reviewed').length})</option>
                      <option value="Interview HR">Wawancara HR ({candidates.filter(c => c.status === 'Interview HR').length})</option>
                      <option value="Interview User">Wawancara User ({candidates.filter(c => c.status === 'Interview User').length})</option>
                      <option value="Accepted">Diterima ({candidates.filter(c => c.status === 'Accepted').length})</option>
                      <option value="Rejected">Ditolak ({candidates.filter(c => c.status === 'Rejected').length})</option>
                    </select>
                  </div>

                  {/* Job/Position filter select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-stone-500">Filter Posisi / Jabatan</label>
                    <select
                      value={positionFilter}
                      onChange={(e) => setPositionFilter(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs transition-all outline-hidden cursor-pointer"
                    >
                      <option value="">Semua Posisi</option>
                      {dynamicPositions.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sorting criteria select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-stone-500">Urutkan</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs transition-all outline-hidden cursor-pointer"
                    >
                      <option value="newest">Terbaru Mendaftar</option>
                      <option value="oldest">Terlama Mendaftar</option>
                      <option value="name">Urutan Abjad Nama</option>
                    </select>
                  </div>
                </div>

                {/* Candidate List Data Table */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-stone-200 text-xs font-bold uppercase text-stone-600 bg-stone-50">
                          <th className="py-4 px-5">ID Pelamar</th>
                          <th className="py-4 px-5">Nama Pelamar</th>
                          <th className="py-4 px-5">Jabatan Lengkap</th>
                          <th className="py-4 px-5">Kontak</th>
                          <th className="py-4 px-5">Tanggal Daftar</th>
                          <th className="py-4 px-5">Status</th>
                          <th className="py-4 px-5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-150 text-xs text-stone-700">
                        {filteredCandidates.length > 0 ? (
                          filteredCandidates.map((c, idx) => (
                            <tr key={c.id || idx} className="hover:bg-brand-50 transition-colors">
                              <td className="py-4 px-5 font-mono font-medium text-stone-500">{c.id}</td>
                              <td className="py-4 px-5 font-bold text-stone-900">{c.namaLengkap}</td>
                              <td className="py-4 px-5 font-semibold text-stone-700">{getOfficialPositionName(c.jabatanDituju)}</td>
                              <td className="py-4 px-5">
                                <span className="block">{c.emailPribadi}</span>
                                <span className="block text-stone-500 text-[10px] mt-0.5">{c.noTelp}</span>
                              </td>
                              <td className="py-4 px-5 text-stone-500">{new Date(c.submissionDate).toLocaleDateString('id-ID')}</td>
                              <td className="py-4 px-5">
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${STATUS_BADGE_CLASS[c.status]}`}>
                                  {STATUS_LABELS[c.status]}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-center flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => setSelectedId(c.id)}
                                  className="flex items-center space-x-1 border border-stone-200 hover:border-brand-500 hover:text-brand-500 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Tinjau</span>
                                </button>
                                <button
                                  onClick={() => handleTriggerPdfDownload(c.id)}
                                  className="flex items-center text-stone-500 hover:text-brand-600 border border-stone-200 hover:border-brand-500 p-1.5 rounded-lg transition-all cursor-pointer"
                                  title="Download PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-stone-500 font-medium">
                              Tidak ada data pelamar yang cocok dengan kriteria pencarian / filter Anda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // DETAILED CANDIDATE LAYOUT VIEW
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="no-print flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 pb-4 border-b border-stone-200">
              <button
                onClick={() => { setSelectedId(null); setIsPrintMode(false); }}
                className="flex items-center space-x-2 text-stone-600 hover:text-stone-900 border border-stone-200 bg-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer self-start"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Daftar</span>
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center space-x-2 border text-xs font-bold rounded-xl px-4 py-2.5 shadow-xs transition-all cursor-pointer ${
                    isEditing
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-brand-500 hover:text-brand-500'
                  }`}
                >
                  <Edit2 className="h-4 w-4" />
                  <span>{isEditing ? 'Batal Edit' : 'Edit Formulir'}</span>
                </button>
                <button
                  onClick={() => setIsPrintMode(true)}
                  className="flex items-center justify-center border border-stone-200 bg-white text-stone-700 hover:border-brand-500 hover:text-brand-500 text-xs font-bold rounded-xl px-3 py-2.5 shadow-xs transition-all cursor-pointer"
                  title="Mode Cetak — tampilkan tampilan siap-cetak di layar"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleTriggerPdfDownload(selectedId)}
                  className="flex items-center space-x-2 bg-brand-500 text-white hover:bg-brand-600 text-xs font-bold rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* Main Info Card Layout (or printable view) */}
            {isPrintMode && selectedCandidate ? (
              <div className="space-y-4 print-only">
                <div className="no-print flex items-center justify-between sticky top-20 z-10 bg-white p-3 rounded-xl border border-stone-200 shadow-xs">
                  <button
                    onClick={() => setIsPrintMode(false)}
                    className="flex items-center space-x-2 text-stone-600 hover:text-stone-900 border border-stone-200 bg-white rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Keluar Mode Cetak</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-2 bg-brand-500 text-white hover:bg-brand-600 text-xs font-bold rounded-xl px-4 py-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Cetak (Print Browser)</span>
                  </button>
                </div>
                <PrintableDetail applicant={selectedCandidate} />
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left detail area: all sections */}
              <div className="lg:col-span-2 space-y-6">
                {/* 8-Steps section tabs nested navigation inside detail panel */}
                <div className="flex border-b border-stone-200 overflow-x-auto bg-white p-2 rounded-t-2xl space-x-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((stepNum) => {
                    const stepNames = [
                      'Identitas Pribadi',
                      'Keluarga & Lingkungan',
                      'Riwayat Pendidikan',
                      'Pengalaman Kerja',
                      'Minat & Konsep Diri',
                      'Sosial & Organisasi',
                      'Ekspektasi & Kesehatan',
                      'Referensi'
                    ];
                    return (
                      <button
                        key={stepNum}
                        onClick={() => setActiveDetailTab(stepNum)}
                        className={`whitespace-nowrap px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          activeDetailTab === stepNum
                            ? 'bg-brand-500 text-white shadow-xs'
                            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                      >
                        {stepNum}. {stepNames[stepNum - 1]}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-white p-6 rounded-b-2xl border-x border-b border-stone-200 shadow-sm space-y-6">
                  {editedRecord ? (
                    <>
                      {/* Step 1: Identitas Pribadi */}
                      {activeDetailTab === 1 && (
                        <div className="space-y-4">
                          <h3 className="text-base font-bold text-brand-600 border-b border-stone-100 pb-2">1. Identitas Pribadi</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Nama Lengkap</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.namaLengkap} onChange={(e) => editField('namaLengkap', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm font-semibold text-stone-900">{editedRecord.namaLengkap}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Nomor KTP (16 Digit)</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.nomorKtp} onChange={(e) => editField('nomorKtp', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm font-semibold text-stone-900">{editedRecord.nomorKtp}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Tempat Lahir</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.tempatLahir} onChange={(e) => editField('tempatLahir', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm text-stone-800">{editedRecord.tempatLahir}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Tanggal Lahir</label>
                              {isEditing ? (
                                <input type="date" value={editedRecord.tanggalLahir} onChange={(e) => editField('tanggalLahir', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm text-stone-800">{editedRecord.tanggalLahir}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Email Pribadi</label>
                              {isEditing ? (
                                <input type="email" value={editedRecord.emailPribadi} onChange={(e) => editField('emailPribadi', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm text-stone-800 font-mono">{editedRecord.emailPribadi}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Nomor HP / Telp</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.noTelp} onChange={(e) => editField('noTelp', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm text-stone-800 font-semibold">{editedRecord.noTelp}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Jenis Kelamin</label>
                              {isEditing ? (
                                <select value={editedRecord.jenisKelamin} onChange={(e) => editField('jenisKelamin', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs outline-hidden cursor-pointer">
                                  <option value="Laki-laki">Laki-laki</option>
                                  <option value="Perempuan">Perempuan</option>
                                </select>
                              ) : (
                                <p className="text-sm text-stone-800">{editedRecord.jenisKelamin}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Agama</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.agama} onChange={(e) => editField('agama', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm text-stone-800">{editedRecord.agama}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Status Pernikahan</label>
                              {isEditing ? (
                                <select value={editedRecord.statusPernikahan} onChange={(e) => editField('statusPernikahan', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs outline-hidden cursor-pointer">
                                  <option value="Single">Single</option>
                                  <option value="Tunangan">Tunangan</option>
                                  <option value="Menikah">Menikah</option>
                                  <option value="Bercerai">Bercerai</option>
                                </select>
                              ) : (
                                <p className="text-sm text-stone-800">
                                  {editedRecord.statusPernikahan} {editedRecord.tanggalStatusPernikahan ? `(${editedRecord.tanggalStatusPernikahan})` : ''}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Golongan Darah</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.golonganDarah} onChange={(e) => editField('golonganDarah', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm text-stone-800">{editedRecord.golonganDarah || '-'}</p>
                              )}
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Alamat Tempat Tinggal</label>
                              {isEditing ? (
                                <textarea value={editedRecord.alamatTinggal} onChange={(e) => editField('alamatTinggal', e.target.value)} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm text-stone-800 whitespace-pre-wrap">{editedRecord.alamatTinggal}</p>
                              )}
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Alamat Sesuai KTP</label>
                              {isEditing ? (
                                <textarea value={editedRecord.alamatKtp} onChange={(e) => editField('alamatKtp', e.target.value)} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm text-stone-800 whitespace-pre-wrap">{editedRecord.alamatKtp}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Keluarga & Lingkungan */}
                      {activeDetailTab === 2 && (
                        <div className="space-y-6">
                          <h3 className="text-base font-bold text-brand-600 border-b border-stone-100 pb-2">2. Keluarga & Lingkungan</h3>

                          {/* Pasangan (If Married or Divorced) */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Data Pasangan</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase">Nama Suami / Istri</label>
                                {isEditing ? (
                                  <input type="text" value={editedRecord.namaPasangan || ''} onChange={(e) => editField('namaPasangan', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                                ) : (
                                  <p className="text-sm text-stone-800">{editedRecord.namaPasangan || '-'}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase">TTL Pasangan</label>
                                {isEditing ? (
                                  <input type="text" value={editedRecord.ttlPasangan || ''} onChange={(e) => editField('ttlPasangan', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                                ) : (
                                  <p className="text-sm text-stone-800">{editedRecord.ttlPasangan || '-'}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Children */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Anak</h4>
                              {isEditing && (
                                <button type="button" onClick={() => handleAddNestedRow('anak', { nama: '', ttl: '', pendidikan: '' })} className="text-xs text-brand-600 px-2 py-1 font-bold">
                                  + Tambah Anak
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {(editedRecord.anak || []).map((ch, idx) => (
                                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-250 flex items-center space-x-3">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input type="text" placeholder="Nama Anak" disabled={!isEditing} value={ch.nama} onChange={(e) => handleEditNested('anak', idx, 'nama', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="TTL Anak" disabled={!isEditing} value={ch.ttl} onChange={(e) => handleEditNested('anak', idx, 'ttl', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Pendidikan Anak" disabled={!isEditing} value={ch.pendidikan} onChange={(e) => handleEditNested('anak', idx, 'pendidikan', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                  </div>
                                  {isEditing && (
                                    <button onClick={() => handleRemoveNestedRow('anak', idx)} className="text-red-500 p-1">
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {(!editedRecord.anak || editedRecord.anak.length === 0) && (
                                <p className="text-xs text-stone-500 font-medium italic">Tidak ada data anak dimasukkan.</p>
                              )}
                            </div>
                          </div>

                          {/* Parents */}
                          <div className="space-y-4 pt-4 border-t border-stone-100">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Data Orang Tua / Wali</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase">Nama Ayah / Ibu / Wali</label>
                                {isEditing ? (
                                  <input type="text" value={editedRecord.namaOrtu} onChange={(e) => editField('namaOrtu', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                                ) : (
                                  <p className="text-sm font-semibold text-stone-900">{editedRecord.namaOrtu}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase">Pekerjaan Orang Tua</label>
                                {isEditing ? (
                                  <input type="text" value={editedRecord.pekerjaanOrtu} onChange={(e) => editField('pekerjaanOrtu', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                                ) : (
                                  <p className="text-sm text-stone-800">{editedRecord.pekerjaanOrtu}</p>
                                )}
                              </div>
                              <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase">Alamat Orang Tua</label>
                                {isEditing ? (
                                  <textarea value={editedRecord.alamatOrtu} onChange={(e) => editField('alamatOrtu', e.target.value)} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                                ) : (
                                  <p className="text-sm text-stone-800 whitespace-pre-wrap">{editedRecord.alamatOrtu}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Siblings */}
                          <div className="space-y-4 pt-4 border-t border-stone-100">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Saudara Kandung</h4>
                              {isEditing && (
                                <button type="button" onClick={() => handleAddNestedRow('saudara', { nama: '', kakakAdik: '', usia: '', pendidikanPekerjaan: '' })} className="text-xs text-brand-600 px-2 py-1 font-bold">
                                  + Tambah Saudara
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {(editedRecord.saudara || []).map((sd, idx) => (
                                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-250 flex items-center space-x-3">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <input type="text" placeholder="Nama Saudara" disabled={!isEditing} value={sd.nama} onChange={(e) => handleEditNested('saudara', idx, 'nama', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <select disabled={!isEditing} value={sd.kakakAdik} onChange={(e) => handleEditNested('saudara', idx, 'kakakAdik', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg">
                                      <option value="">Status</option>
                                      <option value="Kakak">Kakak</option>
                                      <option value="Adik">Adik</option>
                                    </select>
                                    <input type="text" placeholder="Usia" disabled={!isEditing} value={sd.usia} onChange={(e) => handleEditNested('saudara', idx, 'usia', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Pendidikan / Pekerjaan" disabled={!isEditing} value={sd.pendidikanPekerjaan} onChange={(e) => handleEditNested('saudara', idx, 'pendidikanPekerjaan', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                  </div>
                                  {isEditing && (
                                    <button onClick={() => handleRemoveNestedRow('saudara', idx)} className="text-red-500 p-1">
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {(!editedRecord.saudara || editedRecord.saudara.length === 0) && (
                                <p className="text-xs text-stone-500 font-medium italic">Tidak ada data saudara kandung dimasukkan.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Riwayat Pendidikan */}
                      {activeDetailTab === 3 && (
                        <div className="space-y-6">
                          <h3 className="text-base font-bold text-brand-600 border-b border-stone-100 pb-2">3. Riwayat Pendidikan</h3>

                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Pendidikan Formal (Terakhir)</h4>
                            <div className="space-y-3">
                              {(editedRecord.pendidikanFormal || []).map((pf, idx) => (
                                <div key={idx} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-stone-500 font-semibold">Tahun</label>
                                    <div className="flex items-center space-x-1">
                                      <input type="text" placeholder="Dari" disabled={!isEditing} value={pf.dari} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'dari', e.target.value)} className="w-1/2 bg-white border text-xs p-1.5 rounded-lg" />
                                      <input type="text" placeholder="Sampai" disabled={!isEditing} value={pf.sampai} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'sampai', e.target.value)} className="w-1/2 bg-white border text-xs p-1.5 rounded-lg" />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-stone-500 font-semibold">Sekolah / Universitas</label>
                                    <input type="text" disabled={!isEditing} value={pf.sekolah} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'sekolah', e.target.value)} className="w-full bg-white border text-xs p-1.5 rounded-lg" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-stone-500 font-semibold">Jurusan / Kota</label>
                                    <div className="flex items-center space-x-1">
                                      <input type="text" placeholder="Jurusan" disabled={!isEditing} value={pf.jurusan} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'jurusan', e.target.value)} className="w-1/2 bg-white border text-xs p-1.5 rounded-lg" />
                                      <input type="text" placeholder="Kota" disabled={!isEditing} value={pf.kota} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'kota', e.target.value)} className="w-1/2 bg-white border text-xs p-1.5 rounded-lg" />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-stone-500 font-semibold">Kepemilikan Ijazah</label>
                                    <select disabled={!isEditing} value={pf.ijazah} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'ijazah', e.target.value)} className="w-full bg-white border text-xs p-1.5 rounded-lg outline-hidden cursor-pointer">
                                      <option value="">Pilih</option>
                                      <option value="Ya">Ya (Lulus)</option>
                                      <option value="Tidak">Tidak</option>
                                      <option value="Dalam Proses">Dalam Proses</option>
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-stone-100">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Kursus & Pelatihan</h4>
                              {isEditing && (
                                <button type="button" onClick={() => handleAddNestedRow('kursus', { bidang: '', lamanya: '', tempat: '' })} className="text-xs text-brand-600 px-2 py-1 font-bold">
                                  + Tambah Kursus
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {(editedRecord.kursus || []).map((ks, idx) => (
                                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-250 flex items-center space-x-3">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input type="text" placeholder="Bidang Kursus" disabled={!isEditing} value={ks.bidang} onChange={(e) => handleEditNested('kursus', idx, 'bidang', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Lamanya (Durasi)" disabled={!isEditing} value={ks.lamanya} onChange={(e) => handleEditNested('kursus', idx, 'lamanya', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Tempat / Penyelenggara" disabled={!isEditing} value={ks.tempat} onChange={(e) => handleEditNested('kursus', idx, 'tempat', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                  </div>
                                  {isEditing && (
                                    <button onClick={() => handleRemoveNestedRow('kursus', idx)} className="text-red-500 p-1">
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {(!editedRecord.kursus || editedRecord.kursus.length === 0) && (
                                <p className="text-xs text-stone-500 font-medium italic">Tidak ada data kursus dimasukkan.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 4: Riwayat Pekerjaan */}
                      {activeDetailTab === 4 && (
                        <div className="space-y-6">
                          <h3 className="text-base font-bold text-brand-600 border-b border-stone-100 pb-2">4. Pengalaman Kerja</h3>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Pekerjaan Sebelumnya</h4>
                              {isEditing && (
                                <button type="button" onClick={() => handleAddNestedRow('pengalamanKerja', { perusahaan: '', dari: '', sampai: '', jabatan: '', gaji: '', alasanPindah: '' })} className="text-xs text-brand-600 px-2 py-1 font-bold">
                                  + Riwayat Kerja
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {(editedRecord.pengalamanKerja || []).map((pk, idx) => (
                                <div key={idx} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex space-x-4 items-start">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] text-stone-500 font-bold uppercase">Perusahaan</span>
                                      <input type="text" disabled={!isEditing} value={pk.perusahaan} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'perusahaan', e.target.value)} className="w-full bg-white border text-xs p-1.5 rounded-lg" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] text-stone-500 font-bold uppercase">Periode</span>
                                      <div className="flex space-x-1">
                                        <input type="text" placeholder="Dari" disabled={!isEditing} value={pk.dari} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'dari', e.target.value)} className="w-1/2 bg-white border text-xs p-1.5 rounded-lg" />
                                        <input type="text" placeholder="Hingga" disabled={!isEditing} value={pk.sampai} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'sampai', e.target.value)} className="w-1/2 bg-white border text-xs p-1.5 rounded-lg" />
                                      </div>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] text-stone-500 font-bold uppercase">Jabatan Dituju</span>
                                      <input type="text" disabled={!isEditing} value={pk.jabatan} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'jabatan', e.target.value)} className="w-full bg-white border text-xs p-1.5 rounded-lg" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] text-stone-500 font-bold uppercase">Gaji Akhir</span>
                                      <input type="text" disabled={!isEditing} value={pk.gaji} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'gaji', e.target.value)} className="w-full bg-white border text-xs p-1.5 rounded-lg" />
                                    </div>
                                    <div className="md:col-span-2 space-y-0.5">
                                      <span className="text-[9px] text-stone-500 font-bold uppercase">Alasan Mengundurkan Diri</span>
                                      <input type="text" disabled={!isEditing} value={pk.alasanPindah} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'alasanPindah', e.target.value)} className="w-full bg-white border text-xs p-1.5 rounded-lg" />
                                    </div>
                                  </div>
                                  {isEditing && (
                                    <button onClick={() => handleRemoveNestedRow('pengalamanKerja', idx)} className="text-red-500 mt-5">
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-500 uppercase">Uraian Jobdesk Terakhir</label>
                            {isEditing ? (
                              <textarea value={editedRecord.jobdeskTerakhir} onChange={(e) => editField('jobdeskTerakhir', e.target.value)} rows={3} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                            ) : (
                              <p className="text-xs text-stone-800 whitespace-pre-wrap">{editedRecord.jobdeskTerakhir || '-'}</p>
                            )}
                          </div>

                          {/* Reference company */}
                          <div className="space-y-4 pt-4 border-t border-stone-100">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Referensi Atasan / Perusahaan Sebelumnya</h4>
                              {isEditing && (
                                <button type="button" onClick={() => handleAddNestedRow('referensiPerusahaan', { perusahaan: '', kontak: '', telp: '', hubungan: '' })} className="text-xs text-brand-600 px-2 py-1 font-bold">
                                  + Referensi Kerja
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {(editedRecord.referensiPerusahaan || []).map((rf, idx) => (
                                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-250 flex items-center space-x-3">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <input type="text" placeholder="Perusahaan" disabled={!isEditing} value={rf.perusahaan} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'perusahaan', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Nama Atasan" disabled={!isEditing} value={rf.kontak} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'kontak', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="No HP" disabled={!isEditing} value={rf.telp} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'telp', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Hubungan Kerja" disabled={!isEditing} value={rf.hubungan} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'hubungan', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                  </div>
                                  {isEditing && (
                                    <button onClick={() => handleRemoveNestedRow('referensiPerusahaan', idx)} className="text-red-500 p-1">
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 5: Minat & Konsep Diri */}
                      {activeDetailTab === 5 && (
                        <div className="space-y-4">
                          <h3 className="text-base font-bold text-brand-600 border-b border-stone-100 pb-2">5. Minat & Konsep Diri</h3>

                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Jabatan yang Dituju</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.jabatanDituju} onChange={(e) => editField('jabatanDituju', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm font-bold text-brand-650">{getOfficialPositionName(editedRecord.jabatanDituju) || '-'}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Alasan melamar jabatan tersebut</label>
                              {isEditing ? (
                                <textarea value={editedRecord.alasanJabatan} onChange={(e) => editField('alasanJabatan', e.target.value)} rows={3} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-800 whitespace-pre-wrap">{editedRecord.alasanJabatan}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Mengerti tugas dan tanggung jawab jabatan tersebut?</label>
                              {isEditing ? (
                                <textarea value={editedRecord.pengetahuanJabatan} onChange={(e) => editField('pengetahuanJabatan', e.target.value)} rows={3} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-800 whitespace-pre-wrap">{editedRecord.pengetahuanJabatan}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Lingkungan kerja yang disenangi dan sebabnya</label>
                              {isEditing ? (
                                <textarea value={editedRecord.lingkunganKerja} onChange={(e) => editField('lingkunganKerja', e.target.value)} rows={3} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-800 whitespace-pre-wrap">{editedRecord.lingkunganKerja}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Cita-Cita Hidup</label>
                              {isEditing ? (
                                <textarea value={editedRecord.citaCita} onChange={(e) => editField('citaCita', e.target.value)} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-800 whitespace-pre-wrap">{editedRecord.citaCita}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Hal paling sulit untuk mengambil keputusan</label>
                              {isEditing ? (
                                <textarea value={editedRecord.kesulitanKeputusan} onChange={(e) => editField('kesulitanKeputusan', e.target.value)} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-800 whitespace-pre-wrap">{editedRecord.kesulitanKeputusan}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 6: Sosial & Kegiatan */}
                      {activeDetailTab === 6 && (
                        <div className="space-y-6">
                          <h3 className="text-base font-bold text-brand-600 border-b border-stone-100 pb-2">6. Kegiatan Sosial & Organisasi</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Kekuatan Diri</label>
                              {isEditing ? (
                                <textarea value={editedRecord.kekuatanDiri} onChange={(e) => editField('kekuatanDiri', e.target.value)} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-850 whitespace-pre-wrap">{editedRecord.kekuatanDiri}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Kelemahan Diri</label>
                              {isEditing ? (
                                <textarea value={editedRecord.kelemahanDiri} onChange={(e) => editField('kelemahanDiri', e.target.value)} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-855 whitespace-pre-wrap">{editedRecord.kelemahanDiri}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Hobby</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.hobby} onChange={(e) => editField('hobby', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-850">{editedRecord.hobby}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Mengisi Waktu Luang</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.waktuLuang} onChange={(e) => editField('waktuLuang', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-850">{editedRecord.waktuLuang}</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-stone-100">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Organisasi yang Pernah Diikuti</h4>
                              {isEditing && (
                                <button type="button" onClick={() => handleAddNestedRow('organisasi', { nama: '', periode: '', jabatan: '', keterangan: '' })} className="text-xs text-brand-600 px-2 py-1 font-bold">
                                  + Organisasi
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {(editedRecord.organisasi || []).map((or, idx) => (
                                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-250 flex items-center space-x-3">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <input type="text" placeholder="Nama Organisasi" disabled={!isEditing} value={or.nama} onChange={(e) => handleEditNested('organisasi', idx, 'nama', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Periode" disabled={!isEditing} value={or.periode} onChange={(e) => handleEditNested('organisasi', idx, 'periode', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Jabatan" disabled={!isEditing} value={or.jabatan} onChange={(e) => handleEditNested('organisasi', idx, 'jabatan', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Keterangan" disabled={!isEditing} value={or.keterangan} onChange={(e) => handleEditNested('organisasi', idx, 'keterangan', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                  </div>
                                  {isEditing && (
                                    <button onClick={() => handleRemoveNestedRow('organisasi', idx)} className="text-red-500 p-1">
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 7: Ekspektasi & Kesehatan */}
                      {activeDetailTab === 7 && (
                        <div className="space-y-4">
                          <h3 className="text-base font-bold text-brand-600 border-b border-stone-100 pb-2">7. Ekspektasi & Kesehatan</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Gaji yang Diinginkan</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.gajiDiinginkan} onChange={(e) => editField('gajiDiinginkan', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-sm font-semibold text-stone-850">Rp {editedRecord.gajiDiinginkan}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Mulai Bisa Bekerja</label>
                              {isEditing ? (
                                <input type="date" value={editedRecord.dapatMulaiBekerja} onChange={(e) => editField('dapatMulaiBekerja', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-850 font-medium">{editedRecord.dapatMulaiBekerja}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Fasilitas yang Diharapkan</label>
                              {isEditing ? (
                                <textarea value={editedRecord.fasilitasDiharapkan} onChange={(e) => editField('fasilitasDiharapkan', e.target.value)} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-800 whitespace-pre-wrap">{editedRecord.fasilitasDiharapkan || '-'}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-stone-500 uppercase">Kendaraan yang Dimiliki</label>
                              {isEditing ? (
                                <input type="text" value={editedRecord.kendaraanDimiliki} onChange={(e) => editField('kendaraanDimiliki', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs" />
                              ) : (
                                <p className="text-xs text-stone-800">{editedRecord.kendaraanDimiliki || '-'}</p>
                              )}
                            </div>
                            <div className="md:col-span-2 space-y-2 border-t border-stone-100 pt-3">
                              <label className="text-xs font-bold text-stone-600 block">Kondisi Medis</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-stone-500 font-bold uppercase block">Pernah Sakit Keras / Lama?</label>
                                  <p className="text-xs font-medium text-stone-800">{editedRecord.pernahSakitKeras === 'Ya' ? `Ya (${editedRecord.detailSakitKeras})` : 'Tidak'}</p>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-stone-500 font-bold uppercase block">Kesehatan Keluarga Baik?</label>
                                  <p className="text-xs font-medium text-stone-800">{editedRecord.kesehatanKeluargaBaik === 'Tidak' ? `Tidak (${editedRecord.detailKesehatanKeluarga})` : 'Ya'}</p>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                  <label className="text-[9px] text-stone-500 font-bold uppercase block">Alamat Media Sosial</label>
                                  <p className="text-xs font-semibold text-brand-600 underline">{editedRecord.alamatMediaSosial || '-'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 8: Referensi Darurat */}
                      {activeDetailTab === 8 && (
                        <div className="space-y-6">
                          <h3 className="text-base font-bold text-brand-600 border-b border-stone-100 pb-2">8. Referensi</h3>

                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">3 Kontak Darurat Terkait (Wajib)</h4>
                            <div className="space-y-3">
                              {(editedRecord.referensiKontak || []).map((co, idx) => (
                                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center space-x-3">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input type="text" placeholder="Nama Lengkap" disabled={!isEditing} value={co.nama} onChange={(e) => handleEditNested('referensiKontak', idx, 'nama', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Hubungan" disabled={!isEditing} value={co.hubungan} onChange={(e) => handleEditNested('referensiKontak', idx, 'hubungan', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                    <input type="text" placeholder="Nomor HP" disabled={!isEditing} value={co.telp} onChange={(e) => handleEditNested('referensiKontak', idx, 'telp', e.target.value)} className="bg-white border text-xs p-1.5 rounded-lg" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-stone-150 flex flex-col items-end">
                            <span className="text-xs text-stone-500">Mengesahkan Pernyataan Diatas Sebenar-benarnya:</span>
                            <span className="text-[10px] text-stone-400 mt-1">Dibuat di: {editedRecord.kotaTgl}</span>
                            <span className="text-sm font-bold text-stone-900 mt-4">{editedRecord.namaTerang}</span>
                            <span className="text-[10px] text-stone-500 italic mt-0.5">(Tandatangan Digital Pelamar)</span>
                          </div>
                        </div>
                      )}

                      {/* Save Changes button explicitly */}
                      {isEditing && (
                        <div className="flex justify-end pt-4 border-t border-stone-100">
                          <button
                            onClick={handleSaveEditedForm}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl px-5 py-3 transition-all cursor-pointer flex items-center space-x-1.5"
                          >
                            {saving ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <span>Menyimpan ke Sheets...</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4" />
                                <span>Simpan Perubahan</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-12 text-center text-stone-500">Menghubungkan visual data...</div>
                  )}
                </div>
              </div>

              {/* Right sidebar: Actions details */}
              <div className="space-y-6">
                {/* Recruitment Status card workflow */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-none">Status Rekrutmen</h4>

                  {selectedCandidate && (
                    <div className="space-y-4">
                      {/* Active Status Badge */}
                      <div className="flex items-center space-x-2">
                        <span className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold ${STATUS_BADGE_CLASS[selectedCandidate.status]}`}>
                          {STATUS_LABELS[selectedCandidate.status]}
                        </span>
                      </div>

                      {/* Manage status select box */}
                      <div className="space-y-1.5 pt-2 border-t border-stone-100">
                        <label className="text-[10px] font-bold uppercase text-stone-500">Ubah Tahapan Pelamar</label>
                        <select
                          value={selectedCandidate.status}
                          onChange={(e) => handleStatusChange(selectedCandidate.id, e.target.value as ApplicationStatus)}
                          className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 rounded-lg p-2.5 text-xs font-medium cursor-pointer"
                        >
                          <option value="Pending">Belum Direview (Pending)</option>
                          <option value="Reviewed">Sedang Tahap Review (Reviewed)</option>
                          <option value="Interview HR">Wawancara HR (Interview HR)</option>
                          <option value="Interview User">Wawancara User (Interview User)</option>
                          <option value="Accepted">Lolos Seleksi (Accepted)</option>
                          <option value="Rejected">Gugur Seleksi (Rejected)</option>
                        </select>
                        <span className="text-[10px] text-stone-500 block leading-relaxed mt-1">
                          Merubah opsi diatas akan mengeksekusi sinkronisasi status secara real-time ke Google Sheet.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Meta details card */}
                {selectedCandidate && (
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-none">Berkas Administrasi</h4>
                    <div className="space-y-2 text-xs divide-y divide-stone-100 pt-1">
                      <div className="py-2 flex justify-between">
                        <span className="text-stone-500">ID Berkas</span>
                        <span className="font-mono font-bold text-stone-850">{selectedCandidate.id}</span>
                      </div>
                      <div className="py-3 flex justify-between">
                        <span className="text-stone-500">Tanggal Pengajuan</span>
                        <span className="text-stone-850 font-semibold">
                          {new Date(selectedCandidate.submissionDate).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="py-3 flex justify-between">
                        <span className="text-stone-500">Terakhir Diupdate</span>
                        <span className="text-stone-850 font-mono">
                          {selectedCandidate.lastUpdated ? new Date(selectedCandidate.lastUpdated).toLocaleString('id-ID') : '-'}
                        </span>
                      </div>
                      <div className="py-3 flex justify-between">
                        <span className="text-stone-500">Posisi Lowongan</span>
                        <span className="text-brand-600 font-bold">{getOfficialPositionName(selectedCandidate.jabatanDituju) || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};