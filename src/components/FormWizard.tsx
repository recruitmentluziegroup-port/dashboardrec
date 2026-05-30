import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Plus, Trash2, Calendar, FileText, Send, User } from 'lucide-react';
import { Applicant, Anak, Saudara, PendidikanFormal, Kursus, PengalamanKerja, ReferensiPerusahaan, Organisasi, ReferensiKontak } from '../types';

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
        if (Array.isArray(data) && data.length > 0) {
          setVacancies(data);
        }
      })
      .catch((err) => console.warn('Using static fallback for vacancies:', err));
  }, []);

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<Applicant>(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
      <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in font-sans" id="vacancy-portal">
        {/* Back to Home Button */}
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group flex items-center space-x-1.5 text-xs font-bold text-brand-100 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-white/15 hover:border-white/25 shadow-xs"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 transform group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>

        {/* Intro */}
        <div className="text-center space-y-3 max-w-2xl mx-auto py-4">
          <span className="text-[10px] font-black tracking-widest uppercase text-brand-200 bg-brand-700/60 rounded-full px-3.5 py-1.5 border border-brand-400 inline-block">Pintu Karir Luzie Group</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">Lowongan Pekerjaan Aktif</h1>
          <p className="text-xs text-brand-100 font-semibold leading-relaxed">
            Silakan telusuri formasi posisi aktif kami di bawah ini. Pilih salah satu posisi yang paling cocok dengan kompetensi Anda untuk langsung memulai pengisian berkas formulir lamaran.
          </p>
        </div>

        {/* Grid Vacancies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
          {vacancies.filter((v) => !v.archived).length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-12 bg-white/5 border border-white/10 rounded-2xl p-6 text-white font-semibold">
              Belum ada lowongan aktif yang terbuka saat ini.
            </div>
          ) : (
            vacancies.filter((v) => !v.archived).map((vac, idx) => {
              return (
                <div 
                  key={idx} 
                  className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between space-y-5 shadow-lg w-full transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-brand-600 bg-brand-50 border border-brand-150 px-2 py-0.5 rounded-md uppercase tracking-wide block w-fit">
                        {vac.category}
                      </span>
                      <h3 className="text-lg font-black text-stone-900 tracking-tight leading-snug">
                        {vac.title}
                      </h3>
                    </div>

                    <p className="text-xs text-stone-500 font-medium leading-relaxed">
                      {vac.description}
                    </p>

                    <div className="space-y-1.5 bg-stone-50 border border-stone-150 rounded-xl p-3 text-[11px] font-bold text-stone-600">
                      <div className="flex items-center space-x-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                        <span>Lokasi kerja: <strong className="text-stone-850 font-extrabold">{vac.location}</strong></span>
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
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
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
        <div className="bg-brand-900/40 rounded-2xl border border-brand-400 p-6 text-center max-w-xl mx-auto space-y-4 shadow-md">
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Ingin melamar posisi lainnya?</h4>
            <p className="text-[11px] text-brand-100 font-semibold leading-relaxed">Bila Anda memiliki tujuan posisi jabatan kustom selain pilihan di atas, Anda bisa mengetiknya secara bebas di dalam form.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedPosition('Lainnya');
              setForm(prev => ({ ...prev, jabatanDituju: '' })); // let applicant type manually
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-6 py-2.5 bg-white hover:bg-stone-55 text-brand-600 border border-stone-100 font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
          >
            <span>Ketik Jabatan Pilihan Secara Manual &rarr;</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xl relative" id="form-wizard-card">
      {/* Visual Form Head banner */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-amber-600 text-white p-6 relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 overflow-hidden rounded-t-2xl">
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
            <h2 className="text-xl font-black mt-0.5 tracking-tight font-sans">FORMULIR DATA PERSONAL</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedPosition(null);
            setForm(prev => ({ ...prev, jabatanDituju: '' }));
          }}
          className="self-start sm:self-center bg-white/10 hover:bg-white/25 text-white font-black text-xs px-4 py-2 rounded-xl border border-white/25 transition-all flex items-center space-x-1.5 cursor-pointer relative z-10 shadow-inner"
        >
          <span>&larr; Pilihan Lowongan</span>
        </button>

        {/* Dynamic percentage bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300" style={{ width: `${(currentStep / 8) * 100}%` }}></div>
      </div>

      {/* Position context bar */}
      <div className="bg-brand-50 border-b border-brand-100 px-6 py-2.5 flex items-center justify-between text-xs font-bold text-brand-800 select-none">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
          <span>
            Pilihan Formasi Jabatan: <strong className="text-brand-900 font-black uppercase">{selectedPosition === 'Lainnya' ? (form.jabatanDituju || 'Typed Manually') : selectedPosition}</strong>
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

      {/* Steps Navigation Header indicator buttons row */}
      <div className="border-b border-stone-100 px-6 py-4 flex items-center justify-between text-xs font-bold text-stone-600 overflow-x-auto gap-2 bg-stone-50">
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
            className={`flex items-center justify-center h-7 w-7 rounded-lg transition-all border ${
              currentStep === s
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                : s < currentStep
                ? 'bg-brand-100/70 text-brand-600 border-brand-200'
                : 'bg-white text-stone-400 border-stone-200 hover:border-stone-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        {/* Error notification window */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-state-error p-4 rounded-xl text-xs space-y-1">
            <span className="font-extrabold block uppercase mb-1">Mohon Lengkapi Kolom di Bawah:</span>
            {errors.map((err, idx) => (
              <p key={idx} className="flex items-start space-x-1.5 font-medium">
                <span className="font-bold">•</span>
                <span>{err}</span>
              </p>
            ))}
          </div>
        )}

        {/* STEP 1: IDENTITAS PRIBADI */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] text-brand-600 font-extrabold uppercase">Bagian 1 dari 8</span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1">Identitas Pribadi</h3>
              <p className="text-xs text-stone-500 mt-0.5">Silakan isi rincian diri sesuai kartu identitas KTP Anda yang sah.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
              <div className="space-y-1.5Col">
                <label className="block text-stone-700 font-bold">Nama Lengkap Sesuai KTP <span className="text-state-error">*</span></label>
                <input type="text" value={form.namaLengkap} onChange={(e) => setField('namaLengkap', e.target.value)} placeholder="Contoh: Luzie Hermawan" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Nomor KTP (ID Card / 16 Digit) <span className="text-state-error">*</span></label>
                <input type="text" maxLength={16} value={form.nomorKtp} onChange={(e) => setField('nomorKtp', e.target.value.replace(/\D/g, ''))} placeholder="Masukkan 16 angka nomor KTP" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Tempat Lahir <span className="text-state-error">*</span></label>
                <input type="text" value={form.tempatLahir} onChange={(e) => setField('tempatLahir', e.target.value)} placeholder="Kota tempat lahir" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Tanggal Lahir <span className="text-state-error">*</span></label>
                <input type="date" value={form.tanggalLahir} onChange={(e) => setField('tanggalLahir', e.target.value)} className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden cursor-pointer" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Kewarganegaraan</label>
                <input type="text" value={form.kewarganegaraan} onChange={(e) => setField('kewarganegaraan', e.target.value)} className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Agama</label>
                <select value={form.agama} onChange={(e) => setField('agama', e.target.value)} className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden cursor-pointer">
                  <option value="">Pilih Agama</option>
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen / Protestan</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Email Pribadi Aktif <span className="text-state-error">*</span></label>
                <input type="email" value={form.emailPribadi} onChange={(e) => setField('emailPribadi', e.target.value)} placeholder="name@domain.com" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Nomor HP / WhatsApp Aktif <span className="text-state-error">*</span></label>
                <input type="text" value={form.noTelp} onChange={(e) => setField('noTelp', e.target.value.replace(/[^0-9+]/g, ''))} placeholder="08xxxxxxxxxx" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Jenis Kelamin <span className="text-state-error">*</span></label>
                <div className="flex space-x-6 py-2">
                  <label className="flex items-center space-x-2 font-semibold cursor-pointer">
                    <input type="radio" checked={form.jenisKelamin === 'Laki-laki'} onChange={() => setField('jenisKelamin', 'Laki-laki')} className="accent-brand-500 h-4 w-4" />
                    <span>Laki-Laki</span>
                  </label>
                  <label className="flex items-center space-x-2 font-semibold cursor-pointer">
                    <input type="radio" checked={form.jenisKelamin === 'Perempuan'} onChange={() => setField('jenisKelamin', 'Perempuan')} className="accent-brand-500 h-4 w-4" />
                    <span>Perempuan</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Golongan Darah</label>
                <select value={form.golonganDarah} onChange={(e) => setField('golonganDarah', e.target.value)} className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden cursor-pointer">
                  <option value="">A / B / AB / O / Tidak Tahu</option>
                  <option value="A">Golongan A</option>
                  <option value="B">Golongan B</option>
                  <option value="AB">Golongan AB</option>
                  <option value="O">Golongan O</option>
                  <option value="Tidak Tahu">Tidak Tahu</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Status Pernikahan <span className="text-state-error">*</span></label>
                <select value={form.statusPernikahan} onChange={(e) => setField('statusPernikahan', e.target.value)} className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden cursor-pointer">
                  <option value="">Pilih Status</option>
                  <option value="Single">Single (Lajang)</option>
                  <option value="Tunangan">Tunangan / Bertunangan</option>
                  <option value="Menikah">Menikah</option>
                  <option value="Bercerai">Bercerai (Janda/Duda)</option>
                </select>
              </div>

              {form.statusPernikahan && form.statusPernikahan !== 'Single' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="block text-stone-700 font-bold">Tanggal Pernikahan/Status <span className="text-state-error">*</span></label>
                  <input type="date" value={form.tanggalStatusPernikahan} onChange={(e) => setField('tanggalStatusPernikahan', e.target.value)} className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden cursor-pointer" />
                </div>
              )}

              {/* SIM Ownership boxes */}
              <div className="md:col-span-2 space-y-3 p-4 bg-stone-50 border border-stone-200 rounded-xl mt-2">
                <span className="block text-stone-700 font-extrabold text-xs">Ijin Mengemudi (SIM yang Dimiliki)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 font-bold cursor-pointer">
                      <input type="checkbox" checked={form.simC} onChange={(e) => setField('simC', e.target.checked)} className="accent-brand-500 h-4 w-4" />
                      <span>Memiliki SIM C</span>
                    </label>
                    {form.simC && (
                      <input type="text" placeholder="Masukkan nomor SIM C" value={form.noSimC} onChange={(e) => setField('noSimC', e.target.value)} className="w-full bg-white border border-stone-250 p-2 rounded-lg text-xs" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 font-bold cursor-pointer">
                      <input type="checkbox" checked={form.simA} onChange={(e) => setField('simA', e.target.checked)} className="accent-brand-500 h-4 w-4" />
                      <span>Memiliki SIM A</span>
                    </label>
                    {form.simA && (
                      <input type="text" placeholder="Masukkan nomor SIM A" value={form.noSimA} onChange={(e) => setField('noSimA', e.target.value)} className="w-full bg-white border border-stone-250 p-2 rounded-lg text-xs" />
                    )}
                  </div>
                </div>
              </div>

              {/* Addresses section */}
              <div className="md:col-span-2 space-y-1.5 mt-2">
                <label className="block text-stone-700 font-bold">Alamat Tempat Tinggal Sekarang <span className="text-state-error">*</span></label>
                <textarea rows={3} value={form.alamatTinggal} onChange={(e) => setField('alamatTinggal', e.target.value)} placeholder="Tulis lengkap domisili tempat tinggal Anda saat ini..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-stone-700 font-bold">Alamat Sesuai KTP <span className="text-state-error">*</span></label>
                  <label className="flex items-center space-x-2 text-brand-600 font-extrabold cursor-pointer">
                    <input type="checkbox" checked={form.alamatKtpSama} onChange={(e) => setField('alamatKtpSama', e.target.checked)} className="accent-brand-500 h-4 w-4" />
                    <span>Sama dengan alamat domisili sekarang</span>
                  </label>
                </div>
                <textarea rows={3} disabled={form.alamatKtpSama} value={form.alamatKtp} onChange={(e) => setField('alamatKtp', e.target.value)} placeholder="Tulis alamat persis sesuai KTP Anda..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden disabled:opacity-60" />
              </div>

            </div>
          </div>
        )}

        {/* STEP 2: KELUARGA & LINGKUNGAN */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] text-brand-600 font-extrabold uppercase">Bagian 2 dari 8</span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1">Keluarga & Lingkungan</h3>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">Informasi data keluarga dan lingkungan sosial Anda.</p>
            </div>

            {/* IF MARRIED, SHOW SPOUSE/CHILDREN FIELDS */}
            {(form.statusPernikahan === 'Menikah' || form.statusPernikahan === 'Bercerai') && (
              <div className="space-y-5 p-5 bg-brand-50/50 border border-brand-200 rounded-xl">
                <span className="block text-brand-600 font-extrabold text-xs uppercase tracking-wide">Data Pasangan (Istri / Suami)</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="space-y-1.5">
                    <label className="block text-stone-700 font-bold">Nama Istri / Suami <span className="text-state-error">*</span></label>
                    <input type="text" value={form.namaPasangan} onChange={(e) => setField('namaPasangan', e.target.value)} placeholder="Nama lengkap pasangan" className="w-full bg-white border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-stone-700 font-bold">Tempat & Tgl. Lahir Pasangan <span className="text-state-error">*</span></label>
                    <input type="text" value={form.ttlPasangan} onChange={(e) => setField('ttlPasangan', e.target.value)} placeholder="Contoh: Purwokerto, 15 April 1995" className="w-full bg-white border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-stone-700 font-bold">Pendidikan Terakhir Pasangan</label>
                    <input type="text" value={form.pendidikanPasangan} onChange={(e) => setField('pendidikanPasangan', e.target.value)} placeholder="Contoh: S1 Akuntansi" className="w-full bg-white border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-stone-700 font-bold">Pekerjaan Pasangan <span className="text-state-error">*</span></label>
                    <input type="text" value={form.pekerjaanPasangan} onChange={(e) => setField('pekerjaanPasangan', e.target.value)} placeholder="Tuliskan profesi pasangan saat ini" className="w-full bg-white border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                  </div>
                </div>

                {/* Sub-Children rows additions */}
                <div className="space-y-3 pt-3 border-t border-brand-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-700 block">Daftar Anak-Anak (Maksimal 5)</span>
                    {form.anak.length < 5 && (
                      <button type="button" onClick={() => handleAddNested('anak', { nama: '', ttl: '', pendidikan: '' })} className="flex items-center space-x-1 border border-brand-200 text-brand-600 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-extrabold cursor-pointer">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Tambah Anak</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {form.anak.map((ch, idx) => (
                      <div key={idx} className="flex space-x-2 items-center text-xs">
                        <input type="text" placeholder="Nama Anak" value={ch.nama} onChange={(e) => handleEditNested('anak', idx, 'nama', e.target.value)} className="w-1/3 p-2 border border-stone-250 rounded-lg bg-white" />
                        <input type="text" placeholder="Tempat & Tgl Lahir" value={ch.ttl} onChange={(e) => handleEditNested('anak', idx, 'ttl', e.target.value)} className="w-1/3 p-2 border border-stone-250 rounded-lg bg-white" />
                        <input type="text" placeholder="Pendidikan" value={ch.pendidikan} onChange={(e) => handleEditNested('anak', idx, 'pendidikan', e.target.value)} className="w-1/3 p-2 border border-stone-250 rounded-lg bg-white" />
                        <button type="button" onClick={() => handleRemoveNested('anak', idx)} className="text-red-500 p-2 cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Parents detail */}
            <div className="space-y-4 p-5 bg-stone-50 border border-stone-200 rounded-xl">
              <span className="block text-stone-700 font-extrabold text-xs uppercase tracking-wide">Data Orang Tua / Wali</span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="block text-stone-700 font-bold">Nama Ayah / Ibu / Wali <span className="text-state-error">*</span></label>
                  <input type="text" value={form.namaOrtu} onChange={(e) => setField('namaOrtu', e.target.value)} placeholder="Cantumkan nama penanggung jawab / orut" className="w-full bg-white border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-stone-700 font-bold">Pekerjaan Orang Tua / Wali <span className="text-state-error">*</span></label>
                  <input type="text" value={form.pekerjaanOrtu} onChange={(e) => setField('pekerjaanOrtu', e.target.value)} placeholder="Tuliskan profesi pekerjaan orang tua" className="w-full bg-white border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-stone-700 font-bold">Alamat Lengkap Orang Tua <span className="text-state-error">*</span></label>
                  <textarea rows={2} value={form.alamatOrtu} onChange={(e) => setField('alamatOrtu', e.target.value)} placeholder="Tuliskan alamat tinggal orang tua saat ini..." className="w-full bg-white border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                </div>
              </div>
            </div>

            {/* SIBLINGS (Saudara Kandung) */}
            <div className="space-y-4 p-5 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="flex justify-between items-center text-xs">
                <span className="block text-stone-700 font-extrabold uppercase tracking-wide">Saudara Kandung (Maksimal 4)</span>
                {form.saudara.length < 4 && (
                  <button type="button" onClick={() => handleAddNested('saudara', { nama: '', kakakAdik: '', usia: '', pendidikanPekerjaan: '' })} className="flex items-center space-x-1 border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg font-extrabold cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Saudara</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {form.saudara.map((sd, idx) => (
                  <div key={idx} className="flex space-x-2 items-center text-xs">
                    <input type="text" placeholder="Nama Saudara" value={sd.nama} onChange={(e) => handleEditNested('saudara', idx, 'nama', e.target.value)} className="w-[35%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <select value={sd.kakakAdik} onChange={(e) => handleEditNested('saudara', idx, 'kakakAdik', e.target.value)} className="w-[20%] p-2 border border-stone-250 rounded-lg bg-white cursor-pointer">
                      <option value="">Status</option>
                      <option value="Kakak">Kakak</option>
                      <option value="Adik">Adik</option>
                    </select>
                    <input type="text" placeholder="Usia (th)" value={sd.usia} onChange={(e) => handleEditNested('saudara', idx, 'usia', e.target.value)} className="w-[15%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <input type="text" placeholder="Pendidikan / Pekerjaan" value={sd.pendidikanPekerjaan} onChange={(e) => handleEditNested('saudara', idx, 'pendidikanPekerjaan', e.target.value)} className="w-[30%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <button type="button" onClick={() => handleRemoveNested('saudara', idx)} className="text-red-500 p-2 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
          <div className="space-y-6">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] text-brand-600 font-extrabold uppercase">Bagian 3 dari 8</span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1">Riwayat Pendidikan & Pelatihan</h3>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">Cantumkan maksimal 2 riwayat pendidikan formal terakhir Anda (misalnya SMA/K dan Kuliah S1).</p>
            </div>

            <div className="space-y-4">
              <span className="block text-stone-700 font-extrabold text-xs uppercase tracking-wide">Pendidikan Formal <span className="text-state-error">*</span></span>

              <div className="space-y-3">
                {form.pendidikanFormal.map((pf, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 border border-stone-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-medium">
                    <div className="space-y-1.5">
                      <label className="block text-stone-600 font-bold">Periode Tahun <span className="text-state-error">*</span></label>
                      <div className="flex space-x-1">
                        <input type="text" placeholder="Dari" value={pf.dari} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'dari', e.target.value.replace(/\D/g, ''))} className="w-1/2 p-2 border border-stone-250 rounded-lg bg-white" />
                        <input type="text" placeholder="Sampai" value={pf.sampai} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'sampai', e.target.value.replace(/\D/g, ''))} className="w-1/2 p-2 border border-stone-250 rounded-lg bg-white" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-stone-600 font-bold">Nama Sekolah / Universitas <span className="text-state-error">*</span></label>
                      <input type="text" placeholder="Contoh: SMA Negeri 1 atau Universitas Jenderal Soedirman" value={pf.sekolah} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'sekolah', e.target.value)} className="w-full p-2 border border-stone-250 rounded-lg bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-stone-600 font-bold">Jurusan & Kota <span className="text-state-error">*</span></label>
                      <div className="flex space-x-1">
                        <input type="text" placeholder="Jurusan" value={pf.jurusan} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'jurusan', e.target.value)} className="w-1/2 p-2 border border-stone-250 rounded-lg bg-white" />
                        <input type="text" placeholder="Kota" value={pf.kota} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'kota', e.target.value)} className="w-1/2 p-2 border border-stone-250 rounded-lg bg-white" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-stone-600 font-bold">Kepemilikan Ijazah <span className="text-state-error">*</span></label>
                      <select value={pf.ijazah} onChange={(e) => handleEditNested('pendidikanFormal', idx, 'ijazah', e.target.value)} className="w-full p-2 border border-stone-250 rounded-lg bg-white cursor-pointer">
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

            {/* Courses / non-formal learning */}
            <div className="space-y-4 pt-4 border-t border-stone-150">
              <div className="flex justify-between items-center text-xs">
                <span className="block text-stone-700 font-extrabold uppercase tracking-wide">Pendidikan Non-Formal (Kursus / Pelatihan / Kursi)</span>
                {form.kursus.length < 5 && (
                  <button type="button" onClick={() => handleAddNested('kursus', { bidang: '', lamanya: '', tempat: '' })} className="flex items-center space-x-1 border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg font-extrabold cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Kursus</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {form.kursus.map((ks, idx) => (
                  <div key={idx} className="flex space-x-2 items-center text-xs">
                    <input type="text" placeholder="Bidang Kursus / Keahlian" value={ks.bidang} onChange={(e) => handleEditNested('kursus', idx, 'bidang', e.target.value)} className="w-[40%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <input type="text" placeholder="Lama Durasi (Contoh: 3 Bulan)" value={ks.lamanya} onChange={(e) => handleEditNested('kursus', idx, 'lamanya', e.target.value)} className="w-[25%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <input type="text" placeholder="Tempat Penyelenggara" value={ks.tempat} onChange={(e) => handleEditNested('kursus', idx, 'tempat', e.target.value)} className="w-[35%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <button type="button" onClick={() => handleRemoveNested('kursus', idx)} className="text-red-500 p-2 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
          <div className="space-y-6">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] text-brand-600 font-extrabold uppercase">Bagian 4 dari 8</span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1">Pengalaman Kerja & Referensi</h3>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">Cantumkan daftar pekerjaan yang pernah Anda geluti maksimal 6 riwayat terakhir.</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="block text-stone-700 font-extrabold uppercase tracking-wide">Riwayat Pengalaman Kerja sebelumnya</span>
                {form.pengalamanKerja.length < 6 && (
                  <button type="button" onClick={() => handleAddNested('pengalamanKerja', { perusahaan: '', dari: '', sampai: '', jabatan: '', gaji: '', alasanPindah: '' })} className="flex items-center space-x-1 border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg font-extrabold cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Pekerjaan</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {form.pengalamanKerja.map((pk, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 border border-stone-250 rounded-xl space-y-3 relative text-xs">
                    <button type="button" onClick={() => handleRemoveNested('pengalamanKerja', idx)} className="absolute right-3 top-3 text-red-500 p-1.5 rounded-lg cursor-pointer hover:bg-red-50" title="Hapus Riwayat ini">
                      <Trash2 className="h-4 w-4 animate-pulse" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-stone-600">Nama Perusahaan</label>
                        <input type="text" value={pk.perusahaan} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'perusahaan', e.target.value)} placeholder="Nama Kantor" className="w-full p-2 border border-stone-250 rounded-lg bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-stone-600">Periode Tahun (Dari - Sampai)</label>
                        <div className="flex space-x-1">
                          <input type="text" placeholder="Dari" value={pk.dari} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'dari', e.target.value)} className="w-1/2 p-2 border border-stone-250 rounded-lg bg-white" />
                          <input type="text" placeholder="Sampai" value={pk.sampai} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'sampai', e.target.value)} className="w-1/2 p-2 border border-stone-250 rounded-lg bg-white" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-stone-600">Jabatan / Posisi</label>
                        <input type="text" value={pk.jabatan} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'jabatan', e.target.value)} placeholder="Contoh: Staff Marketing" className="w-full p-2 border border-stone-250 rounded-lg bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-stone-600">Gaji Bulanan Terakhir (Rp)</label>
                        <input type="text" value={pk.gaji} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'gaji', e.target.value.replace(/\D/g, ''))} placeholder="Masukkan besaran angka gaji" className="w-full p-2 border border-stone-250 rounded-lg bg-white" />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="font-semibold text-stone-600">Alasan Pindah / Mengundurkan Diri</label>
                        <input type="text" value={pk.alasanPindah} onChange={(e) => handleEditNested('pengalamanKerja', idx, 'alasanPindah', e.target.value)} placeholder="Sebab berpindah tempat kerja" className="w-full p-2 border border-stone-250 rounded-lg bg-white" />
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
              <label className="block text-stone-700 font-bold">Uraian Ringkas Jobdesk Terakhir Serta Kendalanya <span className="text-state-error">{form.pengalamanKerja.length > 0 ? '*' : ''}</span></label>
              <textarea rows={3} value={form.jobdeskTerakhir} onChange={(e) => setField('jobdeskTerakhir', e.target.value)} placeholder="Jelaskan peran tugas nyata Anda di kantor terakhir beserta tantangan yang pernah dihadapi (Boleh kosong jika belum memilki pengalaman kerja)..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
            </div>

            {/* Former Boss references */}
            <div className="space-y-4 pt-4 border-t border-stone-150">
              <div className="flex justify-between items-center text-xs">
                <span className="block text-stone-700 font-extrabold uppercase tracking-wide">Referensi Atasan / Perusahaan Terkait (Maksimal 5)</span>
                {form.referensiPerusahaan.length < 5 && (
                  <button type="button" onClick={() => handleAddNested('referensiPerusahaan', { perusahaan: '', kontak: '', telp: '', hubungan: '' })} className="flex items-center space-x-1 border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg font-extrabold cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Referensi</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {form.referensiPerusahaan.map((rp, idx) => (
                  <div key={idx} className="flex space-x-2 items-center text-xs">
                    <input type="text" placeholder="Perusahaan" value={rp.perusahaan} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'perusahaan', e.target.value)} className="w-[30%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <input type="text" placeholder="Nama Atasan" value={rp.kontak} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'kontak', e.target.value)} className="w-[25%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <input type="text" placeholder="No HP Seluler" value={rp.telp} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'telp', e.target.value.replace(/[^0-9+]/g, ''))} className="w-[20%] p-2 border border-stone-250 rounded-lg bg-white font-mono" />
                    <input type="text" placeholder="Hubungan Kerja" value={rp.hubungan} onChange={(e) => handleEditNested('referensiPerusahaan', idx, 'hubungan', e.target.value)} className="w-[25%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <button type="button" onClick={() => handleRemoveNested('referensiPerusahaan', idx)} className="text-red-500 p-2 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
          <div className="space-y-6">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] text-brand-600 font-extrabold uppercase">Bagian 5 dari 8</span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1">Minat & Konsep Diri</h3>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">Lengkapi kuesioner pemahaman peran dan cita-cita hidup Anda.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-stone-700">1. Jabatan / Lowongan apa yang ingin Saudara tuju? <span className="text-state-error">*</span></label>
                {selectedPosition && selectedPosition !== 'Lainnya' ? (
                  <div className="relative">
                    <input 
                      type="text" 
                      value={form.jabatanDituju} 
                      readOnly
                      className="w-full bg-brand-50/50 border border-brand-200 text-brand-900 font-extrabold p-2.5 rounded-lg text-xs outline-hidden cursor-not-allowed" 
                    />
                    <span className="absolute right-2.5 top-2.5 bg-brand-100 text-brand-700 text-[9px] font-bold px-2 py-1 rounded-md uppercase">
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
                    className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs font-medium outline-hidden" 
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700">2. Mengapa Saudara ingin bekerja pada jabatan tersebut? <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.alasanJabatan} onChange={(e) => setField('alasanJabatan', e.target.value)} placeholder="Tuliskan motivasi dasar mengapa melamar posisi lowongan tersebut..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs font-medium outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700">3. Apa yang Saudara ketahui tentang jabatan tersebut? (tugas dan tanggung jawabnya) <span className="text-state-error">*</span></label>
                <textarea rows={3} value={form.pengetahuanJabatan} onChange={(e) => setField('pengetahuanJabatan', e.target.value)} placeholder="Urai pemahaman Anda mengenai tupoksi (tugas pokok dan fungsi) jabatan yang dituju..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs font-medium outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700">4. Lingkungan kerja apa yang Saudara senangi? Apa sebabnya? <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.lingkunganKerja} onChange={(e) => setField('lingkunganKerja', e.target.value)} placeholder="Sebutkan lingkungan kerja ternyaman Anda (misal: kolaboratif, senyap, rapi)..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs font-medium outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700">5. Apa cita-cita dalam hidup Anda? <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.citaCita} onChange={(e) => setField('citaCita', e.target.value)} placeholder="Tulis visi impian hidup Anda..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs font-medium outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700">6. Terhadap hal-hal apa saja Saudara paling sulit untuk mengambil keputusan? <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.kesulitanKeputusan} onChange={(e) => setField('kesulitanKeputusan', e.target.value)} placeholder="Tulis rincian kondisi yang membuat Anda goyah atau sulit memutuskan masalah..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs font-medium outline-hidden" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: AKTIFITAS SOSIAL & KEMASYARAKATAN */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] text-brand-600 font-extrabold uppercase">Bagian 6 dari 8</span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1">Aktifitas Sosial & Kemasyarakatan</h3>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">Informasi terkait minat talenta diri dan riwayat organisasi sosial kemasyarakatan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Hobby / Kegemaran <span className="text-state-error">*</span></label>
                <input type="text" value={form.hobby} onChange={(e) => setField('hobby', e.target.value)} placeholder="Kegemaran utama" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Cara Mengisi Waktu Luang <span className="text-state-error">*</span></label>
                <input type="text" value={form.waktuLuang} onChange={(e) => setField('waktuLuang', e.target.value)} placeholder="Contoh: Membaca, mengasah keahlian baru" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="md:col-span-2 space-y-3 p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <label className="block text-stone-700 font-extrabold text-xs">Apakah Saudara Pernah Keluar Negeri?</label>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 font-semibold cursor-pointer">
                    <input type="radio" checked={form.pernahKeLuarNegeri === 'Ya'} onChange={() => setField('pernahKeLuarNegeri', 'Ya')} className="accent-brand-500 h-4 w-4" />
                    <span>Ya</span>
                  </label>
                  <label className="flex items-center space-x-2 font-semibold cursor-pointer">
                    <input type="radio" checked={form.pernahKeLuarNegeri === 'Tidak'} onChange={() => setField('pernahKeLuarNegeri', 'Tidak')} className="accent-brand-500 h-4 w-4" />
                    <span>Tidak</span>
                  </label>
                </div>
                {form.pernahKeLuarNegeri === 'Ya' && (
                  <textarea rows={2} value={form.detailKunjunganLuarNegeri} onChange={(e) => setField('detailKunjunganLuarNegeri', e.target.value)} placeholder="Tuliskan: Kapan, berapa lama, dan dalam rangka keperluan apa?" className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-xs mt-2" />
                )}
              </div>

              <div className="md:col-span-2 space-y-1.5 pt-3">
                <label className="block text-stone-700 font-bold">Kekuatan Diri (Kelebihan / Bakat / Talenta) <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.kekuatanDiri} onChange={(e) => setField('kekuatanDiri', e.target.value)} placeholder="Sebutkan hal-hal positif, keterampilan, atau kepribadian tangguh penunjang karir Anda..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-stone-700 font-bold">Kelemahan Diri (Ruang Evaluasi evaluasi diri) <span className="text-state-error">*</span></label>
                <textarea rows={2.5} value={form.kelemahanDiri} onChange={(e) => setField('kelemahanDiri', e.target.value)} placeholder="Sebutkan kelemahan Anda secara obyektif beserta upaya menanggulanginya..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>
            </div>

            {/* Organizations list */}
            <div className="space-y-4 pt-4 border-t border-stone-150">
              <div className="flex justify-between items-center text-xs">
                <span className="block text-stone-700 font-extrabold uppercase tracking-wide">Organisasi yang Pernah Diikuti (Maksimal 5)</span>
                {form.organisasi.length < 5 && (
                  <button type="button" onClick={() => handleAddNested('organisasi', { nama: '', periode: '', jabatan: '', keterangan: '' })} className="flex items-center space-x-1 border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg font-extrabold cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Organisasi</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {form.organisasi.map((org, idx) => (
                  <div key={idx} className="flex space-x-2 items-center text-xs">
                    <input type="text" placeholder="Nama Organisasi" value={org.nama} onChange={(e) => handleEditNested('organisasi', idx, 'nama', e.target.value)} className="w-[35%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <input type="text" placeholder="Tahun / Periode" value={org.periode} onChange={(e) => handleEditNested('organisasi', idx, 'periode', e.target.value)} className="w-[20%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <input type="text" placeholder="Jabatan" value={org.jabatan} onChange={(e) => handleEditNested('organisasi', idx, 'jabatan', e.target.value)} className="w-[20%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <input type="text" placeholder="Keterangan / Tugas" value={org.keterangan} onChange={(e) => handleEditNested('organisasi', idx, 'keterangan', e.target.value)} className="w-[25%] p-2 border border-stone-250 rounded-lg bg-white" />
                    <button type="button" onClick={() => handleRemoveNested('organisasi', idx)} className="text-red-500 p-2 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
          <div className="space-y-6">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] text-brand-600 font-extrabold uppercase">Bagian 7 dari 8</span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1">Ekspektasi Karir & Kondisi Kesehatan</h3>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">Lengkapi harapan fasilitas serta asuransi kesehatan pribadi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Harapan Besaran Gaji yang Diinginkan (Rp / Bulan) <span className="text-state-error">*</span></label>
                <input type="text" value={form.gajiDiinginkan} onChange={(e) => setField('gajiDiinginkan', e.target.value.replace(/\D/g, ''))} placeholder="Contoh: 3500000" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Tanggal Dapat Mulai Bekerja <span className="text-state-error">*</span></label>
                <input type="text" value={form.dapatMulaiBekerja} onChange={(e) => setField('dapatMulaiBekerja', e.target.value)} placeholder="Contoh: Secepatnya / As soon as possible / 1 Juni 2026" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Fasilitas Penunjang yang Diharapkan</label>
                <textarea rows={2.5} value={form.fasilitasDiharapkan} onChange={(e) => setField('fasilitasDiharapkan', e.target.value)} placeholder="Misalnya: BPJS, Laptop Kantor..." className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-700 font-bold">Jenis Kendaraan Pribadi yang Dimiliki</label>
                <input type="text" value={form.kendaraanDimiliki} onChange={(e) => setField('kendaraanDimiliki', e.target.value)} placeholder="Contoh: Sepeda Motor / Mobil" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
              </div>

              {/* Health section */}
              <div className="md:col-span-2 space-y-4 border-t border-stone-150 pt-3">
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                  <label className="block text-stone-700 font-extrabold text-xs">Pernah Sakit Keras / Cedera Menahun?</label>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2 font-semibold cursor-pointer">
                      <input type="radio" checked={form.pernahSakitKeras === 'Ya'} onChange={() => setField('pernahSakitKeras', 'Ya')} className="accent-brand-500 h-4 w-4" />
                      <span>Ya</span>
                    </label>
                    <label className="flex items-center space-x-2 font-semibold cursor-pointer">
                      <input type="radio" checked={form.pernahSakitKeras === 'Tidak'} onChange={() => setField('pernahSakitKeras', 'Tidak')} className="accent-brand-500 h-4 w-4" />
                      <span>Tidak</span>
                    </label>
                  </div>
                  {form.pernahSakitKeras === 'Ya' && (
                    <textarea rows={2} value={form.detailSakitKeras} onChange={(e) => setField('detailSakitKeras', e.target.value)} placeholder="Tuliskan: Sakit apa, penanggulangan medis, dan masa rawat?" className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-xs mt-2" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-stone-700 font-bold">Gangguan Jasmani Tetap (Bila Ada)</label>
                  <input type="text" value={form.gangguanJasmani} onChange={(e) => setField('gangguanJasmani', e.target.value)} placeholder="Sebutkan hambatan fisik permanen (Boleh dikosongkan jika tidak ada)" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                  <label className="block text-stone-700 font-extrabold text-xs">Apakah Anggota Keluarga Sehat Baik-baik Saja?</label>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2 font-semibold cursor-pointer">
                      <input type="radio" checked={form.kesehatanKeluargaBaik === 'Ya'} onChange={() => setField('kesehatanKeluargaBaik', 'Ya')} className="accent-brand-500 h-4 w-4" />
                      <span>Ya (Sehat Semua)</span>
                    </label>
                    <label className="flex items-center space-x-2 font-semibold cursor-pointer">
                      <input type="radio" checked={form.kesehatanKeluargaBaik === 'Tidak'} onChange={() => setField('kesehatanKeluargaBaik', 'Tidak')} className="accent-brand-500 h-4 w-4" />
                      <span>Tidak</span>
                    </label>
                  </div>
                  {form.kesehatanKeluargaBaik === 'Tidak' && (
                    <textarea rows={2} value={form.detailKesehatanKeluarga} onChange={(e) => setField('detailKesehatanKeluarga', e.target.value)} placeholder="Uraikan siapa anggota keluarga sedarah terdekat Anda yang rentan cedera/sakit parah..." className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-xs mt-2" />
                  )}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-stone-700 font-bold">Alamat Akun Media Sosial Aktif (Instagram / LinkedIn / TikTok / Berkas)</label>
                  <input type="text" value={form.alamatMediaSosial} onChange={(e) => setField('alamatMediaSosial', e.target.value)} placeholder="Sebutkan link tautan akun sosmed Anda (IG: @luzie, LinkedIn: Luzie, dsb)" className="w-full bg-stone-50 border border-stone-250 focus:border-brand-500 p-2.5 rounded-lg text-xs outline-hidden" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: REFERENSI DARURAT (WAJIB MINIMAL 1) */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] text-brand-600 font-extrabold uppercase">Bagian 8 dari 8</span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1">Referensi Darurat & Pengesahan</h3>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">Sesuai standar operasional, Anda wajib mencantumkan minimal 1 nomor HP keluarga/kerabat dekat (Maksimal 3).</p>
            </div>

            <div className="space-y-4">
              <span className="block text-stone-700 font-extrabold text-xs uppercase tracking-wide">Nomor Kontak Kerabat Dekat Terkait (Minimal 1) <span className="text-state-error">*</span></span>

              <div className="space-y-3">
                {form.referensiKontak.map((co, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 border border-stone-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-semibold">
                    <div className="space-y-1.5">
                      <label className="block text-stone-600">
                        Nama Lengkap Kerabat {idx + 1} {idx === 0 ? <span className="text-state-error">*</span> : <span className="text-stone-400 font-normal">(Opsional)</span>}
                      </label>
                      <input type="text" placeholder="Masukkan nama terang" value={co.nama} onChange={(e) => handleEditNested('referensiKontak', idx, 'nama', e.target.value)} className="w-full p-2 border border-stone-250 rounded-lg bg-white text-xs font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-stone-600">
                        Hubungan / Kekerabatan {idx === 0 ? <span className="text-state-error">*</span> : <span className="text-stone-400 font-normal">(Opsional)</span>}
                      </label>
                      <input type="text" placeholder="Contoh: Kakak Kandung, Ibu, Teman Akrab" value={co.hubungan} onChange={(e) => handleEditNested('referensiKontak', idx, 'hubungan', e.target.value)} className="w-full p-2 border border-stone-250 rounded-lg bg-white text-xs font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-stone-600">
                        Nomor Telepon Seluler HP {idx === 0 ? <span className="text-state-error">*</span> : <span className="text-stone-400 font-normal">(Opsional)</span>}
                      </label>
                      <input type="text" placeholder="08xxxxxxxx" value={co.telp} onChange={(e) => handleEditNested('referensiKontak', idx, 'telp', e.target.value.replace(/[^0-9+]/g, ''))} className="w-full p-2 border border-stone-250 rounded-lg bg-white text-xs font-mono font-medium" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authoritative Sign-off name */}
            <div className="space-y-5 p-5 bg-brand-50/40 border border-brand-200 rounded-xl mt-6">
              <span className="block text-brand-700 font-extrabold text-xs uppercase tracking-wider">E-LEGALITAS PERNYATAAN DATA PERSONAL</span>
              <p className="text-[11px] text-stone-600 leading-relaxed font-semibold">
                Dengan saksama membubuhkan tanda pengenal di bawah, saya bersumpah bahwa seluruh butir uraian informasi lamaran kerja ini adalah jujur, akurat dan sah. Apabila di kemudian hari ditemukan kecurangan/palsu, saya bersedia diberhentikan sepihak tanpa syarat.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="block text-stone-700 font-bold">Tempat & Tanggal Pengesahan <span className="text-state-error">*</span></label>
                  <input type="text" value={form.kotaTgl} onChange={(e) => setField('kotaTgl', e.target.value)} placeholder="Contoh: Purwokerto, 29 Mei 2026" className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-stone-700 font-bold">Nama Terang Penandatangan <span className="text-state-error">*</span></label>
                  <input type="text" value={form.namaTerang} onChange={(e) => setField('namaTerang', e.target.value)} placeholder="Ketik nama lengkap Anda sebagai pengganti tanda tangan" className="w-full bg-white border border-stone-250 p-2.5 rounded-lg text-xs" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error notification window at the bottom */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-state-error p-4 rounded-xl text-xs space-y-1">
            <span className="font-extrabold block uppercase mb-1">Mohon Lengkapi Kolom di Bawah:</span>
            {errors.map((err, idx) => (
              <p key={idx} className="flex items-start space-x-1.5 font-medium">
                <span className="font-bold">•</span>
                <span>{err}</span>
              </p>
            ))}
          </div>
        )}

        {/* Wizard controls footer */}
        <div className="pt-6 border-t border-stone-100 flex justify-between items-center text-xs font-bold">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center space-x-1.5 text-stone-500 hover:text-stone-850 hover:bg-stone-100 border border-stone-200 bg-white rounded-xl px-4 py-3/5 transition-all cursor-pointer"
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
              className="flex items-center space-x-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-5 py-3/5 transition-all cursor-pointer shadow-md"
            >
              <span>Lanjutkan</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 py-3.5 transition-all cursor-pointer shadow-lg font-black text-sm"
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
