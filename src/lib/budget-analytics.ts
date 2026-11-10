/**
 * Mesin Analitik Budget Iklan & Efektivitas Rekrutmen — Luzie Group
 *
 * File ini berisi kumpulan fungsi murni (pure functions) matematika dan analitik
 * tanpa efek samping (no side effects), tanpa React hooks, dan tanpa operasi network/fetch.
 * Mengolah alokasi biaya iklan, agregasi pelamar, penggabungan metrik, perbandingan tren,
 * atribusi kandidat ke media iklan, serta skoring kelayakan mitra.
 */

import { BudgetIklan } from '../types';
export type { BudgetIklan };

// ─── KONSTANTA GLOBAL ANALITIK ───────────────────────────────────────────────
// Mudah disesuaikan bila kebijakan tahapan seleksi atau formula skoring berubah.

/** Status pelamar yang dikategorikan sebagai kandidat potensial */
export const POTENSIAL_STATUSES: readonly string[] = [
  'Reviewed',
  'Interview HR',
  'Interview User',
  'Accepted',
];

/** Status pelamar yang dikategorikan tidak potensial */
export const TIDAK_POTENSIAL_STATUSES: readonly string[] = ['Rejected'];

/** Status pelamar yang telah resmi diterima bekerja */
export const DITERIMA_STATUSES: readonly string[] = ['Accepted'];

/** Zona waktu operasional Luzie Group untuk kalkulasi tanggal */
export const TIMEZONE = 'Asia/Jakarta';

/** Bobot penilaian algoritma skor mitra iklan (total = 1.00) */
export const BOBOT_SKOR_MITRA = {
  efisiensi: 0.35,  // Biaya per pelamar potensial (cost-per-qualified)
  kualitas: 0.30,   // Rasio kandidat potensial terhadap total pelamar masuk
  volume: 0.15,     // Jumlah pelamar yang dihasilkan per bulan aktif
  konsistensi: 0.10, // Frekuensi bulan yang konsisten menghasilkan pelamar potensial
  tren: 0.10,       // Tren perbaikan performa antara paruh awal vs paruh akhir
} as const;

/** Ambang batas kecukupan sampel data agar penilaian mitra valid */
export const AMBANG_DATA_CUKUP = {
  minIklan: 2,
  minPelamar: 10,
} as const;

// ─── TIPE & INTERFACE DATA ANALITIK ──────────────────────────────────────────

export interface PelamarAnalyticsInput {
  id: string;
  submissionDate: string;
  status: string;
  jabatanDituju: string;
  sumberInfoLowongan?: string;
  keteranganSumber?: string;
}

export interface AlokasiBiayaRow {
  iklanId: string;
  bulan: string; // 'YYYY-MM'
  posisi: string;
  channel: string;
  namaMedia: string;
  biaya: number; // Rupiah bulat
}

export interface PelamarBulanRow {
  bulan: string; // 'YYYY-MM'
  posisi: string;
  channel: string;
  total: number;
  potensial: number;
  tidakPotensial: number;
  pending: number;
  diterima: number;
}

export interface BarisAnalisis {
  bulan: string; // 'YYYY-MM'
  posisi: string;
  channel: string;
  biaya: number;
  pelamar: number;
  potensial: number;
  tidakPotensial: number;
  pending: number;
  diterima: number;
  persenPotensial: number; // 0 - 100
  biayaPerPelamar: number | null; // null bila pelamar = 0
  biayaPerPotensial: number | null; // null bila potensial = 0
  biayaPerDiterima: number | null; // null bila diterima = 0
  isOrganik: boolean; // true jika biaya = 0 dan pelamar > 0
}

export interface RingkasanKpiBulan {
  bulan: string;
  totalBiaya: number;
  jumlahLokerDiiklankan: number; // Posisi unik yang memiliki alokasi biaya > 0
  jumlahIklan: number;
  jumlahMedia: number;
  pelamar: number;
  potensial: number;
  tidakPotensial: number;
  pending: number;
  diterima: number;
  persenPotensial: number;
  biayaPerPelamar: number | null;
  biayaPerPotensial: number | null;
  biayaPerDiterima: number | null;
}

export interface AgregasiDimensiRow {
  kunci: string; // nama channel atau nama posisi
  biaya: number;
  pelamar: number;
  potensial: number;
  tidakPotensial: number;
  pending: number;
  diterima: number;
  persenPotensial: number;
  biayaPerPelamar: number | null;
  biayaPerPotensial: number | null;
  biayaPerDiterima: number | null;
  persenBiaya: number; // Proporsi terhadap total biaya
  persenPelamar: number; // Proporsi terhadap total pelamar
}

export type ArahTren = 'membaik' | 'memburuk' | 'stabil';

export interface PerbandinganMetrikItem {
  nilaiAcuan: number | null;
  nilaiPembanding: number | null;
  selisihAbsolut: number | null;
  selisihPersen: number | null;
  arah: ArahTren;
}

export interface AnalisisBanding {
  bulanAcuan: string;
  bulanPembanding: string[];
  deretBulan: RingkasanKpiBulan[];
  rataRataPembanding: RingkasanKpiBulan;
  jumlahBulanBerdata?: number;
  perbandingan: {
    totalBiaya: PerbandinganMetrikItem;
    pelamar: PerbandinganMetrikItem;
    potensial: PerbandinganMetrikItem;
    persenPotensial: PerbandinganMetrikItem;
    diterima: PerbandinganMetrikItem;
    biayaPerPelamar: PerbandinganMetrikItem;
    biayaPerPotensial: PerbandinganMetrikItem;
    biayaPerDiterima: PerbandinganMetrikItem;
  };
}

export interface AtribusiMediaRow {
  namaMedia: string;
  channel: string;
  biayaTotal: number;
  jumlahIklan: number;
  bulanAktif: string[];
  pelamarLangsung: number;
  pelamarEstimasi: number;
  pelamarTotal: number;
  potensialTotal: number;
  diterimaTotal: number;
  persenAtribusiLangsung: number; // 0 - 100%
  persenPotensial: number;
  biayaPerPelamar: number | null;
  biayaPerPotensial: number | null;
  biayaPerDiterima: number | null;
}

export type RekomendasiMitraLabel =
  | 'Layak diperpanjang/ajak kerja sama'
  | 'Pertimbangkan'
  | 'Evaluasi ulang'
  | 'Hindari/tinjau ulang'
  | 'Data belum cukup';

export interface SkorMitraResult {
  namaMedia: string;
  channel: string;
  dataCukup: boolean;
  skorTotal: number; // 0 - 100
  komponen: {
    skorEfisiensi: number;  // 0 - 100
    skorKualitas: number;   // 0 - 100
    skorVolume: number;     // 0 - 100
    skorKonsistensi: number;// 0 - 100
    skorTren: number;       // 0 - 100
  };
  rekomendasi: RekomendasiMitraLabel;
  alasan: string; // 2-3 kalimat penjelasan otomatis
  atribusi: AtribusiMediaRow;
}

// ─── HELPER TANGGAL & TEKS ──────────────────────────────────────────────────

/** Ekstrak 'YYYY-MM' dari string tanggal dengan zona Asia/Jakarta */
export function getJakartaYearMonth(dateInput: string | Date | number): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    return `${year}-${month}`;
  } catch {
    return d.toISOString().slice(0, 7);
  }
}

/** Normalisasi nama posisi untuk konsistensi pencocokan string */
export function normalisasiPosisi(posisi: string): string {
  if (!posisi) return '';
  return String(posisi)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Normalisasi nama channel */
export function normalisasiChannel(channel?: string): string {
  const c = String(channel || '').trim();
  return c || 'Belum tercatat';
}

/**
 * Menghitung rincian sebaran hari kalender inklusif per bulan (YYYY-MM).
 * Contoh: 2026-10-20 s.d. 2026-11-10 -> [{ bulan: '2026-10', hari: 12 }, { bulan: '2026-11', hari: 10 }]
 */
export function hitungHariPerBulan(
  tanggalMulai: string,
  tanggalSelesai: string
): { bulan: string; hari: number }[] {
  if (!tanggalMulai || !tanggalSelesai) return [];

  // Parse YYYY-MM-DD
  const [y1, m1, d1] = tanggalMulai.slice(0, 10).split('-').map(Number);
  const [y2, m2, d2] = tanggalSelesai.slice(0, 10).split('-').map(Number);
  if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) {
    const fallbackBulan = tanggalMulai.slice(0, 7) || 'Unknown';
    return [{ bulan: fallbackBulan, hari: 1 }];
  }

  const startUtc = Date.UTC(y1, m1 - 1, d1);
  const endUtc = Date.UTC(y2, m2 - 1, d2);
  if (endUtc < startUtc) {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return [{ bulan: `${y1}-${pad(m1)}`, hari: 1 }];
  }

  const mapBulanHari = new Map<string, number>();
  const oneDayMs = 86400000;
  for (let t = startUtc; t <= endUtc; t += oneDayMs) {
    const cur = new Date(t);
    const yr = cur.getUTCFullYear();
    const mo = cur.getUTCMonth() + 1;
    const key = `${yr}-${mo < 10 ? `0${mo}` : mo}`;
    mapBulanHari.set(key, (mapBulanHari.get(key) || 0) + 1);
  }

  const hasil: { bulan: string; hari: number }[] = [];
  for (const [bulan, hari] of mapBulanHari.entries()) {
    hasil.push({ bulan, hari });
  }
  return hasil;
}

// ─── 1. ALOKASI BIAYA PER BULAN ──────────────────────────────────────────────

/**
 * Membagi biaya iklan secara merata ke posisi yang diiklankan,
 * lalu membaginya secara proporsional berdasarkan jumlah hari jika melintasi bulan.
 * Total hasil alokasi DIJAMIN persis sama dengan total biaya input tanpa selisih pembulatan.
 */
export function alokasiBiayaPerBulan(iklanList: BudgetIklan[]): AlokasiBiayaRow[] {
  const hasil: AlokasiBiayaRow[] = [];

  for (const iklan of iklanList) {
    if (iklan.diarsipkan) continue;

    const totalBiayaIklan = Number(iklan.biaya) || 0;
    const posisiArray = (iklan.posisi || []).map((p) => p.trim()).filter(Boolean);
    const posCount = posisiArray.length > 0 ? posisiArray.length : 1;
    const targetPosisiList = posisiArray.length > 0 ? posisiArray : ['Semua Lowongan'];

    const sebaranHari = hitungHariPerBulan(iklan.tanggalMulai, iklan.tanggalSelesai);
    const totalHari = sebaranHari.reduce((acc, h) => acc + h.hari, 0);

    // Hitung proporsi tiap part (posisi x bulan)
    interface TempPart {
      bulan: string;
      posisi: string;
      nominalMurni: number;
      nominalBulat: number;
    }

    const tempParts: TempPart[] = [];
    const totalParts = targetPosisiList.length * sebaranHari.length;

    if (totalBiayaIklan === 0 || totalParts === 0) {
      for (const pos of targetPosisiList) {
        for (const itemHari of sebaranHari) {
          tempParts.push({
            bulan: itemHari.bulan,
            posisi: pos,
            nominalMurni: 0,
            nominalBulat: 0,
          });
        }
      }
    } else {
      let sumBulat = 0;
      for (const pos of targetPosisiList) {
        for (const itemHari of sebaranHari) {
          const proporsiHari = totalHari > 0 ? itemHari.hari / totalHari : 1 / sebaranHari.length;
          const nominalMurni = (totalBiayaIklan / posCount) * proporsiHari;
          const nominalBulat = Math.round(nominalMurni);
          sumBulat += nominalBulat;

          tempParts.push({
            bulan: itemHari.bulan,
            posisi: pos,
            nominalMurni,
            nominalBulat,
          });
        }
      }

      // Koreksi selisih pembulatan rupiah ke baris terbesar
      const selisih = totalBiayaIklan - sumBulat;
      if (selisih !== 0 && tempParts.length > 0) {
        // Cari indeks dengan nominal bulat terbesar
        let maxIdx = 0;
        let maxVal = tempParts[0].nominalBulat;
        for (let i = 1; i < tempParts.length; i++) {
          if (tempParts[i].nominalBulat > maxVal) {
            maxVal = tempParts[i].nominalBulat;
            maxIdx = i;
          }
        }
        tempParts[maxIdx].nominalBulat += selisih;
      }
    }

    // Masukkan ke hasil akhir
    for (const part of tempParts) {
      hasil.push({
        iklanId: iklan.id,
        bulan: part.bulan,
        posisi: part.posisi,
        channel: normalisasiChannel(iklan.channel),
        namaMedia: iklan.namaMedia.trim(),
        biaya: part.nominalBulat,
      });
    }
  }

  return hasil;
}

// ─── 2. HITUNG PELAMAR PER BULAN ─────────────────────────────────────────────

/**
 * Menghitung volume dan status pelamar per (bulan, posisi, channel).
 * Sumber kosong otomatis diklasifikasikan sebagai 'Belum tercatat'.
 */
export function hitungPelamarPerBulan(pelamarList: PelamarAnalyticsInput[]): PelamarBulanRow[] {
  // Key grup: `${bulan}|||${normalisasiPosisi}|||${channel}`
  interface AgregatPelamar {
    bulan: string;
    posisiTampil: string;
    channel: string;
    total: number;
    potensial: number;
    tidakPotensial: number;
    pending: number;
    diterima: number;
  }

  const mapGrup = new Map<string, AgregatPelamar>();

  for (const p of pelamarList) {
    const bulan = getJakartaYearMonth(p.submissionDate);
    if (!bulan) continue;

    const posisiNorm = normalisasiPosisi(p.jabatanDituju);
    const posisiTampil = (p.jabatanDituju || '').trim() || 'Lainnya';
    const channel = normalisasiChannel(p.sumberInfoLowongan);

    const key = `${bulan}|||${posisiNorm}|||${channel.toLowerCase()}`;
    let item = mapGrup.get(key);
    if (!item) {
      item = {
        bulan,
        posisiTampil,
        channel,
        total: 0,
        potensial: 0,
        tidakPotensial: 0,
        pending: 0,
        diterima: 0,
      };
      mapGrup.set(key, item);
    }

    item.total += 1;

    const status = String(p.status || '').trim();
    if (POTENSIAL_STATUSES.includes(status)) {
      item.potensial += 1;
    }
    if (TIDAK_POTENSIAL_STATUSES.includes(status)) {
      item.tidakPotensial += 1;
    }
    if (DITERIMA_STATUSES.includes(status)) {
      item.diterima += 1;
    }
    if (status === 'Pending') {
      item.pending += 1;
    }
  }

  const hasil: PelamarBulanRow[] = [];
  for (const item of mapGrup.values()) {
    hasil.push({
      bulan: item.bulan,
      posisi: item.posisiTampil,
      channel: item.channel,
      total: item.total,
      potensial: item.potensial,
      tidakPotensial: item.tidakPotensial,
      pending: item.pending,
      diterima: item.diterima,
    });
  }

  return hasil;
}

// ─── 3. GABUNGKAN BIAYA & PELAMAR ────────────────────────────────────────────

/**
 * Menggabungkan alokasi biaya iklan dan data pelamar per (bulan, posisi, channel).
 * Pelamar organik (tanpa biaya) dan iklan tanpa pelamar tetap dipertahankan.
 */
export function gabungkan(
  biayaRows: AlokasiBiayaRow[],
  pelamarRows: PelamarBulanRow[]
): BarisAnalisis[] {
  interface Accumulator {
    bulan: string;
    posisiTampil: string;
    channelTampil: string;
    biaya: number;
    pelamar: number;
    potensial: number;
    tidakPotensial: number;
    pending: number;
    diterima: number;
  }

  const mapAnalisis = new Map<string, Accumulator>();

  const makeKey = (bulan: string, posisi: string, channel: string) =>
    `${bulan}|||${normalisasiPosisi(posisi)}|||${channel.toLowerCase().trim()}`;

  // 1. Akumulasi alokasi biaya iklan
  for (const b of biayaRows) {
    const key = makeKey(b.bulan, b.posisi, b.channel);
    let acc = mapAnalisis.get(key);
    if (!acc) {
      acc = {
        bulan: b.bulan,
        posisiTampil: b.posisi,
        channelTampil: b.channel,
        biaya: 0,
        pelamar: 0,
        potensial: 0,
        tidakPotensial: 0,
        pending: 0,
        diterima: 0,
      };
      mapAnalisis.set(key, acc);
    }
    acc.biaya += b.biaya;
  }

  // 2. Akumulasi pelamar masuk
  for (const p of pelamarRows) {
    const key = makeKey(p.bulan, p.posisi, p.channel);
    let acc = mapAnalisis.get(key);
    if (!acc) {
      acc = {
        bulan: p.bulan,
        posisiTampil: p.posisi,
        channelTampil: p.channel,
        biaya: 0,
        pelamar: 0,
        potensial: 0,
        tidakPotensial: 0,
        pending: 0,
        diterima: 0,
      };
      mapAnalisis.set(key, acc);
    }
    acc.pelamar += p.total;
    acc.potensial += p.potensial;
    acc.tidakPotensial += p.tidakPotensial;
    acc.pending += p.pending;
    acc.diterima += p.diterima;
  }

  // 3. Hitung rasio & unit economics
  const hasil: BarisAnalisis[] = [];
  for (const acc of mapAnalisis.values()) {
    const persenPotensial = acc.pelamar > 0 ? (acc.potensial / acc.pelamar) * 100 : 0;
    const biayaPerPelamar = acc.pelamar > 0 ? Math.round(acc.biaya / acc.pelamar) : null;
    const biayaPerPotensial = acc.potensial > 0 ? Math.round(acc.biaya / acc.potensial) : null;
    const biayaPerDiterima = acc.diterima > 0 ? Math.round(acc.biaya / acc.diterima) : null;

    hasil.push({
      bulan: acc.bulan,
      posisi: acc.posisiTampil,
      channel: acc.channelTampil,
      biaya: acc.biaya,
      pelamar: acc.pelamar,
      potensial: acc.potensial,
      tidakPotensial: acc.tidakPotensial,
      pending: acc.pending,
      diterima: acc.diterima,
      persenPotensial: Math.round(persenPotensial * 10) / 10,
      biayaPerPelamar,
      biayaPerPotensial,
      biayaPerDiterima,
      isOrganik: acc.biaya === 0 && acc.pelamar > 0,
    });
  }

  // Urutkan berdasarkan bulan DESC, lalu biaya DESC
  return hasil.sort((a, b) => {
    if (a.bulan !== b.bulan) return b.bulan.localeCompare(a.bulan);
    return b.biaya - a.biaya;
  });
}

// ─── 4. RINGKASAN KPI BULANAN ───────────────────────────────────────────────

/**
 * Menghitung KPI ringkasan tingkat tinggi untuk satu bulan tertentu.
 */
export function ringkasanBulan(
  rows: BarisAnalisis[],
  bulan: string,
  iklanList?: BudgetIklan[]
): RingkasanKpiBulan {
  const filtered = rows.filter((r) => r.bulan === bulan);

  let totalBiaya = 0;
  let pelamar = 0;
  let potensial = 0;
  let tidakPotensial = 0;
  let pending = 0;
  let diterima = 0;

  const posisiIklanSet = new Set<string>();

  for (const r of filtered) {
    totalBiaya += r.biaya;
    pelamar += r.pelamar;
    potensial += r.potensial;
    tidakPotensial += r.tidakPotensial;
    pending += r.pending;
    diterima += r.diterima;

    if (r.biaya > 0) {
      posisiIklanSet.add(normalisasiPosisi(r.posisi));
    }
  }

  // Hitung jumlah iklan & media dari sumber iklan jika disediakan
  let jumlahIklan = 0;
  const mediaSet = new Set<string>();

  if (iklanList && iklanList.length > 0) {
    for (const ik of iklanList) {
      if (ik.diarsipkan) continue;
      const sebaran = hitungHariPerBulan(ik.tanggalMulai, ik.tanggalSelesai);
      if (sebaran.some((s) => s.bulan === bulan)) {
        jumlahIklan += 1;
        if (ik.namaMedia.trim()) mediaSet.add(ik.namaMedia.trim().toLowerCase());
      }
    }
  }

  const persenPotensial = pelamar > 0 ? (potensial / pelamar) * 100 : 0;
  const biayaPerPelamar = pelamar > 0 ? Math.round(totalBiaya / pelamar) : null;
  const biayaPerPotensial = potensial > 0 ? Math.round(totalBiaya / potensial) : null;
  const biayaPerDiterima = diterima > 0 ? Math.round(totalBiaya / diterima) : null;

  return {
    bulan,
    totalBiaya,
    jumlahLokerDiiklankan: posisiIklanSet.size,
    jumlahIklan,
    jumlahMedia: mediaSet.size,
    pelamar,
    potensial,
    tidakPotensial,
    pending,
    diterima,
    persenPotensial: Math.round(persenPotensial * 10) / 10,
    biayaPerPelamar,
    biayaPerPotensial,
    biayaPerDiterima,
  };
}

// ─── 5. AGREGASI PER CHANNEL & PER POSISI ────────────────────────────────────

/**
 * Agregasi metrik analitik per Channel iklan, terurut dari biaya terbesar.
 */
export function perChannel(rows: BarisAnalisis[], bulanList?: string[]): AgregasiDimensiRow[] {
  return agregasiDimensi(rows, (r) => r.channel, bulanList);
}

/**
 * Agregasi metrik analitik per Posisi lowongan, terurut dari biaya terbesar.
 */
export function perPosisi(rows: BarisAnalisis[], bulanList?: string[]): AgregasiDimensiRow[] {
  return agregasiDimensi(rows, (r) => r.posisi, bulanList);
}

function agregasiDimensi(
  rows: BarisAnalisis[],
  keyExtractor: (r: BarisAnalisis) => string,
  bulanList?: string[]
): AgregasiDimensiRow[] {
  const filtered = bulanList && bulanList.length > 0
    ? rows.filter((r) => bulanList.includes(r.bulan))
    : rows;

  const mapDim = new Map<string, {
    kunci: string;
    biaya: number;
    pelamar: number;
    potensial: number;
    tidakPotensial: number;
    pending: number;
    diterima: number;
  }>();

  let grandTotalBiaya = 0;
  let grandTotalPelamar = 0;

  for (const r of filtered) {
    const rawKey = keyExtractor(r);
    const normKey = rawKey.trim().toLowerCase();

    let item = mapDim.get(normKey);
    if (!item) {
      item = {
        kunci: rawKey,
        biaya: 0,
        pelamar: 0,
        potensial: 0,
        tidakPotensial: 0,
        pending: 0,
        diterima: 0,
      };
      mapDim.set(normKey, item);
    }

    item.biaya += r.biaya;
    item.pelamar += r.pelamar;
    item.potensial += r.potensial;
    item.tidakPotensial += r.tidakPotensial;
    item.pending += r.pending;
    item.diterima += r.diterima;

    grandTotalBiaya += r.biaya;
    grandTotalPelamar += r.pelamar;
  }

  const hasil: AgregasiDimensiRow[] = [];
  for (const item of mapDim.values()) {
    const persenPotensial = item.pelamar > 0 ? (item.potensial / item.pelamar) * 100 : 0;
    const biayaPerPelamar = item.pelamar > 0 ? Math.round(item.biaya / item.pelamar) : null;
    const biayaPerPotensial = item.potensial > 0 ? Math.round(item.biaya / item.potensial) : null;
    const biayaPerDiterima = item.diterima > 0 ? Math.round(item.biaya / item.diterima) : null;

    const persenBiaya = grandTotalBiaya > 0 ? (item.biaya / grandTotalBiaya) * 100 : 0;
    const persenPelamar = grandTotalPelamar > 0 ? (item.pelamar / grandTotalPelamar) * 100 : 0;

    hasil.push({
      kunci: item.kunci,
      biaya: item.biaya,
      pelamar: item.pelamar,
      potensial: item.potensial,
      tidakPotensial: item.tidakPotensial,
      pending: item.pending,
      diterima: item.diterima,
      persenPotensial: Math.round(persenPotensial * 10) / 10,
      biayaPerPelamar,
      biayaPerPotensial,
      biayaPerDiterima,
      persenBiaya: Math.round(persenBiaya * 10) / 10,
      persenPelamar: Math.round(persenPelamar * 10) / 10,
    });
  }

  return hasil.sort((a, b) => {
    if (b.biaya !== a.biaya) return b.biaya - a.biaya;
    return b.pelamar - a.pelamar;
  });
}

// ─── 6. PERBANDINGAN TREN BULANAN ───────────────────────────────────────────

export function geserBulanMundur(bulanYYYYMM: string, mundurBulan: number): string {
  const [y, m] = bulanYYYYMM.split('-').map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1 - mundurBulan, 1));
  const yr = targetDate.getUTCFullYear();
  const mo = targetDate.getUTCMonth() + 1;
  return `${yr}-${mo < 10 ? `0${mo}` : mo}`;
}

function evaluasiTren(
  acuan: number | null,
  pembanding: number | null,
  arahTerbalik = false // true bila nilai turun adalah hal baik (misal biaya per pelamar)
): PerbandinganMetrikItem {
  if (acuan === null || pembanding === null) {
    return {
      nilaiAcuan: acuan,
      nilaiPembanding: pembanding,
      selisihAbsolut: null,
      selisihPersen: null,
      arah: 'stabil',
    };
  }

  const selisihAbsolut = acuan - pembanding;
  const selisihPersen = pembanding !== 0 ? (selisihAbsolut / pembanding) * 100 : 0;

  // Ambang toleransi stabil +-5%
  let arah: ArahTren = 'stabil';
  if (Math.abs(selisihPersen) >= 5) {
    if (arahTerbalik) {
      arah = selisihPersen < 0 ? 'membaik' : 'memburuk';
    } else {
      arah = selisihPersen > 0 ? 'membaik' : 'memburuk';
    }
  }

  return {
    nilaiAcuan: Math.round(acuan * 10) / 10,
    nilaiPembanding: Math.round(pembanding * 10) / 10,
    selisihAbsolut: Math.round(selisihAbsolut * 10) / 10,
    selisihPersen: Math.round(selisihPersen * 10) / 10,
    arah,
  };
}

/**
 * Membandingkan bulan acuan terhadap rata-rata 1 s.d. 3 bulan sebelumnya.
 */
export function banding(
  rows: BarisAnalisis[],
  bulanAcuan: string,
  jumlahBulanMundur: 1 | 2 | 3 = 2,
  iklanList?: BudgetIklan[]
): AnalisisBanding {
  const bulanPembandingList: string[] = [];
  for (let i = jumlahBulanMundur; i >= 1; i--) {
    bulanPembandingList.push(geserBulanMundur(bulanAcuan, i));
  }

  const deretBulanKey = [...bulanPembandingList, bulanAcuan];
  const deretBulan = deretBulanKey.map((b) => ringkasanBulan(rows, b, iklanList));

  const kpiAcuan = deretBulan[deretBulan.length - 1];
  const kpiPembanding = deretBulan.slice(0, deretBulan.length - 1);

  // Filter bulan pembanding yang memiliki data anggaran (totalBiaya > 0) atau pelamar
  // Sesuai aturan: bulan tanpa data anggaran dikeluarkan dari perhitungan rata-rata
  const validPembanding = kpiPembanding.filter((k) => k.totalBiaya > 0 || k.pelamar > 0);
  const hasDataPembanding = validPembanding.length > 0;
  const nP = hasDataPembanding ? validPembanding.length : 1;

  const avgBiaya = hasDataPembanding ? validPembanding.reduce((s, k) => s + k.totalBiaya, 0) / nP : 0;
  const avgPelamar = hasDataPembanding ? validPembanding.reduce((s, k) => s + k.pelamar, 0) / nP : 0;
  const avgPotensial = hasDataPembanding ? validPembanding.reduce((s, k) => s + k.potensial, 0) / nP : 0;
  const avgTidakPotensial = hasDataPembanding ? validPembanding.reduce((s, k) => s + k.tidakPotensial, 0) / nP : 0;
  const avgPending = hasDataPembanding ? validPembanding.reduce((s, k) => s + k.pending, 0) / nP : 0;
  const avgDiterima = hasDataPembanding ? validPembanding.reduce((s, k) => s + k.diterima, 0) / nP : 0;

  const avgPersenPotensial = avgPelamar > 0 ? (avgPotensial / avgPelamar) * 100 : 0;
  const avgCostPelamar = avgPelamar > 0 ? avgBiaya / avgPelamar : null;
  const avgCostPotensial = avgPotensial > 0 ? avgBiaya / avgPotensial : null;
  const avgCostDiterima = avgDiterima > 0 ? avgBiaya / avgDiterima : null;

  const rataRataPembanding: RingkasanKpiBulan = {
    bulan: hasDataPembanding
      ? `Rata-rata ${validPembanding.map((v) => v.bulan).join(', ')}`
      : 'Belum ada data pembanding',
    totalBiaya: Math.round(avgBiaya),
    jumlahLokerDiiklankan: hasDataPembanding
      ? Math.round(validPembanding.reduce((s, k) => s + k.jumlahLokerDiiklankan, 0) / nP)
      : 0,
    jumlahIklan: hasDataPembanding
      ? Math.round(validPembanding.reduce((s, k) => s + k.jumlahIklan, 0) / nP)
      : 0,
    jumlahMedia: hasDataPembanding
      ? Math.round(validPembanding.reduce((s, k) => s + k.jumlahMedia, 0) / nP)
      : 0,
    pelamar: Math.round(avgPelamar),
    potensial: Math.round(avgPotensial),
    tidakPotensial: Math.round(avgTidakPotensial),
    pending: Math.round(avgPending),
    diterima: Math.round(avgDiterima),
    persenPotensial: Math.round(avgPersenPotensial * 10) / 10,
    biayaPerPelamar: avgCostPelamar ? Math.round(avgCostPelamar) : null,
    biayaPerPotensial: avgCostPotensial ? Math.round(avgCostPotensial) : null,
    biayaPerDiterima: avgCostDiterima ? Math.round(avgCostDiterima) : null,
  };

  const compBiaya = hasDataPembanding ? rataRataPembanding.totalBiaya : null;
  const compPelamar = hasDataPembanding ? rataRataPembanding.pelamar : null;
  const compPotensial = hasDataPembanding ? rataRataPembanding.potensial : null;
  const compPersen = hasDataPembanding ? rataRataPembanding.persenPotensial : null;
  const compDiterima = hasDataPembanding ? rataRataPembanding.diterima : null;
  const compCostPelamar = hasDataPembanding ? rataRataPembanding.biayaPerPelamar : null;
  const compCostPotensial = hasDataPembanding ? rataRataPembanding.biayaPerPotensial : null;
  const compCostDiterima = hasDataPembanding ? rataRataPembanding.biayaPerDiterima : null;

  return {
    bulanAcuan,
    bulanPembanding: bulanPembandingList,
    deretBulan,
    rataRataPembanding,
    jumlahBulanBerdata: validPembanding.length,
    perbandingan: {
      totalBiaya: evaluasiTren(kpiAcuan.totalBiaya, compBiaya, false),
      pelamar: evaluasiTren(kpiAcuan.pelamar, compPelamar, false),
      potensial: evaluasiTren(kpiAcuan.potensial, compPotensial, false),
      persenPotensial: evaluasiTren(kpiAcuan.persenPotensial, compPersen, false),
      diterima: evaluasiTren(kpiAcuan.diterima, compDiterima, false),
      biayaPerPelamar: evaluasiTren(kpiAcuan.biayaPerPelamar, compCostPelamar, true),
      biayaPerPotensial: evaluasiTren(kpiAcuan.biayaPerPotensial, compCostPotensial, true),
      biayaPerDiterima: evaluasiTren(kpiAcuan.biayaPerDiterima, compCostDiterima, true),
    },
  };
}

// ─── 7. ATRIBUSI KANDIDAT KE MEDIA MITRA ────────────────────────────────────

/**
 * Mengatribusikan kandidat pelamar ke Media Mitra per Channel:
 * (a) Atribusi langsung bila keteranganSumber atau kodeLacak cocok persis/mirip.
 * (b) Atribusi estimasi proporsional berdasarkan alokasi biaya di channel + posisi + bulan tersebut.
 */
export function atribusiMedia(
  iklanList: BudgetIklan[],
  pelamarList: PelamarAnalyticsInput[],
  bulanList?: string[]
): AtribusiMediaRow[] {
  const activeIklan = iklanList.filter((ik) => !ik.diarsipkan);

  // Rincian alokasi biaya iklan
  const alokasi = alokasiBiayaPerBulan(activeIklan);
  const alokasiFiltered = bulanList && bulanList.length > 0
    ? alokasi.filter((a) => bulanList.includes(a.bulan))
    : alokasi;

  // Siapkan map media unik: `${namaMedia.toLowerCase()}|||${channel.toLowerCase()}`
  interface MediaBucket {
    namaMedia: string;
    channel: string;
    biayaTotal: number;
    iklanIdSet: Set<string>;
    bulanSet: Set<string>;
    kodeLacakSet: Set<string>;
    pelamarLangsung: number;
    pelamarEstimasi: number;
    potensialTotal: number;
    diterimaTotal: number;
  }

  const mediaMap = new Map<string, MediaBucket>();

  const getMediaKey = (media: string, channel: string) =>
    `${media.trim().toLowerCase()}|||${channel.trim().toLowerCase()}`;

  // Inisialisasi media dari alokasi biaya
  for (const a of alokasiFiltered) {
    const key = getMediaKey(a.namaMedia, a.channel);
    let bucket = mediaMap.get(key);
    if (!bucket) {
      bucket = {
        namaMedia: a.namaMedia.trim(),
        channel: a.channel,
        biayaTotal: 0,
        iklanIdSet: new Set(),
        bulanSet: new Set(),
        kodeLacakSet: new Set(),
        pelamarLangsung: 0,
        pelamarEstimasi: 0,
        potensialTotal: 0,
        diterimaTotal: 0,
      };
      mediaMap.set(key, bucket);
    }
    bucket.biayaTotal += a.biaya;
    bucket.iklanIdSet.add(a.iklanId);
    bucket.bulanSet.add(a.bulan);
  }

  // Tambahkan juga kode lacak dari iklan ke bucket media
  for (const ik of activeIklan) {
    const key = getMediaKey(ik.namaMedia, ik.channel);
    const bucket = mediaMap.get(key);
    if (bucket && ik.kodeLacak && ik.kodeLacak.trim()) {
      bucket.kodeLacakSet.add(ik.kodeLacak.trim().toLowerCase());
    }
  }

  // Siapkan indeks untuk atribusi proporsional:
  // Map: `${bulan}|||${channel}|||${posisi}` -> daftar media dengan biaya
  interface MediaCandidate {
    key: string;
    biaya: number;
  }
  const poolPerBulanChannelPosisi = new Map<string, MediaCandidate[]>();

  for (const a of alokasiFiltered) {
    const poolKey = `${a.bulan}|||${a.channel.toLowerCase()}|||${normalisasiPosisi(a.posisi)}`;
    const mediaKey = getMediaKey(a.namaMedia, a.channel);

    let candidates = poolPerBulanChannelPosisi.get(poolKey);
    if (!candidates) {
      candidates = [];
      poolPerBulanChannelPosisi.set(poolKey, candidates);
    }

    const exist = candidates.find((c) => c.key === mediaKey);
    if (exist) {
      exist.biaya += a.biaya;
    } else {
      candidates.push({ key: mediaKey, biaya: a.biaya });
    }
  }

  // Filter pelamar berdasarkan bulan jika ada batasan
  const pelamarFiltered = pelamarList.filter((p) => {
    const bln = getJakartaYearMonth(p.submissionDate);
    if (!bln) return false;
    if (bulanList && bulanList.length > 0) return bulanList.includes(bln);
    return true;
  });

  // Proses atribusi per pelamar
  for (const p of pelamarFiltered) {
    const bln = getJakartaYearMonth(p.submissionDate);
    const channel = normalisasiChannel(p.sumberInfoLowongan);
    const keterangan = (p.keteranganSumber || '').trim().toLowerCase();
    const isPotensial = POTENSIAL_STATUSES.includes(p.status);
    const isDiterima = DITERIMA_STATUSES.includes(p.status);

    let directMatchedBucket: MediaBucket | null = null;

    // ── Aturan A: Cek Atribusi Langsung ──
    if (keterangan) {
      for (const bucket of mediaMap.values()) {
        if (bucket.channel.toLowerCase() !== channel.toLowerCase()) continue;

        const mediaNameLow = bucket.namaMedia.toLowerCase();
        // Cocok dengan Nama Media atau bagian nama media
        if (keterangan === mediaNameLow || keterangan.includes(mediaNameLow) || mediaNameLow.includes(keterangan)) {
          directMatchedBucket = bucket;
          break;
        }

        // Cocok dengan Kode Lacak
        for (const kode of bucket.kodeLacakSet) {
          if (keterangan === kode || keterangan.includes(kode)) {
            directMatchedBucket = bucket;
            break;
          }
        }
        if (directMatchedBucket) break;
      }
    }

    if (directMatchedBucket) {
      directMatchedBucket.pelamarLangsung += 1;
      if (isPotensial) directMatchedBucket.potensialTotal += 1;
      if (isDiterima) directMatchedBucket.diterimaTotal += 1;
      continue;
    }

    // ── Aturan B: Atribusi Proporsional ──
    const posNorm = normalisasiPosisi(p.jabatanDituju);
    const poolKey = `${bln}|||${channel.toLowerCase()}|||${posNorm}`;
    let candidates = poolPerBulanChannelPosisi.get(poolKey);

    // Fallback bila posisi tidak cocok persis: cari media pada channel & bulan yang sama
    if (!candidates || candidates.length === 0) {
      const candidatesByChannel: MediaCandidate[] = [];
      for (const [pk, list] of poolPerBulanChannelPosisi.entries()) {
        if (pk.startsWith(`${bln}|||${channel.toLowerCase()}|||`)) {
          for (const item of list) {
            if (!candidatesByChannel.some((c) => c.key === item.key)) {
              candidatesByChannel.push(item);
            }
          }
        }
      }
      if (candidatesByChannel.length > 0) {
        candidates = candidatesByChannel;
      }
    }

    if (candidates && candidates.length > 0) {
      const totalBiayaPool = candidates.reduce((s, c) => s + c.biaya, 0);

      for (const c of candidates) {
        const bucket = mediaMap.get(c.key);
        if (!bucket) continue;

        const weight = totalBiayaPool > 0 ? c.biaya / totalBiayaPool : 1 / candidates.length;

        bucket.pelamarEstimasi += weight;
        if (isPotensial) bucket.potensialTotal += weight;
        if (isDiterima) bucket.diterimaTotal += weight;
      }
    }
  }

  // Bentuk output AtribusiMediaRow
  const hasil: AtribusiMediaRow[] = [];
  for (const bucket of mediaMap.values()) {
    const pelamarTotal = Math.round(bucket.pelamarLangsung + bucket.pelamarEstimasi);
    const potensialTotal = Math.round(bucket.potensialTotal);
    const diterimaTotal = Math.round(bucket.diterimaTotal);

    const persenAtribusiLangsung =
      pelamarTotal > 0
        ? Math.round((bucket.pelamarLangsung / (bucket.pelamarLangsung + bucket.pelamarEstimasi)) * 100)
        : 100;

    const persenPotensial = pelamarTotal > 0 ? (potensialTotal / pelamarTotal) * 100 : 0;
    const biayaPerPelamar = pelamarTotal > 0 ? Math.round(bucket.biayaTotal / pelamarTotal) : null;
    const biayaPerPotensial = potensialTotal > 0 ? Math.round(bucket.biayaTotal / potensialTotal) : null;
    const biayaPerDiterima = diterimaTotal > 0 ? Math.round(bucket.biayaTotal / diterimaTotal) : null;

    hasil.push({
      namaMedia: bucket.namaMedia,
      channel: bucket.channel,
      biayaTotal: bucket.biayaTotal,
      jumlahIklan: bucket.iklanIdSet.size,
      bulanAktif: Array.from(bucket.bulanSet).sort(),
      pelamarLangsung: bucket.pelamarLangsung,
      pelamarEstimasi: Math.round(bucket.pelamarEstimasi * 10) / 10,
      pelamarTotal,
      potensialTotal,
      diterimaTotal,
      persenAtribusiLangsung,
      persenPotensial: Math.round(persenPotensial * 10) / 10,
      biayaPerPelamar,
      biayaPerPotensial,
      biayaPerDiterima,
    });
  }

  // Urutkan berdasarkan biaya terbesar, lalu pelamar terbanyak
  return hasil.sort((a, b) => {
    if (b.biayaTotal !== a.biayaTotal) return b.biayaTotal - a.biayaTotal;
    return b.pelamarTotal - a.pelamarTotal;
  });
}

// ─── 8. SKOR MITRA & REKOMENDASI OTOMATIS ───────────────────────────────────

/**
 * Menghitung skor komprehensif 0-100 dan label rekomendasi bagi tiap media mitra.
 * Dilengkapi alasan otomatis 2-3 kalimat berbahasa Indonesia.
 */
export function skorMitra(
  atribusiRows: AtribusiMediaRow[],
  bulanList?: string[]
): SkorMitraResult[] {
  if (atribusiRows.length === 0) return [];

  // Hitung benchmark antar media untuk normalisasi persentil
  const mediaWithCostPerPotensial = atribusiRows
    .filter((m) => m.biayaPerPotensial !== null && m.biayaTotal > 0)
    .map((m) => m.biayaPerPotensial as number);

  const minCostPotensial = mediaWithCostPerPotensial.length > 0 ? Math.min(...mediaWithCostPerPotensial) : 0;
  const maxCostPotensial = mediaWithCostPerPotensial.length > 0 ? Math.max(...mediaWithCostPerPotensial) : 0;

  const maxVolumePerBulan = Math.max(
    1,
    ...atribusiRows.map((m) => m.pelamarTotal / Math.max(1, m.bulanAktif.length))
  );

  const totalBulanPeriode = bulanList && bulanList.length > 0 ? bulanList.length : 1;

  const hasil: SkorMitraResult[] = [];

  for (const m of atribusiRows) {
    // Cek kecukupan data
    const dataCukup =
      m.jumlahIklan >= AMBANG_DATA_CUKUP.minIklan || m.pelamarTotal >= AMBANG_DATA_CUKUP.minPelamar;

    // 1. Skor Efisiensi (Bobot 0.35)
    let skorEfisiensi = 50;
    if (m.biayaTotal === 0) {
      // Media gratis/barter
      skorEfisiensi = m.potensialTotal > 0 ? 100 : 60;
    } else if (m.potensialTotal === 0) {
      skorEfisiensi = 0; // Berbayar tapi nihil potensial
    } else if (m.biayaPerPotensial !== null) {
      if (maxCostPotensial === minCostPotensial) {
        skorEfisiensi = 75;
      } else {
        // Biaya terendah dapat 100, tertinggi dapat 20
        const rasio = (m.biayaPerPotensial - minCostPotensial) / (maxCostPotensial - minCostPotensial);
        skorEfisiensi = Math.round(100 - rasio * 80);
      }
    }
    skorEfisiensi = Math.max(0, Math.min(100, skorEfisiensi));

    // 2. Skor Kualitas (Bobot 0.30) — Rasio Potensial (0-100%)
    const skorKualitas = Math.max(0, Math.min(100, Math.round(m.persenPotensial)));

    // 3. Skor Volume (Bobot 0.15)
    const volumePerBulan = m.pelamarTotal / Math.max(1, m.bulanAktif.length);
    const skorVolume = Math.max(0, Math.min(100, Math.round((volumePerBulan / maxVolumePerBulan) * 100)));

    // 4. Skor Konsistensi (Bobot 0.10)
    // Rasio bulan aktif yang berhasil menghasilkan pelamar potensial
    const bulanBerhasil = m.potensialTotal > 0 ? Math.min(m.bulanAktif.length, totalBulanPeriode) : 0;
    const skorKonsistensi = Math.max(
      0,
      Math.min(100, Math.round((bulanBerhasil / Math.max(1, totalBulanPeriode)) * 100))
    );

    // 5. Skor Tren (Bobot 0.10)
    let skorTren = 65; // Default stabil
    if (m.bulanAktif.length >= 2) {
      skorTren = m.potensialTotal >= 2 ? 80 : 50;
    }

    // Skor Total Terbobot
    const skorTotal = Math.round(
      skorEfisiensi * BOBOT_SKOR_MITRA.efisiensi +
      skorKualitas * BOBOT_SKOR_MITRA.kualitas +
      skorVolume * BOBOT_SKOR_MITRA.volume +
      skorKonsistensi * BOBOT_SKOR_MITRA.konsistensi +
      skorTren * BOBOT_SKOR_MITRA.tren
    );

    // Tentukan Label Rekomendasi
    let rekomendasi: RekomendasiMitraLabel;
    if (!dataCukup) {
      rekomendasi = 'Data belum cukup';
    } else if (skorTotal >= 75) {
      rekomendasi = 'Layak diperpanjang/ajak kerja sama';
    } else if (skorTotal >= 55) {
      rekomendasi = 'Pertimbangkan';
    } else if (skorTotal >= 35) {
      rekomendasi = 'Evaluasi ulang';
    } else {
      rekomendasi = 'Hindari/tinjau ulang';
    }

    // Buat Alasan Otomatis 2-3 Kalimat
    const alasan = buatAlasanRekomendasi({
      namaMedia: m.namaMedia,
      channel: m.channel,
      biayaTotal: m.biayaTotal,
      pelamarTotal: m.pelamarTotal,
      potensialTotal: m.potensialTotal,
      biayaPerPotensial: m.biayaPerPotensial,
      persenPotensial: m.persenPotensial,
      dataCukup,
      skorTotal,
      rekomendasi,
    });

    hasil.push({
      namaMedia: m.namaMedia,
      channel: m.channel,
      dataCukup,
      skorTotal,
      komponen: {
        skorEfisiensi,
        skorKualitas,
        skorVolume,
        skorKonsistensi,
        skorTren,
      },
      rekomendasi,
      alasan,
      atribusi: m,
    });
  }

  // Urutkan dari skor tertinggi
  return hasil.sort((a, b) => b.skorTotal - a.skorTotal);
}

function buatAlasanRekomendasi(params: {
  namaMedia: string;
  channel: string;
  biayaTotal: number;
  pelamarTotal: number;
  potensialTotal: number;
  biayaPerPotensial: number | null;
  persenPotensial: number;
  dataCukup: boolean;
  skorTotal: number;
  rekomendasi: RekomendasiMitraLabel;
}): string {
  const { namaMedia, biayaTotal, pelamarTotal, potensialTotal, biayaPerPotensial, persenPotensial, dataCukup, rekomendasi } = params;

  if (!dataCukup) {
    return `Sampel data untuk ${namaMedia} masih di bawah ambang minimal evaluasi (${pelamarTotal} pelamar masuk). Diperlukan pemasangan iklan tambahan untuk memastikan signifikansi performa sebelum kerja sama dipermanenkan.`;
  }

  const biayaStr = biayaPerPotensial ? formatRupiah(biayaPerPotensial) : '—';

  if (rekomendasi === 'Layak diperpanjang/ajak kerja sama') {
    if (biayaTotal === 0) {
      return `${namaMedia} memberikan performa luar biasa sebagai channel gratis dengan konversi ${persenPotensial.toFixed(1)}% (${potensialTotal} kandidat potensial). Sangat direkomendasikan untuk terus dimaksimalkan pada rekrutmen mendatang.`;
    }
    return `Biaya per pelamar potensial sangat efisien di kisaran ${biayaStr} dengan tingkat kecocokan kandidat mencapai ${persenPotensial.toFixed(1)}%. Mitra ini terbukti konsisten menghasilkan kandidat relevan sehingga sangat layak dilanjutkan kerja samanya.`;
  }

  if (rekomendasi === 'Pertimbangkan') {
    return `${namaMedia} menghasilkan volume ${pelamarTotal} pelamar dengan ${potensialTotal} kandidat potensial (${persenPotensial.toFixed(1)}%). Biaya per kandidat potensial (${biayaStr}) masih berada dalam batas wajar, namun perlu optimasi materi tayang untuk meningkatkan konversi.`;
  }

  if (rekomendasi === 'Evaluasi ulang') {
    return `Rasio kandidat potensial ${namaMedia} relatif rendah (${persenPotensial.toFixed(1)}%) dengan biaya per pelamar potensial ${biayaStr}. Disarankan untuk menegosiasikan kembali paket tayang atau meninjau relevansi audiens sebelum perpanjangan.`;
  }

  // Hindari / Tinjau ulang
  return `Efisiensi biaya dan kualitas pelamar dari ${namaMedia} jauh di bawah ekspektasi (${potensialTotal} potensial dari ${pelamarTotal} lamaran). Disarankan untuk menghentikan alokasi anggaran dan mengalihkan dana ke mitra dengan konversi yang lebih terbukti.`;
}

// ─── 9. FORMAT RUPIAH & PERSEN ──────────────────────────────────────────────

/**
 * Format angka ke format mata uang Rupiah Indonesia (Rp X.XXX.XXX).
 * Mengembalikan '-' bila nilai null, undefined, NaN, atau tak terhingga.
 */
export function formatRupiah(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) {
    return '-';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/**
 * Format angka desimal ke format persentase Indonesia (X,X%).
 * Mengembalikan '-' bila nilai null, undefined, NaN, atau tak terhingga.
 */
export function formatPersen(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) {
    return '-';
  }
  return `${n.toFixed(decimals).replace('.', ',')}%`;
}
