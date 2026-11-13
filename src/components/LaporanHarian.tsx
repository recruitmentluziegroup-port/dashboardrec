import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileBarChart,
  RefreshCw,
  ExternalLink,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';
import { AdminSkeleton } from './dashboard/AdminSkeleton';
import { AdminEmptyState } from './dashboard/AdminEmptyState';
import { LaporanHarianResponse, LaporanRekapItem, LaporanKandidatItem, LaporanLegendaItem, LaporanPsikotesItem } from '../types';

import { RekapFilterBar, DatePreset } from './laporan/RekapFilterBar';
import { RekapKpiCards } from './laporan/RekapKpiCards';
import { RekapTrendChart } from './laporan/RekapTrendChart';
import { RekapKomposisiChart } from './laporan/RekapKomposisiChart';
import { RekapTable } from './laporan/RekapTable';
import { RekapLegendaPanel } from './laporan/RekapLegendaPanel';
import { exportRekapToCsv } from './laporan/csvExport';

import { KandidatFilterBar, KandidatFilterState } from './laporan/KandidatFilterBar';
import { KandidatTable } from './laporan/KandidatTable';
import { KandidatDetailModal } from './laporan/KandidatDetailModal';
import { exportKandidatToCsv } from './laporan/kandidatCsvExport';
import { PsikotesView } from './laporan/PsikotesView';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ef0gwvtYYMbOMG6Pt7D2rBnMJ2MTdnpaKrZsaP9B9TA/edit';

function formatJakartaTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return (
      new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Jakarta',
      }).format(d) + ' WIB'
    );
  } catch {
    return isoString;
  }
}

type LaporanSubTab = 'rekap' | 'detail' | 'psikotes';

function getInitialSubTab(): LaporanSubTab {
  if (typeof window === 'undefined') return 'rekap';
  const params = new URLSearchParams(window.location.search);
  const sub = params.get('sub');
  if (sub === 'detail' || sub === 'psikotes') return sub;
  return 'rekap';
}

function getInitialParam(key: string, defaultVal = ''): string {
  if (typeof window === 'undefined') return defaultVal;
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || defaultVal;
}

export const LaporanHarian: React.FC = () => {
  const [data, setData] = useState<LaporanHarianResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<LaporanSubTab>(getInitialSubTab);

  // Rekap Period filter states
  const [fromDate, setFromDate] = useState<string>(() => getInitialParam('from'));
  const [toDate, setToDate] = useState<string>(() => getInitialParam('to'));
  const [activePreset, setActivePreset] = useState<DatePreset>('all');

  // Candidate Filter states
  const [kandidatFilter, setKandidatFilter] = useState<KandidatFilterState>({
    search: getInitialParam('q'),
    posisi: getInitialParam('posisi'),
    status: getInitialParam('status'),
    fromDate: getInitialParam('from'),
    toDate: getInitialParam('to'),
    hanyaUlang: getInitialParam('ulang') === '1',
  });

  const [candidatePage, setCandidatePage] = useState<number>(() => {
    const p = parseInt(getInitialParam('page'), 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });

  const [selectedCandidate, setSelectedCandidate] = useState<LaporanKandidatItem | null>(null);

  const fetchLaporan = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const token = localStorage.getItem('luzie_admin_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `/api/admin/vacancies?store=laporan${forceRefresh ? '&refresh=1' : ''}`;
      const res = await fetch(url, { headers });

      if (res.status === 401) {
        throw new Error('Sesi admin berakhir. Silakan login kembali.');
      }

      if (!res.ok) {
        throw new Error(`Gagal memuat laporan: HTTP ${res.status}`);
      }

      const json: LaporanHarianResponse = await res.json();
      setData(json);

      if (json.connected === false && json.error) {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memuat data laporan harian.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLaporan();
  }, [fetchLaporan]);

  // Synchronize URL params helper
  const updateUrlParam = useCallback((key: string, val: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!val) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, val);
    }
    window.history.pushState(null, '', url.toString());
  }, []);

  const updateMultipleUrlParams = useCallback((updates: Record<string, string | null>) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) {
        url.searchParams.delete(k);
      } else {
        url.searchParams.set(k, v);
      }
    });
    window.history.pushState(null, '', url.toString());
  }, []);

  // Handle sub-tab changes
  const handleSubTabChange = (newSub: LaporanSubTab) => {
    setSubTab(newSub);
    updateUrlParam('sub', newSub);
  };

  const rekapList: LaporanRekapItem[] = data?.rekap || [];
  const kandidatList: LaporanKandidatItem[] = data?.kandidat || [];
  const legendaList: LaporanLegendaItem[] = data?.legenda || [];
  const psikotesList: LaporanPsikotesItem[] = data?.psikotes || [];
  const psikotesPanduan: string[] = data?.psikotesPanduan || [];

  // Restore candidate modal from URL if detailId is present on load/fetch
  useEffect(() => {
    if (kandidatList.length > 0 && !selectedCandidate) {
      const detailId = getInitialParam('detailId');
      if (detailId) {
        const found = kandidatList.find((k) => k.id === detailId);
        if (found) {
          setSelectedCandidate(found);
        }
      }
    }
  }, [kandidatList, selectedCandidate]);

  // Sync back/forward browser navigation
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const subParam = p.get('sub');
      setSubTab(subParam === 'detail' || subParam === 'psikotes' ? subParam : 'rekap');

      const f = p.get('from') || '';
      const t = p.get('to') || '';
      setFromDate(f);
      setToDate(t);
      if (!f && !t) {
        setActivePreset('all');
      } else {
        setActivePreset('custom');
      }

      setKandidatFilter({
        search: p.get('q') || '',
        posisi: p.get('posisi') || '',
        status: p.get('status') || '',
        fromDate: f,
        toDate: t,
        hanyaUlang: p.get('ulang') === '1',
      });

      const pg = parseInt(p.get('page') || '1', 10);
      setCandidatePage(isNaN(pg) || pg < 1 ? 1 : pg);

      const dId = p.get('detailId');
      if (dId && kandidatList.length > 0) {
        const found = kandidatList.find((k) => k.id === dId);
        setSelectedCandidate(found || null);
      } else {
        setSelectedCandidate(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [kandidatList]);

  // Determine min and max dates from dataset
  const { minDate, maxDate } = useMemo(() => {
    if (rekapList.length === 0) return { minDate: '', maxDate: '' };
    const sorted = [...rekapList].map((r) => r.tanggal).sort();
    return { minDate: sorted[0], maxDate: sorted[sorted.length - 1] };
  }, [rekapList]);

  const { kMinDate, kMaxDate } = useMemo(() => {
    if (kandidatList.length === 0) return { kMinDate: '', kMaxDate: '' };
    const sorted = [...kandidatList].map((k) => k.tanggal).sort();
    return { kMinDate: sorted[0], kMaxDate: sorted[sorted.length - 1] };
  }, [kandidatList]);

  // Rekap quick preset selection
  const handlePresetSelect = (preset: 'all' | '30d' | '7d') => {
    setActivePreset(preset);
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
      updateUrlParam('from', null);
      updateUrlParam('to', null);
      return;
    }

    if (!maxDate) return;
    const end = maxDate;
    const d = new Date(`${end}T00:00:00`);
    const daysToSubtract = preset === '7d' ? 6 : 29;
    d.setDate(d.getDate() - daysToSubtract);
    const start = d.toISOString().slice(0, 10);
    const boundedStart = minDate && start < minDate ? minDate : start;

    setFromDate(boundedStart);
    setToDate(end);
    updateUrlParam('from', boundedStart);
    updateUrlParam('to', end);
  };

  const handleFromChange = (val: string) => {
    setFromDate(val);
    setActivePreset('custom');
    updateUrlParam('from', val || null);
  };

  const handleToChange = (val: string) => {
    setToDate(val);
    setActivePreset('custom');
    updateUrlParam('to', val || null);
  };

  const handleResetFilter = () => {
    setFromDate('');
    setToDate('');
    setActivePreset('all');
    updateUrlParam('from', null);
    updateUrlParam('to', null);
  };

  // Filter rekap list based on fromDate & toDate
  const filteredRekapList = useMemo(() => {
    return rekapList.filter((r) => {
      if (fromDate && r.tanggal < fromDate) return false;
      if (toDate && r.tanggal > toDate) return false;
      return true;
    });
  }, [rekapList, fromDate, toDate]);

  // CSV export handler for Rekap
  const handleExportCsv = () => {
    const suffix = fromDate || toDate ? `${fromDate || minDate}_sd_${toDate || maxDate}` : 'semua';
    exportRekapToCsv(filteredRekapList, suffix);
  };

  // ─── Detail Kandidat Logic ────────────────────────────────────────────────

  // Dynamic positions extracted from candidate data
  const candidatePositions = useMemo(() => {
    const set = new Set<string>();
    kandidatList.forEach((k) => {
      if (k.posisi) set.add(k.posisi);
    });
    return Array.from(set).sort();
  }, [kandidatList]);

  // Status counts calculation
  const candidateStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Semua: kandidatList.length,
      'Belum dinilai': 0,
      Sesuai: 0,
      'Kurang Sesuai': 0,
      'Tidak Sesuai': 0,
      'Tidak Diverifikasi': 0,
      ulang: 0,
    };

    kandidatList.forEach((k) => {
      const st = k.status || 'Belum dinilai';
      if (counts[st] !== undefined) {
        counts[st] += 1;
      }
      if (k.lamaranUlang) {
        counts['ulang'] += 1;
      }
    });

    return counts;
  }, [kandidatList]);

  // Filter candidate list
  const filteredCandidates = useMemo(() => {
    const q = (kandidatFilter.search || '').trim().toLowerCase();
    const pos = kandidatFilter.posisi;
    const st = kandidatFilter.status;
    const from = kandidatFilter.fromDate;
    const to = kandidatFilter.toDate;
    const ulangOnly = kandidatFilter.hanyaUlang;

    return kandidatList.filter((k) => {
      // 1. Text search: nama, email, alasan, rekomendasi posisi (case-insensitive)
      if (q) {
        const nama = (k.nama || '').toLowerCase();
        const email = (k.email || '').toLowerCase();
        const alasan = (k.alasan || '').toLowerCase();
        const rekomendasi = (k.rekomendasiPosisi || '').toLowerCase();
        if (!nama.includes(q) && !email.includes(q) && !alasan.includes(q) && !rekomendasi.includes(q)) {
          return false;
        }
      }

      // 2. Position filter
      if (pos && k.posisi !== pos) {
        return false;
      }

      // 3. Status filter
      if (st && st !== 'Semua') {
        const candidateStatus = k.status || 'Belum dinilai';
        if (candidateStatus !== st) {
          return false;
        }
      }

      // 4. Date range filter
      if (from && k.tanggal < from) {
        return false;
      }
      if (to && k.tanggal > to) {
        return false;
      }

      // 5. Repeat application toggle
      if (ulangOnly && !k.lamaranUlang) {
        return false;
      }

      return true;
    });
  }, [kandidatList, kandidatFilter]);

  // Handle candidate filter changes & URL sync
  const handleCandidateFilterChange = (updates: Partial<KandidatFilterState>) => {
    const next = { ...kandidatFilter, ...updates };
    setKandidatFilter(next);
    setCandidatePage(1);

    updateMultipleUrlParams({
      q: next.search || null,
      posisi: next.posisi || null,
      status: next.status || null,
      from: next.fromDate || null,
      to: next.toDate || null,
      ulang: next.hanyaUlang ? '1' : null,
      page: null, // Reset page in URL when filters change
    });
  };

  const handleResetCandidateFilter = () => {
    const resetState: KandidatFilterState = {
      search: '',
      posisi: '',
      status: '',
      fromDate: '',
      toDate: '',
      hanyaUlang: false,
    };
    setKandidatFilter(resetState);
    setCandidatePage(1);

    updateMultipleUrlParams({
      q: null,
      posisi: null,
      status: null,
      from: null,
      to: null,
      ulang: null,
      page: null,
    });
  };

  const handleCandidatePageChange = (newPage: number) => {
    setCandidatePage(newPage);
    updateUrlParam('page', newPage > 1 ? String(newPage) : null);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSelectCandidate = (k: LaporanKandidatItem) => {
    setSelectedCandidate(k);
    updateUrlParam('detailId', k.id);
  };

  const handleCloseCandidateModal = () => {
    setSelectedCandidate(null);
    updateUrlParam('detailId', null);
  };

  const handleExportCandidateCsv = () => {
    const suffix = kandidatFilter.posisi
      ? `${kandidatFilter.posisi.replace(/\s+/g, '_')}`
      : 'terfilter';
    exportKandidatToCsv(filteredCandidates, suffix);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs berkas-stripe flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
              <FileBarChart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif font-black text-2xl text-stone-900 tracking-tight leading-tight">
                Laporan Harian
              </h1>
              <p className="text-xs text-stone-500 font-medium">
                Penilaian CV pelamar harian dari parsing email lamaran kerja
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 text-[11px] text-stone-500 font-medium">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            <span>Terakhir diperbarui:</span>
            <span className="font-bold text-stone-700">
              {formatJakartaTime(data?.fetchedAt)}
            </span>
            {data?.connected && (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-editorial-green border border-green-200">
                <CheckCircle2 className="h-3 w-3" />
                Terhubung ke Spreadsheet
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-editorial-border rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Buka Google Spreadsheet di tab baru"
          >
            <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
            <span>Buka Spreadsheet</span>
          </a>
          <button
            onClick={() => fetchLaporan(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Menyinkronkan…' : 'Perbarui'}</span>
          </button>
        </div>
      </div>

      {/* Error / Not Connected Warning Card */}
      {data?.connected === false && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-stone-800 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-red-100 text-editorial-red flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-black text-sm text-editorial-red">
                Spreadsheet Tidak Terhubung
              </h3>
              <p className="text-xs text-stone-700 leading-relaxed">
                {data.error ||
                  'Gagal menyambungkan ke Google Sheets. Pastikan izin akses Viewer telah diberikan kepada Service Account.'}
              </p>
            </div>
          </div>
          <div className="pl-11">
            <button
              onClick={() => fetchLaporan(true)}
              className="px-3.5 py-1.5 text-xs font-bold bg-white text-stone-800 hover:bg-stone-100 border border-red-300 rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              Coba Sinkron Ulang
            </button>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-editorial-border pb-2">
        <button
          onClick={() => handleSubTabChange('rekap')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            subTab === 'rekap'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Rekap Harian</span>
          {rekapList.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                subTab === 'rekap' ? 'bg-brand-700 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {rekapList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleSubTabChange('detail')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            subTab === 'detail'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Detail Kandidat</span>
          {kandidatList.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                subTab === 'detail' ? 'bg-brand-700 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {kandidatList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleSubTabChange('psikotes')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            subTab === 'psikotes'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span>Ringkasan Psikotes</span>
          {psikotesList.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                subTab === 'psikotes' ? 'bg-brand-700 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {psikotesList.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <AdminSkeleton variant="table" />
      ) : error && !data ? (
        <AdminEmptyState
          tone="error"
          icon={<AlertCircle className="h-7 w-7" />}
          title="Gagal Memuat Laporan Harian"
          body={error}
          actionLabel="Coba Lagi"
          onAction={() => fetchLaporan(true)}
        />
      ) : subTab === 'rekap' ? (
        /* Sub-tab 1: Rekap Harian */
        rekapList.length === 0 ? (
          <AdminEmptyState
            icon={<FileBarChart className="h-7 w-7" />}
            title="Belum Ada Data Rekap"
            body="Data rekap harian belum ditemukan di tab Rekap Harian spreadsheet."
            actionLabel="Perbarui Data"
            onAction={() => fetchLaporan(true)}
          />
        ) : (
          <div className="space-y-6">
            {/* 1. Filter Periode */}
            <RekapFilterBar
              fromDate={fromDate}
              toDate={toDate}
              minDate={minDate}
              maxDate={maxDate}
              activePreset={activePreset}
              filteredCount={filteredRekapList.length}
              totalCount={rekapList.length}
              onPresetSelect={handlePresetSelect}
              onFromChange={handleFromChange}
              onToChange={handleToChange}
              onReset={handleResetFilter}
              onExportCsv={handleExportCsv}
            />

            {/* 2. Kartu Ringkasan (CountUp) */}
            <RekapKpiCards rows={filteredRekapList} />

            {/* 3. Grafik Tren Lamaran Harian */}
            <RekapTrendChart rows={filteredRekapList} />

            {/* 4. Grafik Komposisi Penilaian */}
            <RekapKomposisiChart rows={filteredRekapList} />

            {/* 5. Tabel Rekap Harian */}
            <RekapTable rows={filteredRekapList} />

            {/* 6. Panel Legenda "Arti Status" */}
            <RekapLegendaPanel legenda={legendaList} />
          </div>
        )
      ) : subTab === 'detail' ? (
        /* Sub-tab 2: Detail Kandidat */
        kandidatList.length === 0 ? (
          <AdminEmptyState
            icon={<Users className="h-7 w-7" />}
            title="Belum Ada Data Kandidat"
            body="Data pelamar belum ditemukan di tab Detail Kandidat spreadsheet."
            actionLabel="Perbarui Data"
            onAction={() => fetchLaporan(true)}
          />
        ) : (
          <div className="space-y-6">
            {/* 1. Bilah Filter Kandidat */}
            <KandidatFilterBar
              filter={kandidatFilter}
              onFilterChange={handleCandidateFilterChange}
              onReset={handleResetCandidateFilter}
              onExportCsv={handleExportCandidateCsv}
              positions={candidatePositions}
              statusCounts={candidateStatusCounts}
              totalCount={kandidatList.length}
              filteredCount={filteredCandidates.length}
              minDate={kMinDate}
              maxDate={kMaxDate}
            />

            {/* 2. Tabel & Kartu Mobile Kandidat (dengan Sorting & Pagination 25 baris) */}
            <KandidatTable
              candidates={filteredCandidates}
              onSelectCandidate={handleSelectCandidate}
              page={candidatePage}
              onPageChange={handleCandidatePageChange}
              pageSize={25}
            />

            {/* 3. Modal Panel Detail Kandidat */}
            <KandidatDetailModal
              kandidat={selectedCandidate}
              onClose={handleCloseCandidateModal}
              allKandidat={kandidatList}
              onSelectKandidat={handleSelectCandidate}
            />
          </div>
        )
      ) : (
        /* Sub-tab 3: Ringkasan Psikotes */
        <PsikotesView items={psikotesList} panduan={psikotesPanduan} />
      )}
    </div>
  );
};
