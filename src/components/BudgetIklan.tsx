import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  BarChart3,
  GitCompare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { BudgetIklan as IBudgetIklan, BudgetIklanResponse, Applicant } from '../types';
import { AdminSkeleton } from './dashboard/AdminSkeleton';
import { useToast, ConfirmDialog } from './ui/Toast';
import { BudgetFilterBar } from './budget/BudgetFilterBar';
import { BudgetKpiSummary } from './budget/BudgetKpiSummary';
import { BudgetTable } from './budget/BudgetTable';
import { BudgetModal } from './budget/BudgetModal';
import { AnalisisBulanan } from './budget/AnalisisBulanan';
import { PerbandinganTren } from './budget/PerbandinganTren';

export interface BudgetIklanProps {
  applicants?: Applicant[];
}

export type BudgetSubTab = 'input' | 'analisis' | 'banding' | 'mitra';

const VALID_SUB_TABS: BudgetSubTab[] = ['input', 'analisis', 'banding', 'mitra'];

function getCurrentJakartaMonth(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
    });
    return formatter.format(new Date()).slice(0, 7); // "YYYY-MM"
  } catch {
    return new Date().toISOString().slice(0, 7);
  }
}

function getInitialParam(key: string, defaultVal = ''): string {
  if (typeof window === 'undefined') return defaultVal;
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || defaultVal;
}

function getInitialSubTab(): BudgetSubTab {
  if (typeof window === 'undefined') return 'input';
  const p = new URLSearchParams(window.location.search);
  const sub = p.get('sub');
  return VALID_SUB_TABS.includes(sub as BudgetSubTab) ? (sub as BudgetSubTab) : 'input';
}

function shiftDateOneMonth(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date().toISOString().slice(0, 10);
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  // Add 1 month safely
  const targetMonth = m; // 0-based: target is m
  const targetYear = y + Math.floor(targetMonth / 12);
  const actualMonth = targetMonth % 12;
  // Handle month length overflow (e.g. 31st)
  const maxDays = new Date(targetYear, actualMonth + 1, 0).getDate();
  const safeDay = Math.min(d, maxDays);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${targetYear}-${pad(actualMonth + 1)}-${pad(safeDay)}`;
}

export const BudgetIklan: React.FC<BudgetIklanProps> = ({ applicants = [] }) => {
  const toast = useToast();

  // Data states
  const [items, setItems] = useState<IBudgetIklan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(true);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // External positions (from vacancies + trackers)
  const [knownPositions, setKnownPositions] = useState<string[]>([]);

  // Sub-tabs
  const [subTab, setSubTab] = useState<BudgetSubTab>(getInitialSubTab);

  // Filters
  const defaultMonth = useMemo(() => getCurrentJakartaMonth(), []);
  const [monthFilter, setMonthFilter] = useState<string>(() => getInitialParam('month', defaultMonth));
  const [channelFilter, setChannelFilter] = useState<string>(() => getInitialParam('channel'));
  const [posisiFilter, setPosisiFilter] = useState<string>(() => getInitialParam('pos'));
  const [searchQuery, setSearchQuery] = useState<string>(() => getInitialParam('q'));
  const [tampilkanArsip, setTampilkanArsip] = useState<boolean>(() => getInitialParam('arsip') === '1');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IBudgetIklan | null>(null);

  // Confirm delete dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    item: IBudgetIklan | null;
  }>({ open: false, item: null });

  // Sync state to URL params (replaceState)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'budget');

    if (subTab && subTab !== 'input') params.set('sub', subTab);
    else params.delete('sub');

    if (monthFilter && monthFilter !== defaultMonth) params.set('month', monthFilter);
    else params.delete('month');

    if (channelFilter) params.set('channel', channelFilter);
    else params.delete('channel');

    if (posisiFilter) params.set('pos', posisiFilter);
    else params.delete('pos');

    if (searchQuery) params.set('q', searchQuery);
    else params.delete('q');

    if (tampilkanArsip) params.set('arsip', '1');
    else params.delete('arsip');

    const newUrl = '/admin' + (params.toString() ? `?${params.toString()}` : '');
    window.history.replaceState(null, '', newUrl);
  }, [subTab, monthFilter, channelFilter, posisiFilter, searchQuery, tampilkanArsip, defaultMonth]);

  // Auth headers helper
  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('luzie_admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);

  // Fetch Budget data
  const fetchBudgetData = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      setSheetError(null);
      try {
        const url = `/api/admin/vacancies?store=budget${forceRefresh ? '&refresh=1' : ''}`;
        const res = await fetch(url, { headers: authHeaders() });

        if (res.status === 401) {
          throw new Error('Sesi admin berakhir. Silakan login kembali.');
        }

        const data: BudgetIklanResponse = await res.json();
        setItems(data.items || []);
        setConnected(data.connected !== false);
        if (data.error) {
          setSheetError(data.error);
        }
      } catch (err: any) {
        setSheetError(err?.message || 'Gagal mengambil data budget iklan.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders]
  );

  // Fetch positions from vacancies and trackers
  const fetchPositions = useCallback(async () => {
    try {
      const [vacRes, trkRes] = await Promise.all([
        fetch('/api/admin/vacancies', { headers: authHeaders() }).catch(() => null),
        fetch('/api/admin/vacancies?store=trackers', { headers: authHeaders() }).catch(() => null),
      ]);

      const positions = new Set<string>();

      if (vacRes && vacRes.ok) {
        const vacData = await vacRes.json();
        if (Array.isArray(vacData)) {
          vacData.forEach((v: any) => {
            if (v.title && typeof v.title === 'string' && v.title.trim()) {
              positions.add(v.title.trim());
            }
          });
        }
      }

      if (trkRes && trkRes.ok) {
        const trkData = await trkRes.json();
        if (Array.isArray(trkData)) {
          trkData.forEach((t: any) => {
            if (t.title && typeof t.title === 'string' && t.title.trim()) {
              positions.add(t.title.trim());
            }
          });
        }
      }

      setKnownPositions(Array.from(positions));
    } catch {
      // non-blocking
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchBudgetData();
    fetchPositions();
  }, [fetchBudgetData, fetchPositions]);

  // Combined position list (known vacancies/trackers + positions in budget records)
  const allAvailablePositions = useMemo(() => {
    const set = new Set<string>(knownPositions);
    items.forEach((item) => {
      (item.posisi || []).forEach((p) => {
        if (p.trim()) set.add(p.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'));
  }, [knownPositions, items]);

  // Suggestions for media per channel
  const mediaSuggestionsByChannel = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    items.forEach((item) => {
      if (item.channel && item.namaMedia) {
        if (!map[item.channel]) map[item.channel] = new Set();
        map[item.channel].add(item.namaMedia.trim());
      }
    });
    const result: Record<string, string[]> = {};
    Object.keys(map).forEach((k) => {
      result[k] = Array.from(map[k]).sort((a, b) => a.localeCompare(b, 'id-ID'));
    });
    return result;
  }, [items]);

  // Compute available months from items + current month
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(defaultMonth);

    items.forEach((item) => {
      if (item.tanggalMulai && item.tanggalMulai.length >= 7) {
        months.add(item.tanggalMulai.slice(0, 7));
      }
      if (item.tanggalSelesai && item.tanggalSelesai.length >= 7) {
        months.add(item.tanggalSelesai.slice(0, 7));
      }
    });

    const sorted = Array.from(months).sort().reverse();
    return sorted.map((m) => {
      const [yearStr, monthStr] = m.split('-');
      const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
      return { value: m, label };
    });
  }, [items, defaultMonth]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Arsip filter
      if (!tampilkanArsip && item.diarsipkan) return false;

      // 2. Bulan filter
      if (monthFilter && monthFilter !== 'all') {
        const itemMulai = item.tanggalMulai ? item.tanggalMulai.slice(0, 7) : '';
        const itemSelesai = item.tanggalSelesai ? item.tanggalSelesai.slice(0, 7) : '';
        const matchesMonth =
          itemMulai === monthFilter ||
          itemSelesai === monthFilter ||
          (itemMulai && itemSelesai && itemMulai <= monthFilter && itemSelesai >= monthFilter);
        if (!matchesMonth) return false;
      }

      // 3. Channel filter
      if (channelFilter && item.channel !== channelFilter) return false;

      // 4. Posisi filter
      if (posisiFilter) {
        const hasPosisi = (item.posisi || []).some(
          (p) => p.toLowerCase().trim() === posisiFilter.toLowerCase().trim()
        );
        if (!hasPosisi) return false;
      }

      // 5. Search query (namaMedia, catatan, kodeLacak)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inMedia = item.namaMedia.toLowerCase().includes(q);
        const inCatatan = (item.catatan || '').toLowerCase().includes(q);
        const inKode = (item.kodeLacak || '').toLowerCase().includes(q);
        const inPosisi = (item.posisi || []).some((p) => p.toLowerCase().includes(q));
        if (!inMedia && !inCatatan && !inKode && !inPosisi) return false;
      }

      return true;
    });
  }, [items, tampilkanArsip, monthFilter, channelFilter, posisiFilter, searchQuery]);

  const hasActiveFilters = useMemo(() => {
    return (
      (monthFilter !== 'all' && monthFilter !== defaultMonth) ||
      Boolean(channelFilter) ||
      Boolean(posisiFilter) ||
      Boolean(searchQuery.trim()) ||
      tampilkanArsip
    );
  }, [monthFilter, defaultMonth, channelFilter, posisiFilter, searchQuery, tampilkanArsip]);

  const handleResetFilters = () => {
    setMonthFilter(defaultMonth);
    setChannelFilter('');
    setPosisiFilter('');
    setSearchQuery('');
    setTampilkanArsip(false);
  };

  // Add / Edit Save Handler
  const handleSaveBudget = async (payload: any) => {
    const isEdit = Boolean(payload.id);
    const method = isEdit ? 'PUT' : 'POST';
    const url = `/api/admin/vacancies?store=budget${isEdit ? `&id=${payload.id}` : ''}`;

    const prevItems = [...items];

    // Optimistic update
    if (isEdit) {
      setItems((prev) =>
        prev.map((i) => (i.id === payload.id ? { ...i, ...payload, diubahPada: new Date().toISOString() } : i))
      );
    }

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Revert
        setItems(prevItems);
        throw new Error(json.error || 'Gagal menyimpan anggaran iklan.');
      }

      const savedItem: IBudgetIklan = json.item;
      if (!isEdit && savedItem) {
        setItems((prev) => [savedItem, ...prev]);
      } else if (isEdit && savedItem) {
        setItems((prev) => prev.map((i) => (i.id === savedItem.id ? savedItem : i)));
      }

      toast('success', isEdit ? 'Anggaran iklan berhasil diperbarui.' : 'Anggaran iklan baru berhasil ditambahkan.');
    } catch (err: any) {
      setItems(prevItems);
      throw err;
    }
  };

  // Duplicate Handler (shifts dates +1 month and opens prefilled modal)
  const handleDuplicate = (item: IBudgetIklan) => {
    const duplicated: IBudgetIklan = {
      ...item,
      id: '', // new ID will be generated on save
      tanggalMulai: shiftDateOneMonth(item.tanggalMulai),
      tanggalSelesai: shiftDateOneMonth(item.tanggalSelesai),
      diarsipkan: false,
      dibuatPada: '',
      diubahPada: '',
    };
    setEditingItem(duplicated);
    setIsModalOpen(true);
    toast('info', 'Data disalin dengan tanggal +1 bulan. Silakan periksa dan simpan.');
  };

  // Archive (Soft Delete) with Undo Toast
  const handleArchive = (item: IBudgetIklan) => {
    setConfirmDialog({
      open: true,
      item,
    });
  };

  const executeArchive = async (item: IBudgetIklan) => {
    setConfirmDialog({ open: false, item: null });

    const prevItems = [...items];
    const nowIso = new Date().toISOString();

    // Optimistic mark as archived
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, diarsipkan: true, diubahPada: nowIso } : i))
    );

    try {
      const res = await fetch(`/api/admin/vacancies?store=budget&id=${item.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        setItems(prevItems);
        const json = await res.json().catch(() => ({}));
        toast('error', json.error || 'Gagal mengarsipkan iklan.');
        return;
      }

      // Show Undo action toast for 8 seconds
      toast('info', `Iklan "${item.namaMedia}" berhasil diarsipkan.`, {
        label: 'Urungkan',
        onClick: () => handleRestore(item),
      });
    } catch {
      setItems(prevItems);
      toast('error', 'Gagal menyinkronkan pengarsipan ke server.');
    }
  };

  // Restore Handler (Undo archive)
  const handleRestore = async (item: IBudgetIklan) => {
    const prevItems = [...items];
    const nowIso = new Date().toISOString();

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, diarsipkan: false, diubahPada: nowIso } : i))
    );

    try {
      const res = await fetch(`/api/admin/vacancies?store=budget&id=${item.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          ...item,
          diarsipkan: false,
        }),
      });

      if (!res.ok) {
        setItems(prevItems);
        toast('error', 'Gagal memulihkan iklan.');
        return;
      }

      toast('success', `Iklan "${item.namaMedia}" berhasil dipulihkan dari arsip.`);
    } catch {
      setItems(prevItems);
      toast('error', 'Gagal memulihkan iklan.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif font-black text-2xl text-stone-900 tracking-tight">Budget Iklan</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
              Loker
            </span>
          </div>
          <p className="text-xs text-stone-500 font-medium mt-1">
            Pencatatan dan analisis efektivitas anggaran pemasangan lowongan kerja di berbagai channel dan media mitra.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchBudgetData(true)}
            disabled={refreshing || loading}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-200 text-stone-700 hover:bg-white bg-stone-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Muat ulang data dari Google Sheets"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-700 hover:bg-brand-800 text-white shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Anggaran</span>
          </button>
        </div>
      </div>

      {/* ─── Connection Warning if Sheet not connected ─────────────────────── */}
      {!connected && sheetError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-900 flex-1">
            <p className="font-bold">Google Sheets Tidak Terhubung — Mode Penyimpanan Lokal Aktif</p>
            <p className="text-amber-800 leading-relaxed">{sheetError}</p>
            <p className="text-[11px] text-amber-700">
              Perubahan saat ini tersimpan di file lokal <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded">src/data/budget.json</code> dan akan otomatis tersinkron setelah kredensial Google Service Account terhubung.
            </p>
          </div>
        </div>
      )}

      {/* ─── Sub-Tab Navigation Bar ───────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-xl overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setSubTab('input')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
            subTab === 'input'
              ? 'bg-white text-brand-700 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Input Anggaran</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('analisis')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
            subTab === 'analisis'
              ? 'bg-white text-brand-700 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Analisis Bulanan</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('banding')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
            subTab === 'banding'
              ? 'bg-white text-brand-700 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <GitCompare className="h-4 w-4" />
          <span>Perbandingan</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('mitra')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
            subTab === 'mitra'
              ? 'bg-white text-brand-700 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Rekomendasi Mitra</span>
        </button>
      </div>

      {/* ─── Sub-Tab Content ──────────────────────────────────────────────── */}
      {subTab === 'input' ? (
        loading ? (
          <AdminSkeleton variant="table" />
        ) : (
          <div className="space-y-6">
            {/* KPI Summary Row */}
            <BudgetKpiSummary items={filteredItems} />

            {/* Filter Bar */}
            <BudgetFilterBar
              month={monthFilter}
              availableMonths={availableMonths}
              onMonthChange={setMonthFilter}
              channel={channelFilter}
              onChannelChange={setChannelFilter}
              posisi={posisiFilter}
              availablePositions={allAvailablePositions}
              onPosisiChange={setPosisiFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              tampilkanArsip={tampilkanArsip}
              onToggleArsip={setTampilkanArsip}
              onReset={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {/* Data Table / Mobile Cards */}
            <BudgetTable
              items={filteredItems}
              onEdit={(item) => {
                setEditingItem(item);
                setIsModalOpen(true);
              }}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onAddNew={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
            />
          </div>
        )
      ) : subTab === 'analisis' ? (
        loading ? (
          <AdminSkeleton variant="cards" />
        ) : (
          <AnalisisBulanan
            items={items}
            applicants={applicants}
            knownPositions={allAvailablePositions}
            onGoToInput={() => setSubTab('input')}
          />
        )
      ) : subTab === 'banding' ? (
        loading ? (
          <AdminSkeleton variant="cards" />
        ) : (
          <PerbandinganTren
            items={items}
            applicants={applicants}
            knownPositions={allAvailablePositions}
            onGoToInput={() => setSubTab('input')}
          />
        )
      ) : (
        /* Placeholder for sub-tab: Rekomendasi Mitra */
        <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-serif font-black text-lg text-stone-900">
            Rekomendasi Mitra & Loker Terbaik
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            Algoritma skoring kelayakan mitra dan rekomendasi kanal lowongan kerja terbaik sedang disiapkan pada bagian berikutnya.
          </p>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
              Segera Hadir
            </span>
          </div>
        </div>
      )}

      {/* ─── Add / Edit / Duplicate Modal ─────────────────────────────────── */}
      <BudgetModal
        open={isModalOpen}
        initial={editingItem}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveBudget}
        existingPositions={allAvailablePositions}
        existingMediaSuggestions={mediaSuggestionsByChannel}
      />

      {/* ─── Archive Confirm Dialog ───────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Arsipkan Anggaran Iklan?"
        body={`Iklan "${confirmDialog.item?.namaMedia || ''}" akan dipindahkan ke arsip. Anda tetap dapat melihatnya melalui opsi "Tampilkan iklan yang diarsipkan".`}
        confirmLabel="Arsipkan Iklan"
        onConfirm={() => {
          if (confirmDialog.item) executeArchive(confirmDialog.item);
        }}
        onCancel={() => setConfirmDialog({ open: false, item: null })}
      />
    </div>
  );
};
