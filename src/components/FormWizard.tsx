import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Plus, Trash2, Calendar, FileText, Send, User } from 'lucide-react';
import { Applicant, Anak, Saudara, PendidikanFormal, Kursus, PengalamanKerja, ReferensiPerusahaan, Organisasi, ReferensiKontak } from '../types';
import { useFormDraft } from '../hooks/useFormDraft';

interface FormWizardProps {
  onSubmitSuccess: (id: string) => void;
}

const DEFAULT_FORM_STATE: Applicant = {
  id: '',
  submissionDate: '',
  status: 'Pending',
  lastUpdated: '',
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  kewarganegaraan: 'Indonesia',
  alamatTinggal: '',
  alamatKtp: '',
  alamatKtpSama: false,
  emailPribadi: '',
  noTelp: '',
  jenisKelamin: '',
  nomorKtp: '',
  simC: false,
  noSimC: '',
  simA: false,
  noSimA: '',
  agama: '',
  golonganDarah: '',
  statusPernikahan: '',
  tanggalStatusPernikahan: '',
  namaPasangan: '',
  ttlPasangan: '',
  pendidikanPasangan: '',
  pekerjaanPasangan: '',
  anak: [],
  namaOrtu: '',
  alamatOrtu: '',
  pekerjaanOrtu: '',
  saudara: [],
  pendidikanFormal: [
    { dari: '', sampai: '', sekolah: '', jurusan: '', kota: '', ijazah: '' },
    { dari: '', sampai: '', sekolah: '', jurusan: '', kota: '', ijazah: '' }
  ],
  kursus: [],
  pengalamanKerja: [],
  referensiPerusahaan: [],
  jobdeskTerakhir: '',
  jabatanDituju: '',
  alasanJabatan: '',
  pengetahuanJabatan: '',
  lingkunganKerja: '',
  citaCita: '',
  kesulitanKeputusan: '',
  hobby: '',
  waktuLuang: '',
  pernahKeLuarNegeri: 'Tidak',
  detailKunjunganLuarNegeri: '',
  organisasi: [],
  kekuatanDiri: '',
  kelemahanDiri: '',
  gajiDiinginkan: '',
  fasilitasDiharapkan: '',
  dapatMulaiBekerja: '',
  kendaraanDimiliki: '',
  pernahSakitKeras: 'Tidak',
  detailSakitKeras: '',
  gangguanJasmani: '',
  kesehatanKeluargaBaik: 'Ya',
  detailKesehatanKeluarga: '',
  alamatMediaSosial: '',
  referensiKontak: [
    { nama: '', hubungan: '', telp: '' },
    { nama: '', hubungan: '', telp: '' },
    { nama: '', hubungan: '', telp: '' }
  ],
  kotaTgl: '',
  namaTerang: ''
};

interface Vacancy {
  title: string;
  category: string;
  location: string;
  salary: string;
  description: string;
  requirements: string[];
  archived?: boolean;
}

const STATIC_VACANCIES: Vacancy[] = [
  {
    title: 'Personal Assistant',
    category: 'Administrative Support',
    location: 'Solo / WFH (Remote Indonesia)',
    salary: 'Rp 3.5jt - Rp 5.0jt / bln',
    description: 'Mengelola jadwal harian pimpinan, mengoordinasikan dokumen/surat perusahaan, menyusun agenda rapat, serta memberikan dukungan administratif perkantoran secara rahasia, tertib, dan andal.',
    requirements: [
      'Minimal lulusan D3/S1 sekalian jurusan (diutamakan Administrasi Perkantoran / Sekretaris)',
      'Sangat fasih mengoperasikan Google Workspace (Sheets, Docs, Slides, Google Calendar)',
      'Memiliki keterampilan komunikasi verbal & tertulis yang rapi, ramah, dan cakap'
    ]
  },
  {
    title: 'Digital Marketer Specialist',
    category: 'Marketing & Conversion Optimization',
    location: 'Purwokerto (On-site / WFO)',
    salary: 'Rp 4.0jt - Rp 6.0jt / bln',
    description: 'Mengonsep, mengeksekusi, dan menjasmani kampanye paid traffic (Facebook Ads, TikTok Ads, Google Ads), menganalisis budget iklan, serta menjaga rasio efisiensi ROAS bisnis eksekutif.',
    requirements: [
      'Pengalaman kerja langsung minimal 1-2 tahun sebagai Media Buyer / Digital Advertiser',
      'Mahir mengulik platform Google Analytics, Facebook Pixel, serta konversi landing page',
      'Memiliki nalar psikologi copywriting penawaran tinggi yang menarik minat beli'
    ]
  },
  {
    title: 'CEO & Founder Personal Assistant',
    category: 'Executive Office Operations',
    location: 'Purwokerto (On-site / WFO)',
    salary: 'Rp 6.0jt - Rp 10.0jt / bln',
    description: 'Bertindak sebagai asisten eksekutif utama Founder Luzie Group untuk mengawal implementasi proyek strategis, memonitor status target KPI tim, serta mendampingi kunjungan bisnis pimpinan.',
    requirements: [
      'Gelar S1 terkemuka (Manajemen, Bisnis, Hubungan Internasional, atau Hukum disukai)',
      'Fasih berkomunikasi dalam Bahasa Inggris aktif lisan & tulisan tingkat mahir',
      'Daya pikir analitis taktis, integritas prima, serta siap untuk dinas luar kota sewaktu-waktu'
    ]
  },
  {
    title: 'Social Media Management',
    category: 'Creative Design & Content Strategy',
    location: 'Solo / WFH (Remote Indonesia)',
    salary: 'Rp 4.0jt - Rp 6.0jt / bln',
    description: 'Merancang ide konten mingguan kreatif, memproduksi dan menyunting video pendek (Reels, TikTok & Shorts), merias caption, serta membangun interaksi organik komunitas brand Luzie.',
    requirements: [
      'Keahlian tinggi mengoperasikan editor video CapCut, Premiere Pro, atau Adobe After Effects',
      'Mengikuti update tren konten visual, audio, serta cara kerja algoritma media sosial terbaru',
      'Wajib melampirkan portofolio kumpulan karya konten kreatif media sosial Anda'
    ]
  }
];

export const FormWizard: React.FC<FormWizardProps> = ({ onSubmitSuccess }) => {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState<Vacancy[]>(STATIC_VACANCIES);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/vacancies')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch vacancies');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setVacancies(data);
        }
      })
      .catch((err) => console.warn('Using static fallback for vacancies:', err));
  }, []);

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<Applicant>(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------
  // Auto-save / resume-draft state
  // -----------------------------------------------------------------
  const {
    hasDraft,
    draftMeta,
    lastSavedAt,
    storageAvailable,
    loadDraft,
    saveDraft,
    clearDraft,
  } = useFormDraft();

  // Guard so the first auto-save effect doesn't write DEFAULT_FORM_STATE
  // over a valid draft before the user has had a chance to resume.
  const loadedThisSession = useRef(false);

  // Don't render the resume banner on the very first paint — wait one tick.
  const [mounted, setMounted] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (hasDraft && draftMeta) {
      setShowResumeBanner(true);
    }
  }, [mounted, hasDraft, draftMeta]);

  // Recompute the "Tersimpan X menit lalu" pill every 30s.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Debounced auto-save on every form change. Skipped until the user has
  // either (a) accepted a draft, (b) declined a draft, or (c) picked a
  // position for the first time. Also skipped if localStorage is dead.
  useEffect(() => {
    if (!storageAvailable) return;
    if (!loadedThisSession.current) return;
    if (selectedPosition === null) return;
    saveDraft(form, currentStep, selectedPosition);
  }, [form, currentStep, selectedPosition, saveDraft, storageAvailable]);

  const formatRelativeSaved = (ts: number): string => {
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return 'baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    return `${Math.floor(diffSec / 86400)} hari lalu`;
  };

  // Field edit handler
  const setField = (key: keyof Applicant, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };

      // HandlealamatKtp "Same as alamatTinggal" checkbox trigger
      if (key === 'alamatKtpSama' && value === true) {
        updated.alamatKtp = prev.alamatTinggal;
      }
      return updated;
    });

    // Reset error highlights
    setErrors([]);
  };

  // Nested row additions/deletions handlers
  const handleEditNested = (field: 'anak' | 'saudara' | 'pendidikanFormal' | 'kursus' | 'pengalamanKerja' | 'referensiPerusahaan' | 'organisasi' | 'referensiKontak', index: number, subField: string, value: any) => {
    setForm(prev => {
      const arr = [...(prev[field] as any[])];
      arr[index] = { ...arr[index], [subField]: value };
      return { ...prev, [field]: arr };
    });
    setErrors([]);
  };

  const handleAddNested = (field: 'anak' | 'saudara' | 'pendidikanFormal' | 'kursus' | 'pengalamanKerja' | 'referensiPerusahaan' | 'organisasi' | 'referensiKontak', defaultVal: any) => {
    setForm(prev => {
      const arr = [...(prev[field] as any[])];
      arr.push(defaultVal);
      return { ...prev, [field]: arr };
    });
    setErrors([]);
  };

  const handleRemoveNested = (field: 'anak' | 'saudara' | 'pendidikanFormal' | 'kursus' | 'pengalamanKerja' | 'referensiPerusahaan' | 'organisasi' | 'referensiKontak', index: number) => {
    setForm(prev => {
      const arr = [...(prev[field] as any[])];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
    setErrors([]);
  };

  // Local steps validation
  const validateStep = (stepNum: number): boolean => {
    const localErrors: string[] = [];

    if (stepNum === 1) {
      if (!form.namaLengkap.trim()) localErrors.push('Nama Lengkap wajib diisi.');
      if (!form.tempatLahir.trim()) localErrors.push('Tempat Lahir wajib diisi.');
      if (!form.tanggalLahir) localErrors.push('Tanggal Lahir wajib diisi.');
      if (!form.alamatTinggal.trim()) localErrors.push('Alamat Tempat Tinggal wajib diisi.');
      if (!form.alamatKtp.trim()) localErrors.push('Alamat KTP sesuai kartu identitas wajib diisi.');
      if (!form.emailPribadi.trim()) localErrors.push('Email Pribadi wajib diisi.');
      if (!form.noTelp.trim()) localErrors.push('Nomor HP/Telepon wajib diisi.');
      if (!form.jenisKelamin) localErrors.push('Pilih Jenis Kelamin Anda.');
      if (!form.nomorKtp.trim() || form.nomorKtp.trim().length !== 16) localErrors.push('Nomor KTP harus tepat 16 digit angka.');
      if (!form.statusPernikahan) localErrors.push('Pilih Status Pernikahan.');
    }

    if (stepNum === 2) {
      if (!form.namaOrtu.trim()) localErrors.push('Nama Orang Tua/Wali wajib diisi.');
      if (!form.pekerjaanOrtu.trim()) localErrors.push('Pekerjaan Orang Tua/Wali wajib diisi.');
      if (!form.alamatOrtu.trim()) localErrors.push('Alamat Orang Tua/Wali wajib diisi.');

      if (form.statusPernikahan === 'Menikah' || form.statusPernikahan === 'Bercerai') {
        if (!form.namaPasangan?.trim()) localErrors.push('Identitas Nama Pasangan wajib jika sudah menikah/bercerai.');
        if (!form.pekerjaanPasangan?.trim()) localErrors.push('Pekerjaan Pasangan wajib jika sudah menikah/bercerai.');
      }
    }

    if (stepNum === 3) {
      // PendidikanFormal check (requires 2 filled values)
      if (form.pendidikanFormal.some(p => !p.sekolah.trim() || !p.dari.trim() || !p.sampai.trim() || !p.jurusan.trim() || !p. kota.trim())) {
        localErrors.push('Lengkapi setidaknya rincian sekolah pada 2 baris riwayat pendidikan formal terakhir.');
      }
    }

    if (stepNum === 4) {
      if (form.pengalamanKerja.length > 0 && !form.jobdeskTerakhir.trim()) {
        localErrors.push('Cantumkan Uraian Ringkas Jobdesk Terakhir Anda karena riwayat pekerjaan telah diisi.');
      }
    }

    if (stepNum === 5) {
      if (!form.jabatanDituju.trim()) localErrors.push('Jabatan yang ingin Saudara tuju wajib diisi.');
      if (!form.alasanJabatan.trim()) localErrors.push('Sebab alasan memilih jabatan tersebut wajib diisi.');
      if (!form.pengetahuanJabatan.trim()) localErrors.push('Uraian pengetahuan tugas tanggung jawab jabatan tersebut wajib diisi.');
      if (!form.lingkunganKerja.trim()) localErrors.push('Lingkungan kerja yang disenangi beserta alasan wajib diisi.');
      if (!form.citaCita.trim()) localErrors.push('Cita-cita dalam hidup Anda wajib dicantumkan.');
      if (!form.kesulitanKeputusan.trim()) localErrors.push('Tulis kesulitan yang dialami jika mengambil keputusan.');
    }

    if (stepNum === 6) {
      if (!form.hobby.trim()) localErrors.push('Tulis Hobby Anda.');
      if (!form.waktuLuang.trim()) localErrors.push('Tulis cara Anda mengisi waktu luang.');
      if (!form.kekuatanDiri.trim()) localErrors.push('Deskripsikan kekuatan diri dan talenta Anda.');
      if (!form.kelemahanDiri.trim()) localErrors.push('Deskripsikan kelemahan/ruang perbaikan diri Anda.');
    }

    if (stepNum === 7) {
      if (!form.gajiDiinginkan.trim()) localErrors.push('Harapan Gaji yang diinginkan wajib ditentukan.');
      if (!form.dapatMulaiBekerja.trim()) localErrors.push('Tanggal Dapat Mulai Bekerja wajib ditentukan.');
    }

    if (stepNum === 8) {
      // Check emergency contact - at least 1 is required
      const contacts = form.referensiKontak.filter(c => c.nama.trim() && c.hubungan.trim() && c.telp.trim());
      if (contacts.length < 1) {
        localErrors.push('Mohon maaf, Anda WAJIB melengkapi minimum 1 baris kontak darurat saudara terdekat.');
      }
      if (!form.kotaTgl.trim()) localErrors.push('Kota dan tanggal penandatanganan berkas wajib diisi.');
      if (!form.namaTerang.trim()) localErrors.push('Nama terang penandatangan (Tanda tangan digital) wajib diisi.');
    }

    if (localErrors.length > 0) {
      setErrors(localErrors);
      // Automatically scroll to form card container (crucial for iframe displays)
      const card = document.getElementById('form-wizard-card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return false;
    }

    setErrors([]);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setErrors([]);
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive validation across all 8 steps before final post
    let firstFailedStep = -1;
    for (let s = 1; s <= 8; s++) {
      if (!validateStep(s)) {
        firstFailedStep = s;
        break;
      }
    }

    if (firstFailedStep !== -1) {
      setCurrentStep(firstFailedStep);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form)
      });

      const json = await res.json();
      if (res.ok && json.success) {
        // Wipe localStorage draft before navigating away — the unmount-flush
        // in the hook could otherwise resurrect a stale write.
        clearDraft();
        // Redirection to success
        onSubmitSuccess(json.id);
      } else {
        setErrors([json.error || 'Gagal mengirim berkas lamaran ke database. Silakan laporkan staf rekrutmen kami.']);
      }
    } catch {
      setErrors(['Terjadi kesalahan koneksi server utama. Harap periksa jaringan internet Anda.']);
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedPosition === null) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in-up" id="vacancy-portal">
        {/* ----------------------------------------------------------------
            RESUME-DRAFT BANNER — only after first mount, only if a draft
            exists. Matches the bento card language of ApplicationSuccess:
            white card, bento-sand border, bento shadow, gradient top stripe.
        ---------------------------------------------------------------- */}
        {mounted && showResumeBanner && hasDraft && draftMeta && (
          <div className="animate-fade-in">
            <div className="bg-white border border-bento-sand rounded-[--radius-bento] shadow-[--shadow-bento] p-5 sm:p-6 relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-brand-500 before:to-brand-700">
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-3 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-widest block">
                    Ditemukan Draf Tersimpan
                  </span>
                  <h3 className="font-serif font-black text-lg text-editorial-navy tracking-tight mt-0.5">
                    Lanjutkan aplikasi Anda sebelumnya?
                  </h3>
                  <p className="text-xs text-stone-500 font-medium leading-relaxed mt-1.5">
                    Kami menemukan formulir Anda yang belum selesai. Draf ini akan otomatis terhapus dalam 30 hari sejak terakhir disimpan
                    {draftMeta.selectedPosition ? (
                      <> untuk posisi <strong className="text-stone-700 font-extrabold">{draftMeta.selectedPosition}</strong></>
                    ) : null}.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        const d = loadDraft();
                        if (d && d.selectedPosition) {
                          setForm(d.form);
                          setCurrentStep(d.currentStep);
                          setSelectedPosition(d.selectedPosition);
                          loadedThisSession.current = true;
                        }
                        setShowResumeBanner(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl px-4 py-2.5 shadow-[--shadow-bento] transition-all cursor-pointer"
                    >
                      Lanjutkan dari Bagian {draftMeta.currentStep}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearDraft();
                        loadedThisSession.current = true;
                        setShowResumeBanner(false);
                      }}
                      className="border border-bento-sand hover:border-brand-400 bg-white text-stone-600 hover:text-brand-600 font-bold text-xs rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                    >
                      Mulai dari Awal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home Button */}
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group flex items-center space-x-1.5 text-xs font-bold text-brand-100 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-white/15 hover:border-white/25"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 transform group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>

        {/* Intro */}
        <div className="text-center space-y-3 max-w-2xl mx-auto py-4">
          <span className="text-[10px] font-black tracking-widest uppercase text-brand-200 bg-brand-700/60 rounded-full px-3.5 py-1.5 border border-brand-400 inline-block">Pintu Karir Luzie Group</span>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight leading-tight">Lowongan Pekerjaan Aktif</h1>
          <p className="text-xs text-brand-100 font-semibold leading-relaxed">
            Silakan telusuri formasi posisi aktif kami di bawah ini. Pilih salah satu posisi yang paling cocok dengan kompetensi Anda untuk langsung memulai pengisian berkas formulir lamaran.
          </p>
        </div>

        {/* Grid Vacancies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
          {vacancies.filter((v) => !v.archived).length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-12 bg-white/5 border border-white/10 rounded-[--radius-bento] p-6 text-white font-semibold">
              Belum ada lowongan aktif yang terbuka saat ini.
            </div>
          ) : (
            vacancies.filter((v) => !v.archived).map((vac, idx) => {
              return (
                <div 
                  key={idx} 
                  className="bg-white rounded-[--radius-bento] shadow-[--shadow-bento] p-6 flex flex-col justify-between space-y-5 w-full transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-brand-500 before:to-brand-700"
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-md uppercase tracking-wide block w-fit">
                        {vac.category}
                      </span>
                      <h3 className="text-lg font-serif font-black text-stone-900 tracking-tight leading-snug">
                        {vac.title}
                      </h3>
                    </div>

                    <p className="text-xs text-stone-500 font-medium leading-relaxed">
                      {vac.description}
                    </p>

                    <div className="space-y-1.5 bg-bento-cream border border-bento-sand rounded-xl p-3 text-[11px] font-bold text-stone-600">
                      <div className="flex items-center space-x-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                        <span>Lokasi kerja: <strong className="text-stone-800 font-extrabold">{vac.location}</strong></span>
                      </div>
                    </div>

                    {/* Requirements list */}
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">Kualifikasi Utama:</span>
                      <ul className="space-y-1.5 text-[11px] text-stone-600 font-semibold list-none">
                        {vac.requirements.map((req, rIdx) => (
                          <li key={rIdx} className="flex items-start space-x-2">
                            <span className="text-brand-500 font-black mt-0.5 block">&bull;</span>
                            <span className="leading-snug">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPosition(vac.title);
                      setForm(prev => ({ ...prev, jabatanDituju: vac.title }));
                      loadedThisSession.current = true;
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-[--shadow-bento] flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Lamar Posisi Ini</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Custom position selection description card */}
        <div className="bg-brand-900/40 rounded-[--radius-bento] border border-brand-400 p-6 text-center max-w-xl mx-auto space-y-4 relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-brand-500 before:to-brand-700">
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Ingin melamar posisi lainnya?</h4>
            <p className="text-[11px] text-brand-100 font-semibold leading-relaxed">Bila Anda memiliki tujuan posisi jabatan kustom selain pilihan di atas, Anda bisa mengetiknya secara bebas di dalam form.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedPosition('Lainnya');
              setForm(prev => ({ ...prev, jabatanDituju: '' })); // let applicant type manually
              loadedThisSession.current = true;
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-6 py-2.5 bg-white hover:bg-stone-50 text-brand-600 border border-stone-100 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1.5"
          >
            <span>Ketik Jabatan Pilihan Secara Manual &rarr;</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in-up" id="form-wizard-card">
      <div className="bg-white rounded-[--radius-bento] shadow-[--shadow-bento] overflow-hidden relative before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-brand-500 before:to-brand-700">
        {/* Visual Form Head banner */}
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-amber-600 text-white p-6 relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 overflow-hidden">
          {/* Glow rings and overlay highlights */}
          <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none select-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="wizard-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 16 0 L 0 0 0 16" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#wizard-grid)" />
            </svg>
          </div>
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-brand-900/40 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center space-x-3 relative z-10">
            <FileText className="h-7 w-7 opacity-90" />
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-brand-100 block">Portal Rekrutmen Pelamar</span>
              <h2 className="text-2xl font-serif font-black tracking-tight mt-0.5">FORMULIR DATA PERSONAL</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedPosition(null);
              setForm(prev => ({ ...prev, jabatanDituju: '' }));
            }}
            className="self-start sm:self-center bg-white/10 hover:bg-white/25 text-white font-black text-xs px-4 py-2 rounded-xl border border-white/25 transition-all flex items-center space-x-1.5 cursor-pointer relative z-10"
          >
            <span>&larr; Pilihan Lowongan</span>
          </button>

          {/* Dynamic progress bar */}
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-1.5 bg-bento-beige/20 rounded-full overflow-hidden mx-0">
              <div className="h-full bg-gradient-to-r from-amber-400 via-brand-500 to-brand-700 transition-all duration-500 rounded-full" style={{ width: `${(currentStep / 8) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Position context bar */}
        <div className="bg-bento-cream border-b border-bento-sand px-6 py-2.5 flex items-center justify-between text-xs font-bold text-stone-600 select-none">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span>
              Pilihan Formasi Jabatan: <strong className="text-stone-800 font-black uppercase">{selectedPosition === 'Lainnya' ? (form.jabatanDituju || 'Typed Manually') : selectedPosition}</strong>
            </span>
          </div>
          <button 
            type="button"
            onClick={() => {
              setSelectedPosition(null);
              setForm(prev => ({ ...prev, jabatanDituju: '' }));
            }}
            className="text-brand-600 hover:text-brand-800 underline uppercase tracking-wider text-[10px] font-black cursor-pointer"
          >
            [ Ganti Formasi ]
          </button>
        </div>

        {/* Steps Navigation Header — rounded pill indicators + saved pill */}
        <div className="border-b border-bento-sand px-6 py-4 bg-bento-beige/30">
          <div className="flex items-center gap-3">
            <div className="hidden sm:block flex-1" />

            <div className="flex flex-wrap gap-2 justify-center">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    // Only allow navigation back to previous steps or next step if validated
                    if (s < currentStep) setCurrentStep(s);
                    else if (s === currentStep) return;
                    else {
                      // If skipping ahead, enforce validation step-by-step
                      for (let i = currentStep; i < s; i++) {
                        if (!validateStep(i)) return;
                      }
                      setCurrentStep(s);
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all duration-200 ${
                    currentStep === s
                      ? 'bg-brand-500 text-white shadow-sm'
                      : s < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-bento-beige/50 text-stone-500 hover:bg-bento-beige'
                  }`}
                >
                  {s < currentStep ? <Check className="h-3.5 w-3.5" /> : s}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex flex-1 justify-end">
              {lastSavedAt && (
                <div
                  className="flex items-center space-x-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm animate-fade-in"
                  title={`Draf tersimpan ${new Date(lastSavedAt).toLocaleString('id-ID')}`}
                >
                  <Check className="h-3 w-3" />
                  <span>Tersimpan {formatRelativeSaved(lastSavedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {lastSavedAt && (
            <div className="sm:hidden flex justify-end mt-2.5">
              <div
                className="flex items-center space-x-1.5 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm animate-fade-in"
                title={`Draf tersimpan ${new Date(lastSavedAt).toLocaleString('id-ID')}`}
              >
                <Check className="h-2.5 w-2.5" />
                <span>Tersimpan {formatRelativeSaved(lastSavedAt)}</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Error notification window */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-state-error p-3 rounded-xl text-xs font-semibold space-y-1">
              <span className="font-extrabold block uppercase mb-1 text-xs">Mohon Lengkapi Kolom di Bawah:</span>
              {errors.map((err, idx) => (
                <p key={idx} className="flex items-start space-x-1.5 font-medium">
                  <span className="font-bold">&bull;</span>
                  <span>{err}</span>
                </p>
              ))}
            </div>
          )}

          {/* STEP 1: IDENTITAS PRIBADI */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Bagian 1 — 8</span>
                <h3 className="font-serif font-black text-xl tracking-tight text-stone-900">Identitas Pribadi</h3>
                <p className="text-sm text-stone-500 font-medium">Silakan isi rincian diri sesuai kartu identitas KTP Anda yang sah.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nama Lengkap Sesuai KTP <span className="text-state-error">*</span></label>
                  <input type="text" value={form.namaLengkap} onChange={(e) => setField('namaLengkap', e.target.value)} placeholder="Contoh: Luzie Hermawan" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nomor KTP (ID Card / 16 Digit) <span className="text-state-error">*</span></label>
                  <input type="text" maxLength={16} value={form.nomorKtp} onChange={(e) => setField('nomorKtp', e.target.value.replace(/\D/g, ''))} placeholder="Masukkan 16 angka nomor KTP" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 font-mono" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tempat Lahir <span className="text-state-error">*</span></label>
                  <input type="text" value={form.tempatLahir} onChange={(e) => setField('tempatLahir', e.target.value)} placeholder="Kota tempat lahir" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tanggal Lahir <span className="text-state-error">*</span></label>
                  <input type="date" value={form.tanggalLahir} onChange={(e) => setField('tanggalLahir', e.target.value)} className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 cursor-pointer" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Kewarganegaraan</label>
                  <input type="text" value={form.kewarganegaraan} onChange={(e) => setField('kewarganegaraan', e.target.value)} className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Agama</label>
                  <div className="relative">
                    <select value={form.agama} onChange={(e) => setField('agama', e.target.value)} className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 cursor-pointer appearance-none">
                      <option value="">Pilih Agama</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen / Protestan</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Email Pribadi Aktif <span className="text-state-error">*</span></label>
                  <input type="email" value={form.emailPribadi} onChange={(e) => setField('emailPribadi', e.target.value)} placeholder="name@domain.com" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 font-mono" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nomor HP / WhatsApp Aktif <span className="text-state-error">*</span></label>
                  <input type="text" value={form.noTelp} onChange={(e) => setField('noTelp', e.target.value.replace(/[^0-9+]/g, ''))} placeholder="08xxxxxxxxxx" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 font-mono" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Jenis Kelamin <span className="text-state-error">*</span></label>
                  <div className="flex space-x-6 py-2">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                      <input type="radio" checked={form.jenisKelamin === 'Laki-laki'} onChange={() => setField('jenisKelamin', 'Laki-laki')} className="accent-brand-500 h-4 w-4" />
                      <span>Laki-Laki</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                      <input type="radio" checked={form.jenisKelamin === 'Perempuan'} onChange={() => setField('jenisKelamin', 'Perempuan')} className="accent-brand-500 h-4 w-4" />
                      <span>Perempuan</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Golongan Darah</label>
                  <div className="relative">
                    <select value={form.golonganDarah} onChange={(e) => setField('golonganDarah', e.target.value)} className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 cursor-pointer appearance-none">
                      <option value="">A / B / AB / O / Tidak Tahu</option>
                      <option value="A">Golongan A</option>
                      <option value="B">Golongan B</option>
                      <option value="AB">Golongan AB</option>
                      <option value="O">Golongan O</option>
                      <option value="Tidak Tahu">Tidak Tahu</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Status Pernikahan <span className="text-state-error">*</span></label>
                  <div className="relative">
                    <select value={form.statusPernikahan} onChange={(e) => setField('statusPernikahan', e.target.value)} className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 cursor-pointer appearance-none">
                      <option value="">Pilih Status</option>
                      <option value="Single">Single (Lajang)</option>
                      <option value="Tunangan">Tunangan / Bertunangan</option>
                      <option value="Menikah">Menikah</option>
                      <option value="Bercerai">Bercerai (Janda/Duda)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {form.statusPernikahan && form.statusPernikahan !== 'Single' && (
                  <div className="space-y-1.5 animate-fade-in-up">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tanggal Pernikahan/Status <span className="text-state-error">*</span></label>
                    <input type="date" value={form.tanggalStatusPernikahan} onChange={(e) => setField('tanggalStatusPernikahan', e.target.value)} className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 cursor-pointer" />
                  </div>
                )}

                {/* SIM Ownership boxes */}
                <div className="md:col-span-2 space-y-4 p-4 bg-bento-cream rounded-xl border border-bento-sand mt-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Ijin Mengemudi (SIM yang Dimiliki)</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                        <input type="checkbox" checked={form.simC} onChange={(e) => setField('simC', e.target.checked)} className="accent-brand-500 h-4 w-4" />
                        <span>Memiliki SIM C</span>
                      </label>
                      {form.simC && (
                        <input type="text" placeholder="Masukkan nomor SIM C" value={form.noSimC} onChange={(e) => setField('noSimC', e.target.value)} className="w-full bg-white border border-bento-sand p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                        <input type="checkbox" checked={form.simA} onChange={(e) => setField('simA', e.target.checked)} className="accent-brand-500 h-4 w-4" />
                        <span>Memiliki SIM A</span>
                      </label>
                      {form.simA && (
                        <input type="text" placeholder="Masukkan nomor SIM A" value={form.noSimA} onChange={(e) => setField('noSimA', e.target.value)} className="w-full bg-white border border-bento-sand p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Addresses section */}
                <div className="md:col-span-2 space-y-1.5 mt-2">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Alamat Tempat Tinggal Sekarang <span className="text-state-error">*</span></label>
                  <textarea rows={3} value={form.alamatTinggal} onChange={(e) => setField('alamatTinggal', e.target.value)} placeholder="Tulis lengkap domisili tempat tinggal Anda saat ini..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Alamat Sesuai KTP <span className="text-state-error">*</span></label>
                    <label className="flex items-center space-x-2 text-brand-600 font-bold text-xs cursor-pointer">
                      <input type="checkbox" checked={form.alamatKtpSama} onChange={(e) => setField('alamatKtpSama', e.target.checked)} className="accent-brand-500 h-4 w-4" />
                      <span>Sama dengan alamat domisili sekarang</span>
                    </label>
                  </div>
                  <textarea rows={3} disabled={form.alamatKtpSama} value={form.alamatKtp} onChange={(e) => setField('alamatKtp', e.target.value)} placeholder="Tulis alamat persis sesuai KTP Anda..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 disabled:opacity-60" />
                </div>

              </div>
            </div>
          )}

          {/* STEP 2: KELUARGA & LINGKUNGAN */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Bagian 2 — 8</span>
                <h3 className="font-serif font-black text-xl tracking-tight text-stone-900">Keluarga & Lingkungan</h3>
                <p className="text-sm text-stone-500 font-medium">Informasi data keluarga dan lingkungan sosial Anda.</p>
              </div>

              {/* IF MARRIED, SHOW SPOUSE/CHILDREN FIELDS */}
              {(form.statusPernikahan === 'Menikah' || form.statusPernikahan === 'Bercerai') && (
                <div className="space-y-5 p-5 bg-bento-cream rounded-xl border border-bento-sand">
                  <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">Data Pasangan (Istri / Suami)</span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nama Istri / Suami <span className="text-state-error">*</span></label>
                      <input type="text" value={form.namaPasangan} onChange={(e) => setField('namaPasangan', e.target.value)} placeholder="Nama lengkap pasangan" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tempat & Tgl. Lahir Pasangan <span className="text-state-error">*</span></label>
                      <input type="text" value={form.ttlPasangan} onChange={(e) => setField('ttlPasangan', e.target.value)} placeholder="Contoh: Purwokerto, 15 April 1995" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pendidikan Terakhir Pasangan</label>
                      <input type="text" value={form.pendidikanPasangan} onChange={(e) => setField('pendidikanPasangan', e.target.value)} placeholder="Contoh: S1 Akuntansi" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pekerjaan Pasangan <span className="text-state-error">*</span></label>
                      <input type="text" value={form.pekerjaanPasangan} onChange={(e) => setField('pekerjaanPasangan', e.target.value)} placeholder="Tuliskan profesi pasangan saat ini" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    </div>
                  </div>

                  {/* Sub-Children rows additions */}
                  <div className="space-y-4 pt-3 border-t border-bento-sand">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Daftar Anak-Anak (Maksimal 5)</span>
                      {form.anak.length < 5 && (
                        <button type="button" onClick={() => handleAddNested('anak', { nama: '', ttl: '', pendidikan: '' })} className="flex items-center space-x-2 text-brand-600 font-bold text-xs hover:text-brand-700 transition-colors cursor-pointer">
                          <Plus className="h-4 w-4" />
                          <span>Tambah Anak</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {form.anak.map((ch, idx) => (
                        <div key={idx} className="p-4 bg-bento-cream rounded-xl border border-bento-sand grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
                          <input type="text" placeholder="Nama Anak" value={ch.nama} onChange={(e) => handleEditNested('anak', idx, 'nama', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                          <input type="text" placeholder="Tempat & Tgl Lahir" value={ch.ttl} onChange={(e) => handleEditNested('anak', idx, 'ttl', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                          <div className="flex items-center space-x-2">
                            <input type="text" placeholder="Pendidikan" value={ch.pendidikan} onChange={(e) => handleEditNested('anak', idx, 'pendidikan', e.target.value)} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                            <button type="button" onClick={() => handleRemoveNested('anak', idx)} className="text-state-error hover:text-red-600 p-1 cursor-pointer">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Parents detail */}
              <div className="space-y-4 p-5 bg-bento-cream rounded-xl border border-bento-sand">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Data Orang Tua / Wali</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nama Ayah / Ibu / Wali <span className="text-state-error">*</span></label>
                    <input type="text" value={form.namaOrtu} onChange={(e) => setField('namaOrtu', e.target.value)} placeholder="Cantumkan nama penanggung jawab / orut" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pekerjaan Orang Tua / Wali <span className="text-state-error">*</span></label>
                    <input type="text" value={form.pekerjaanOrtu} onChange={(e) => setField('pekerjaanOrtu', e.target.value)} placeholder="Tuliskan profesi pekerjaan orang tua" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Alamat Lengkap Orang Tua <span className="text-state-error">*</span></label>
                    <textarea rows={2} value={form.alamatOrtu} onChange={(e) => setField('alamatOrtu', e.target.value)} placeholder="Tuliskan alamat tinggal orang tua saat ini..." className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                  </div>
                </div>
              </div>

              {/* SIBLINGS (Saudara Kandung) */}
              <div className="space-y-4 p-5 bg-bento-cream rounded-xl border border-bento-sand">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Saudara Kandung (Maksimal 4)</span>
                  {form.saudara.length < 4 && (
                    <button type="button" onClick={() => handleAddNested('saudara', { nama: '', kakakAdik: '', usia: '', pendidikanPekerjaan: '' })} className="flex items-center space-x-2 text-brand-600 font-bold text-xs hover:text-brand-700 transition-colors cursor-pointer">
                      <Plus className="h-4 w-4" />
                      <span>Tambah Saudara</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {form.saudara.map((sd, idx) => (
                    <div key={idx} className="p-4 bg-bento-cream rounded-xl border border-bento-sand grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
                      <input type="text" placeholder="Nama Saudara" value={sd.nama} onChange={(e) => handleEditNested('saudara', idx, 'nama', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      <div className="relative">
                        <select value={sd.kakakAdik} onChange={(e) => handleEditNested('saudara', idx, 'kakakAdik', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 cursor-pointer appearance-none">
                          <option value="">Status</option>
                          <option value="Kakak">Kakak</option>
                          <option value="Adik">Adik</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="text" placeholder="Usia (th)" value={sd.usia} onChange={(e) => handleEditNested('saudara', idx, 'usia', e.target.value)} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                        <input type="text" placeholder="Pendidikan / Pekerjaan" value={sd.pendidikanPekerjaan} onChange={(e) => handleEditNested('saudara', idx, 'pendidikanPekerjaan', e.target.value)} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                        <button type="button" onClick={() => handleRemoveNested('saudara', idx)} className="text-state-error hover:text-red-600 p-1 cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {form.saudara.length === 0 && (
                    <p className="text-xs text-stone-500 font-medium italic">Anda belum mencantumkan data saudara kandung.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* STEP 3: RIWAYAT PENDIDIKAN */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Bagian 3 — 8</span>
              <h3 className="font-serif font-black text-xl tracking-tight text-stone-900">Riwayat Pendidikan & Pelatihan</h3>
              <p className="text-sm text-stone-500 font-medium">Cantumkan maksimal 2 riwayat pendidikan formal terakhir Anda (misalnya SMA/K dan Kuliah S1).</p>
            </div>

            <div className="space-y-4">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pendidikan Formal <span className="text-state-error">*</span></span>

              <div className="space-y-3">
                {form.pendidikanFormal.map((pf, idx) => (
                  <div key={idx} className="p-4 bg-bento-cream rounded-xl border border-bento-sand grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Periode Tahun <span className="text-state-error">*</span></label>
                      <div className="flex space-x-2">
                        <input type="text" placeholder="Dari" value={pf.dari} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'dari', e.target.value.replace(/\D/g, ''))} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                        <input type="text" placeholder="Sampai" value={pf.sampai} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'sampai', e.target.value.replace(/\D/g, ''))} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nama Sekolah / Universitas <span className="text-state-error">*</span></label>
                      <input type="text" placeholder="Contoh: SMA Negeri 1 atau Universitas Jenderal Soedirman" value={pf.sekolah} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'sekolah', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Jurusan & Kota <span className="text-state-error">*</span></label>
                      <div className="flex space-x-2">
                        <input type="text" placeholder="Jurusan" value={pf.jurusan} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'jurusan', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                        <input type="text" placeholder="Kota" value={pf.kota} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'kota', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Kepemilikan Ijazah <span className="text-state-error">*</span></label>
                      <div className="relative">
                        <select value={pf.ijazah} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'ijazah', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 cursor-pointer appearance-none">
                          <option value="">Pilih</option>
                          <option value="Ya">Ya (Lulus)</option>
                          <option value="Tidak">Tidak</option>
                          <option value="Dalam Proses">Dalam Proses</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Courses / non-formal learning */}
            <div className="space-y-4 pt-4 border-t border-bento-sand">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pendidikan Non-Formal (Kursus / Pelatihan / Kursi)</span>
                {form.kursus.length < 5 && (
                  <button type="button" onClick={() => handleAddNested('kursus', { bidang: '', lamanya: '', tempat: '' })} className="flex items-center space-x-2 text-brand-600 font-bold text-xs hover:text-brand-700 transition-colors cursor-pointer">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Kursus</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {form.kursus.map((ks, idx) => (
                  <div key={idx} className="p-4 bg-bento-cream rounded-xl border border-bento-sand grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
                    <input type="text" placeholder="Bidang Kursus / Keahlian" value={ks.bidang} onChange={(e) => handleEditNested('kursus', idx, 'bidang', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    <input type="text" placeholder="Lama Durasi (Contoh: 3 Bulan)" value={ks.lamanya} onChange={(e) => handleEditNested('kursus', idx, 'lamanya', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    <div className="flex items-center space-x-2">
                      <input type="text" placeholder="Tempat Penyelenggara" value={ks.tempat} onChange={(e) => handleEditNested('kursus', idx, 'tempat', e.target.value)} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      <button type="button" onClick={() => handleRemoveNested('kursus', idx)} className="text-state-error hover:text-red-600 p-1 cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {form.kursus.length === 0 && (
                  <p className="text-xs text-stone-500 font-medium italic">Belum ada kursus yang dicantumkan.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PENGALAMAN KERJA */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Bagian 4 — 8</span>
              <h3 className="font-serif font-black text-xl tracking-tight text-stone-900">Pengalaman Kerja & Referensi</h3>
              <p className="text-sm text-stone-500 font-medium">Cantumkan daftar pekerjaan yang pernah Anda geluti maksimal 6 riwayat terakhir.</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Riwayat Pengalaman Kerja sebelumnya</span>
                {form.pengalamanKerja.length < 6 && (
                  <button type="button" onClick={() => handleAddNested('pengalamanKerja', { perusahaan: '', dari: '', sampai: '', jabatan: '', gaji: '', alasanPindah: '' })} className="flex items-center space-x-2 text-brand-600 font-bold text-xs hover:text-brand-700 transition-colors cursor-pointer">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Pekerjaan</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {form.pengalamanKerja.map((pk, idx) => (
                  <div key={idx} className="p-4 bg-bento-cream rounded-xl border border-bento-sand relative">
                    <button type="button" onClick={() => handleRemoveNested('pengalamanKerja', idx)} className="absolute right-3 top-3 text-state-error hover:text-red-600 p-1 cursor-pointer" title="Hapus Riwayat ini">
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nama Perusahaan</label>
                        <input type="text" value={pk.perusahaan} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'perusahaan', e.target.value)} placeholder="Nama Kantor" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Periode Tahun (Dari - Sampai)</label>
                        <div className="flex space-x-2">
                          <input type="text" placeholder="Dari" value={pk.dari} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'dari', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                          <input type="text" placeholder="Sampai" value={pk.sampai} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'sampai', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Jabatan / Posisi</label>
                        <input type="text" value={pk.jabatan} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'jabatan', e.target.value)} placeholder="Contoh: Staff Marketing" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Gaji Bulanan Terakhir (Rp)</label>
                        <input type="text" value={pk.gaji} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'gaji', e.target.value.replace(/\D/g, ''))} placeholder="Masukkan besaran angka gaji" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Alasan Pindah / Mengundurkan Diri</label>
                        <input type="text" value={pk.alasanPindah} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'alasanPindah', e.target.value)} placeholder="Sebab berpindah tempat kerja" className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      </div>
                    </div>
                  </div>
                ))}
                {form.pengalamanKerja.length === 0 && (
                  <p className="text-xs text-stone-500 font-medium italic">Belum mencantumkan riwayat pekerjaan sebelumnya (Silakan tambah jika ada, kosongkan jika fresh graduate).</p>
                )}
              </div>
            </div>

            {/* General Job Descriptor textarea */}
            <div className="space-y-1.5 pt-3">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Uraian Ringkas Jobdesk Terakhir Serta Kendalanya <span className="text-state-error">{form.pengalamanKerja.length > 0 ? '*' : ''}</span></label>
              <textarea rows={3} value={form.jobdeskTerakhir} onChange={(e) => setField('jobdeskTerakhir', e.target.value)} placeholder="Jelaskan peran tugas nyata Anda di kantor terakhir beserta tantangan yang pernah dihadapi (Boleh kosong jika belum memilki pengalaman kerja)..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
            </div>

            {/* Former Boss references */}
            <div className="space-y-4 pt-4 border-t border-bento-sand">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Referensi Atasan / Perusahaan Terkait (Maksimal 5)</span>
                {form.referensiPerusahaan.length < 5 && (
                  <button type="button" onClick={() => handleAddNested('referensiPerusahaan', { perusahaan: '', kontak: '', telp: '', hubungan: '' })} className="flex items-center space-x-2 text-brand-600 font-bold text-xs hover:text-brand-700 transition-colors cursor-pointer">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Referensi</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {form.referensiPerusahaan.map((rp, idx) => (
                  <div key={idx} className="p-4 bg-bento-cream rounded-xl border border-bento-sand grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
                    <input type="text" placeholder="Perusahaan" value={rp.perusahaan} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'perusahaan', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    <input type="text" placeholder="Nama Atasan" value={rp.kontak} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'kontak', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    <div className="flex items-center space-x-2">
                      <input type="text" placeholder="No HP Seluler" value={rp.telp} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'telp', e.target.value.replace(/[^0-9+]/g, ''))} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 font-mono" />
                      <input type="text" placeholder="Hubungan Kerja" value={rp.hubungan} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'hubungan', e.target.value)} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      <button type="button" onClick={() => handleRemoveNested('referensiPerusahaan', idx)} className="text-state-error hover:text-red-600 p-1 cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {form.referensiPerusahaan.length === 0 && (
                  <p className="text-xs text-stone-500 font-medium italic">Referensi pihak kantor lama belum dimasukkan.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: MINAT & KONSEP DIRI */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Bagian 5 — 8</span>
              <h3 className="font-serif font-black text-xl tracking-tight text-stone-900">Minat & Konsep Diri</h3>
              <p className="text-sm text-stone-500 font-medium">Lengkapi kuesioner pemahaman peran dan cita-cita hidup Anda.</p>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">1. Jabatan / Lowongan apa yang ingin Saudara tuju? <span className="text-state-error">*</span></label>
                {selectedPosition && selectedPosition !== 'Lainnya' ? (
                  <div className="relative">
                    <input 
                      type="text" 
                      value={form.jabatanDituju} 
                      readOnly
                      className="w-full bg-brand-50/50 border border-brand-200 text-brand-900 font-extrabold p-3 rounded-xl text-sm outline-hidden cursor-not-allowed" 
                    />
                    <span className="absolute right-3 top-3 bg-brand-100 text-brand-700 text-[9px] font-bold px-2 py-1 rounded-md uppercase">
                      Pilihan Aktif
                    </span>
                    <p className="text-[10px] text-brand-500 font-semibold mt-1">Jabatan ini terkunci berdasarkan pilihan lowongan aktif Anda. Apabila ingin mengubah, silakan klik tombol <strong>"Ganti Formasi"</strong> di paling atas halaman.</p>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={form.jabatanDituju} 
                    onChange={(e) => setField('jabatanDituju', e.target.value)} 
                    placeholder="Contoh: Digital Marketer / Admin Operasional" 
                    className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" 
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">2. Mengapa Saudara ingin bekerja pada jabatan tersebut? <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.alasanJabatan} onChange={(e) => setField('alasanJabatan', e.target.value)} placeholder="Tuliskan motivasi dasar mengapa melamar posisi lowongan tersebut..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">3. Apa yang Saudara ketahui tentang jabatan tersebut? (tugas dan tanggung jawabnya) <span className="text-state-error">*</span></label>
                <textarea rows={3} value={form.pengetahuanJabatan} onChange={(e) => setField('pengetahuanJabatan', e.target.value)} placeholder="Urai pemahaman Anda mengenai tupoksi (tugas pokok dan fungsi) jabatan yang dituju..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">4. Lingkungan kerja apa yang Saudara senangi? Apa sebabnya? <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.lingkunganKerja} onChange={(e) => setField('lingkunganKerja', e.target.value)} placeholder="Sebutkan lingkungan kerja ternyaman Anda (misal: kolaboratif, senyap, rapi)..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">5. Apa cita-cita dalam hidup Anda? <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.citaCita} onChange={(e) => setField('citaCita', e.target.value)} placeholder="Tulis visi impian hidup Anda..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">6. Terhadap hal-hal apa saja Saudara paling sulit untuk mengambil keputusan? <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.kesulitanKeputusan} onChange={(e) => setField('kesulitanKeputusan', e.target.value)} placeholder="Tulis rincian kondisi yang membuat Anda goyah atau sulit memutuskan masalah..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: AKTIFITAS SOSIAL & KEMASYARAKATAN */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Bagian 6 — 8</span>
              <h3 className="font-serif font-black text-xl tracking-tight text-stone-900">Aktifitas Sosial & Kemasyarakatan</h3>
              <p className="text-sm text-stone-500 font-medium">Informasi terkait minat talenta diri dan riwayat organisasi sosial kemasyarakatan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Hobby / Kegemaran <span className="text-state-error">*</span></label>
                <input type="text" value={form.hobby} onChange={(e) => setField('hobby', e.target.value)} placeholder="Kegemaran utama" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Cara Mengisi Waktu Luang <span className="text-state-error">*</span></label>
                <input type="text" value={form.waktuLuang} onChange={(e) => setField('waktuLuang', e.target.value)} placeholder="Contoh: Membaca, mengasah keahlian baru" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="md:col-span-2 space-y-3 p-4 bg-bento-cream rounded-xl border border-bento-sand">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Apakah Saudara Pernah Keluar Negeri?</label>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                    <input type="radio" checked={form.pernahKeLuarNegeri === 'Ya'} onChange={() => setField('pernahKeLuarNegeri', 'Ya')} className="accent-brand-500 h-4 w-4" />
                    <span>Ya</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                    <input type="radio" checked={form.pernahKeLuarNegeri === 'Tidak'} onChange={() => setField('pernahKeLuarNegeri', 'Tidak')} className="accent-brand-500 h-4 w-4" />
                    <span>Tidak</span>
                  </label>
                </div>
                {form.pernahKeLuarNegeri === 'Ya' && (
                  <textarea rows={2} value={form.detailKunjunganLuarNegeri} onChange={(e) => setField('detailKunjunganLuarNegeri', e.target.value)} placeholder="Tuliskan: Kapan, berapa lama, dan dalam rangka keperluan apa?" className="w-full bg-white border border-bento-sand p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden mt-2" />
                )}
              </div>

              <div className="md:col-span-2 space-y-1.5 pt-3">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Kekuatan Diri (Kelebihan / Bakat / Talenta) <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.kekuatanDiri} onChange={(e) => setField('kekuatanDiri', e.target.value)} placeholder="Sebutkan hal-hal positif, keterampilan, atau kepribadian tangguh penunjang karir Anda..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Kelemahan Diri (Ruang Evaluasi evaluasi diri) <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.kelemahanDiri} onChange={(e) => setField('kelemahanDiri', e.target.value)} placeholder="Sebutkan kelemahan Anda secara obyektif beserta upaya menanggulanginya..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>
            </div>

            {/* Organizations list */}
            <div className="space-y-4 pt-4 border-t border-bento-sand">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Organisasi yang Pernah Diikuti (Maksimal 5)</span>
                {form.organisasi.length < 5 && (
                  <button type="button" onClick={() => handleAddNested('organisasi', { nama: '', periode: '', jabatan: '', keterangan: '' })} className="flex items-center space-x-2 text-brand-600 font-bold text-xs hover:text-brand-700 transition-colors cursor-pointer">
                    <Plus className="h-4 w-4" />
                    <span>Tambah Organisasi</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {form.organisasi.map((org, idx) => (
                  <div key={idx} className="p-4 bg-bento-cream rounded-xl border border-bento-sand grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
                    <input type="text" placeholder="Nama Organisasi" value={org.nama} onChange={(e) => handleEditNested('organisasi', idx, 'nama', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    <div className="flex items-center space-x-2">
                      <input type="text" placeholder="Tahun / Periode" value={org.periode} onChange={(e) => handleEditNested('organisasi', idx, 'periode', e.target.value)} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      <input type="text" placeholder="Jabatan" value={org.jabatan} onChange={(e) => handleEditNested('organisasi', idx, 'jabatan', e.target.value)} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="text" placeholder="Keterangan / Tugas" value={org.keterangan} onChange={(e) => handleEditNested('organisasi', idx, 'keterangan', e.target.value)} className="flex-1 bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                      <button type="button" onClick={() => handleRemoveNested('organisasi', idx)} className="text-state-error hover:text-red-600 p-1 cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {form.organisasi.length === 0 && (
                  <p className="text-xs text-stone-500 font-medium italic">Belum mencantumkan riwayat organisasi sosial.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: INTERN PERUSAHAAN & LAIN-LAIN */}
        {currentStep === 7 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Bagian 7 — 8</span>
              <h3 className="font-serif font-black text-xl tracking-tight text-stone-900">Ekspektasi Karir & Kondisi Kesehatan</h3>
              <p className="text-sm text-stone-500 font-medium">Lengkapi harapan fasilitas serta asuransi kesehatan pribadi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Harapan Besaran Gaji yang Diinginkan (Rp / Bulan) <span className="text-state-error">*</span></label>
                <input type="text" value={form.gajiDiinginkan} onChange={(e) => setField('gajiDiinginkan', e.target.value.replace(/\D/g, ''))} placeholder="Contoh: 3500000" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tanggal Dapat Mulai Bekerja <span className="text-state-error">*</span></label>
                <input type="text" value={form.dapatMulaiBekerja} onChange={(e) => setField('dapatMulaiBekerja', e.target.value)} placeholder="Contoh: Secepatnya / ASAPP / 1 Juni 2026" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Fasilitas Penunjang yang Diharapkan</label>
                <textarea rows={2.5} value={form.fasilitasDiharapkan} onChange={(e) => setField('fasilitasDiharapkan', e.target.value)} placeholder="Misalnya: BPJS, Laptop Kantor..." className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Jenis Kendaraan Pribadi yang Dimiliki</label>
                <input type="text" value={form.kendaraanDimiliki} onChange={(e) => setField('kendaraanDimiliki', e.target.value)} placeholder="Contoh: Sepeda Motor / Mobil" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
              </div>

              {/* Health section */}
              <div className="md:col-span-2 space-y-4 border-t border-bento-sand pt-4">
                <div className="p-4 bg-bento-cream rounded-xl border border-bento-sand space-y-3">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pernah Sakit Keras / Cedera Menahun?</label>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                      <input type="radio" checked={form.pernahSakitKeras === 'Ya'} onChange={() => setField('pernahSakitKeras', 'Ya')} className="accent-brand-500 h-4 w-4" />
                      <span>Ya</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                      <input type="radio" checked={form.pernahSakitKeras === 'Tidak'} onChange={() => setField('pernahSakitKeras', 'Tidak')} className="accent-brand-500 h-4 w-4" />
                      <span>Tidak</span>
                    </label>
                  </div>
                  {form.pernahSakitKeras === 'Ya' && (
                    <textarea rows={2} value={form.detailSakitKeras} onChange={(e) => setField('detailSakitKeras', e.target.value)} placeholder="Tuliskan: Sakit apa, penanggulangan medis, dan masa rawat?" className="w-full bg-white border border-bento-sand p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden mt-2" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Gangguan Jasmani Tetap (Bila Ada)</label>
                  <input type="text" value={form.gangguanJasmani} onChange={(e) => setField('gangguanJasmani', e.target.value)} placeholder="Sebutkan hambatan fisik permanen (Boleh dikosongkan jika tidak ada)" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                </div>

                <div className="p-4 bg-bento-cream rounded-xl border border-bento-sand space-y-3">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Apakah Anggota Keluarga Sehat Baik-baik Saja?</label>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                      <input type="radio" checked={form.kesehatanKeluargaBaik === 'Ya'} onChange={() => setField('kesehatanKeluargaBaik', 'Ya')} className="accent-brand-500 h-4 w-4" />
                      <span>Ya (Sehat Semua)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm font-semibold text-stone-700 cursor-pointer">
                      <input type="radio" checked={form.kesehatanKeluargaBaik === 'Tidak'} onChange={() => setField('kesehatanKeluargaBaik', 'Tidak')} className="accent-brand-500 h-4 w-4" />
                      <span>Tidak</span>
                    </label>
                  </div>
                  {form.kesehatanKeluargaBaik === 'Tidak' && (
                    <textarea rows={2} value={form.detailKesehatanKeluarga} onChange={(e) => setField('detailKesehatanKeluarga', e.target.value)} placeholder="Uraikan siapa anggota keluarga sedarah terdekat Anda yang rentan cedera/sakit parah..." className="w-full bg-white border border-bento-sand p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden mt-2" />
                  )}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Alamat Akun Media Sosial Aktif (Instagram / LinkedIn / TikTok / Berkas)</label>
                  <input type="text" value={form.alamatMediaSosial} onChange={(e) => setField('alamatMediaSosial', e.target.value)} placeholder="Sebutkan link tautan akun sosmed Anda (IG: @luzie, LinkedIn: Luzie, dsb)" className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: REFERENSI DARURAT (WAJIB MINIMAL 1) */}
        {currentStep === 8 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Bagian 8 — 8</span>
              <h3 className="font-serif font-black text-xl tracking-tight text-stone-900">Referensi Darurat & Pengesahan</h3>
              <p className="text-sm text-stone-500 font-medium">Sesuai standar operasional, Anda wajib mencantumkan minimal 1 nomor HP keluarga/kerabat dekat (Maksimal 3).</p>
            </div>

            <div className="space-y-4">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nomor Kontak Kerabat Dekat Terkait (Minimal 1) <span className="text-state-error">*</span></span>

              <div className="space-y-3">
                {form.referensiKontak.map((co, idx) => (
                  <div key={idx} className="p-4 bg-bento-cream rounded-xl border border-bento-sand grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        Nama Lengkap Kerabat {idx + 1} {idx === 0 ? <span className="text-state-error">*</span> : <span className="text-stone-400 font-normal">(Opsional)</span>}
                      </label>
                      <input type="text" placeholder="Masukkan nama terang" value={co.nama} onChange={(e) => handleEditNested('referensiKontak', idx, 'nama', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        Hubungan / Kekerabatan {idx === 0 ? <span className="text-state-error">*</span> : <span className="text-stone-400 font-normal">(Opsional)</span>}
                      </label>
                      <input type="text" placeholder="Contoh: Kakak Kandung, Ibu, Teman Akrab" value={co.hubungan} onChange={(e) => handleEditNested('referensiKontak', idx, 'hubungan', e.target.value)} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        Nomor Telepon Seluler HP {idx === 0 ? <span className="text-state-error">*</span> : <span className="text-stone-400 font-normal">(Opsional)</span>}
                      </label>
                      <input type="text" placeholder="08xxxxxxxx" value={co.telp} onChange={(e) => handleEditNested('referensiKontak', idx, 'telp', e.target.value.replace(/[^0-9+]/g, ''))} className="w-full bg-white border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden transition-all duration-200 font-mono" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authoritative Sign-off name */}
            <div className="space-y-5 p-5 bg-bento-cream rounded-xl border border-bento-sand mt-6">
              <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">E-LEGALITAS PERNYATAAN DATA PERSONAL</span>
              <p className="text-sm text-stone-600 leading-relaxed font-medium">
                Dengan saksama membubuhkan tanda pengenal di bawah, saya bersumpah bahwa seluruh butir uraian informasi lamaran kerja ini adalah jujur, akurat dan sah. Apabila di kemudian hari ditemukan kecurangan/palsu, saya bersedia diberhentikan sepihak tanpa syarat.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tempat & Tanggal Pengesahan <span className="text-state-error">*</span></label>
                  <input type="text" value={form.kotaTgl} onChange={(e) => setField('kotaTgl', e.target.value)} placeholder="Contoh: Purwokerto, 29 Mei 2026" className="w-full bg-white border border-bento-sand p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nama Terang Penandatangan <span className="text-state-error">*</span></label>
                  <input type="text" value={form.namaTerang} onChange={(e) => setField('namaTerang', e.target.value)} placeholder="Ketik nama lengkap Anda sebagai pengganti tanda tangan" className="w-full bg-white border border-bento-sand p-3 rounded-xl text-sm text-stone-800 font-medium outline-hidden" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error notification window at the bottom */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-state-error p-3 rounded-xl text-xs font-semibold space-y-1">
            <span className="font-extrabold block uppercase mb-1 text-xs">Mohon Lengkapi Kolom di Bawah:</span>
            {errors.map((err, idx) => (
              <p key={idx} className="flex items-start space-x-1.5 font-medium">
                <span className="font-bold">&bull;</span>
                <span>{err}</span>
              </p>
            ))}
          </div>
        )}

        {/* Wizard controls footer */}
        <div className="flex justify-between items-center pt-6 border-t border-bento-sand">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center space-x-1.5 border-2 border-bento-sand hover:border-brand-400 text-stone-600 font-bold text-sm rounded-xl px-6 py-3 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Sebelumnya</span>
            </button>
          ) : (
            <div></div> // balance spacer
          )}

          {currentStep < 8 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center space-x-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl px-6 py-3 shadow-[--shadow-bento] transition-all cursor-pointer"
            >
              <span>Lanjutkan</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl px-6 py-3 shadow-[--shadow-bento] transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Mengirim Berkas Lamaran...</span>
                </>
              ) : (
                <>
                  <Send className="h-4.5 w-4.5" />
                  <span>Kirim Berkas Personal Sekarang</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
      </div>
    </div>
  );
};

// Simple visual spinner helper
const RefreshCw = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);
