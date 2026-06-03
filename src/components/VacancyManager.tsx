import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Save, RefreshCw, Layers, MapPin, DollarSign, ListChecks, Check, X } from 'lucide-react';

interface Vacancy {
  title: string;
  category: string;
  location: string;
  salary: string;
  description: string;
  requirements: string[];
  archived?: boolean;
}

interface VacancyManagerProps {
  vacancies: Vacancy[];
  onSave: (updatedVacancies: Vacancy[]) => Promise<void>;
  loading: boolean;
  successMessage: string | null;
  errorMessage: string | null;
  onRefresh: () => void;
}

export const VacancyManager: React.FC<VacancyManagerProps> = ({
  vacancies,
  onSave,
  loading,
  successMessage,
  errorMessage,
  onRefresh
}) => {
  const [localVacancies, setLocalVacancies] = useState<Vacancy[]>([]);
  const [isEditingList, setIsEditingList] = useState(false);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  // Sync with prop when edit mode is first clicked
  const startEditing = () => {
    setLocalVacancies(JSON.parse(JSON.stringify(vacancies)));
    setIsEditingList(true);
    if (vacancies.length > 0) {
      setActiveTab(0);
    } else {
      setActiveTab(null);
    }
  };

  const cancelEditing = () => {
    setIsEditingList(false);
    setActiveTab(null);
  };

  const handleFieldChange = (index: number, field: keyof Vacancy, value: any) => {
    const updated = [...localVacancies];
    updated[index] = { ...updated[index], [field]: value };
    setLocalVacancies(updated);
  };

  const handleRequirementsChange = (index: number, requirementsText: string) => {
    const updated = [...localVacancies];
    updated[index] = { ...updated[index], requirements: requirementsText.split('\n') };
    setLocalVacancies(updated);
  };

  const addVacancy = () => {
    const newVac: Vacancy = {
      title: 'Posisi Baru',
      category: 'Pilih Kategori',
      location: 'Kota / Hub kerja',
      salary: 'Rentang Gaji',
      description: 'Deskripsi pekerjaan singkat di sini...',
      requirements: ['Persyaratan Utama 1']
    };
    const updated = [...localVacancies, newVac];
    setLocalVacancies(updated);
    setActiveTab(updated.length - 1);
  };

  const deleteVacancy = (index: number) => {
    const updated = localVacancies.filter((_, i) => i !== index);
    setLocalVacancies(updated);
    if (updated.length > 0) {
      setActiveTab(Math.max(0, index - 1));
    } else {
      setActiveTab(null);
    }
  };

  const handleSave = async () => {
    const invalid = localVacancies.some(v => !v.title.trim());
    if (invalid) {
      alert('Nama Posisi / Jabatan tidak boleh kosong.');
      return;
    }
    const cleaned = localVacancies.map(v => ({
      ...v,
      requirements: v.requirements.map(r => r.trim()).filter(r => r.length > 0)
    }));
    await onSave(cleaned);
    setIsEditingList(false);
  };

  // If not editing, display read-only view
  const displayList = isEditingList ? localVacancies : vacancies;
  const selectedIdx = activeTab !== null ? activeTab : (displayList.length > 0 ? 0 : null);
  const selectedVacancy = selectedIdx !== null ? displayList[selectedIdx] : null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden font-sans" id="vacancy-manager-card">
      {/* Top action header info */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-brand-950 px-6 py-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 select-none relative overflow-hidden rounded-t-2xl">
        {/* Abstract design elements underlay */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none select-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="admin-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#admin-grid)" />
          </svg>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/25 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-indigo-500/25 rounded-full blur-2xl pointer-events-none"></div>

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/40">
              <Briefcase className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-black tracking-tight leading-none text-white">Kelola Lowongan Aktif</h2>
          </div>
          <p className="text-xs text-indigo-100 font-medium">
            Atur dan rombak formasi jabatan pendaftaran yang sedang dibuka saat ini untuk masuk langsung ke sistem portal pelamar.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-2.5 bg-indigo-800/50 hover:bg-indigo-700/55 text-indigo-100 rounded-xl transition-all border border-indigo-700/40 cursor-pointer"
            title="Refresh Data"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {!isEditingList ? (
            <button
               onClick={startEditing}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Edit Formasi Lowongan</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={cancelEditing}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Terapkan Perubahan</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3.5 text-xs text-emerald-800 font-bold flex items-center space-x-2 animate-pulse">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-3.5 text-xs text-rose-800 font-bold flex items-center space-x-2">
          <X className="h-4 w-4 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {displayList.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <div className="h-16 w-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto border border-stone-200">
            <Briefcase className="h-8 w-8 text-stone-400" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="font-extrabold text-stone-900">Belum Ada Lowongan Terdaftar</h3>
            <p className="text-xs text-stone-500 leading-relaxed font-semibold">Toko formasi masih bersih. Klik tombol di bawah pimpinan untuk membuat list formasi lowongan aktif yang pertama.</p>
          </div>
          {isEditingList && (
            <button
              onClick={addVacancy}
              className="px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 font-extrabold text-xs rounded-xl shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Lowongan Perdana</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-stone-100">
          {/* Left Navigation Sidepanel */}
          <div className="lg:col-span-4 border-r border-stone-100 bg-stone-50/50 p-4 space-y-3 max-h-[550px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest block">Daftar Lowongan ({displayList.length})</span>
              {isEditingList && (
                <button
                  onClick={addVacancy}
                  className="p-1 hover:bg-stone-200 rounded text-brand-600 font-bold text-[10px] flex items-center space-x-0.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Tambah</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {displayList.map((vac, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left flex items-start justify-between space-x-3 ${
                    selectedIdx === idx
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-xs ring-1 ring-indigo-100'
                      : 'bg-white hover:bg-stone-100 border-stone-150 text-stone-700'
                  }`}
                >
                  <div className="space-y-1 truncate flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-black truncate leading-tight block">{vac.title || '(Tanpa Nama)'}</span>
                      {vac.archived && (
                        <span className="shrink-0 text-[8px] bg-amber-100 text-amber-800 border border-amber-200 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">Arsip</span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-stone-400 block truncate">{vac.category || 'Belum diisi'}</span>
                  </div>
                  {isEditingList && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Ask confirmation manually as it is destructive
                        if (confirm(`Anda yakin ingin menghapus formasi lowongan "${vac.title || 'ini'}"?`)) {
                          deleteVacancy(idx);
                        }
                      }}
                      className="p-1 bg-stone-50 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Hapus Lowongan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Detail / Edit Panel */}
          <div className="lg:col-span-8 p-6 space-y-6">
            {selectedVacancy ? (
              <div className="space-y-5">
                <div className="border-b border-stone-100 pb-4">
                  <span className="text-[10px] font-black text-brand-700 bg-brand-50 rounded-md px-2.5 py-1 uppercase tracking-wide inline-block mb-2">
                    Evaluasi & Atur Kriteria Detail
                  </span>
                  
                  {isEditingList ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Jabatan Posisi</label>
                          <input
                            type="text"
                            value={selectedVacancy.title}
                            onChange={(e) => handleFieldChange(selectedIdx!, 'title', e.target.value)}
                            className="w-full bg-stone-50 border border-stone-250 focus:border-indigo-500 rounded-xl p-2.5 text-xs font-extrabold outline-hidden shadow-xs"
                            placeholder="Contoh: Senior Full Stack Developer"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Kategori</label>
                          <input
                            type="text"
                            value={selectedVacancy.category}
                            onChange={(e) => handleFieldChange(selectedIdx!, 'category', e.target.value)}
                            className="w-full bg-stone-50 border border-stone-250 focus:border-indigo-500 rounded-xl p-2.5 text-xs font-bold outline-hidden shadow-xs"
                            placeholder="Contoh: IT / Engineering"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-relaxed">
                      {selectedVacancy.title}
                    </h3>
                  )}

                  {/* Status & Archival Control Panel */}
                  <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                    <div className="flex items-center space-x-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${selectedVacancy.archived ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                      <div>
                        <p className="text-xs font-black text-stone-900">
                          Status: {selectedVacancy.archived ? 'Diarsipkan' : 'Aktif / Terbuka'}
                        </p>
                        <p className="text-[10px] text-stone-500 font-semibold leading-normal">
                          {selectedVacancy.archived 
                            ? 'Posisinya disembunyikan dari daftar lowongan dan portal lamaran.' 
                            : 'Posisinya tampil di portal agar pelamar dapat mendaftar langsung.'}
                        </p>
                      </div>
                    </div>
                    {isEditingList ? (
                      <button
                        type="button"
                        onClick={() => handleFieldChange(selectedIdx!, 'archived', !selectedVacancy.archived)}
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
                          selectedVacancy.archived 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' 
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
                        }`}
                      >
                        {selectedVacancy.archived ? 'Buka Lowongan ini' : 'Arsipkan Lowongan ini'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="text-stone-400 bg-stone-100 border border-stone-200 text-xs font-semibold px-3.5 py-1.5 rounded-lg cursor-not-allowed opacity-75 animate-fade-in"
                        title="Klik 'Edit Formasi Lowongan' di atas terlebih dahulu untuk mengubah status arsip"
                      >
                        {selectedVacancy.archived ? 'Buka Lowongan ini' : 'Arsipkan Lowongan ini'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid criteria parameters */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Location field */}
                  <div className="bg-stone-50 border border-stone-150 rounded-xl p-3.5 flex items-start space-x-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">Penempatan Kerja</span>
                      {isEditingList ? (
                        <input
                          type="text"
                          value={selectedVacancy.location}
                          onChange={(e) => handleFieldChange(selectedIdx!, 'location', e.target.value)}
                          className="w-full bg-white border border-stone-200 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs font-bold outline-hidden"
                          placeholder="Solo / Remote"
                        />
                      ) : (
                        <span className="text-xs font-bold text-stone-800 block">{selectedVacancy.location || 'Not Configured'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Description row */}
                <div className="bg-stone-50 border border-stone-150 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-stone-400">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Deskripsi Formasi Jabatan / Tugas Pokok</span>
                  </div>
                  {isEditingList ? (
                    <textarea
                      rows={3}
                      value={selectedVacancy.description}
                      onChange={(e) => handleFieldChange(selectedIdx!, 'description', e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs font-medium outline-hidden"
                      placeholder="Masukkan deskripsi penawaran / tugas ringkas untuk posisi..."
                    />
                  ) : (
                    <p className="text-xs text-stone-605 font-semibold leading-relaxed whitespace-pre-line text-left">
                      {selectedVacancy.description || 'Tidak ada deskripsi rinci untuk jabatan ini.'}
                    </p>
                  )}
                </div>

                {/* Primary Qualifications bullet lists mapping */}
                <div className="bg-stone-50 border border-stone-150 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-150 pb-2">
                    <div className="flex items-center space-x-2 text-stone-400">
                      <ListChecks className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Kualifikasi & Persyaratan Khusus</span>
                    </div>
                    {isEditingList && (
                      <span className="text-[9px] text-[#4F46E5] font-black">Satu kualifikasi per baris</span>
                    )}
                  </div>

                  {isEditingList ? (
                    <textarea
                      rows={5}
                      value={selectedVacancy.requirements.join('\n')}
                      onChange={(e) => handleRequirementsChange(selectedIdx!, e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs font-mono outline-hidden"
                      placeholder="Satu baris berisi satu poin persyaratan kualifikasi..."
                    />
                  ) : (
                    <ul className="space-y-2 text-left text-xs text-stone-600 font-semibold list-disc pl-4.5 leading-relaxed">
                      {selectedVacancy.requirements && selectedVacancy.requirements.filter(r => r.trim()).length > 0 ? (
                        selectedVacancy.requirements.filter(r => r.trim()).map((req, rIdx) => (
                          <li key={rIdx}>{req}</li>
                        ))
                      ) : (
                        <p className="text-stone-400 font-medium">Bebas kualifikasi khusus.</p>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-stone-400 font-medium">
                Pilih lowongan di panel kiri untuk melihat kriteria selengkapnya.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
