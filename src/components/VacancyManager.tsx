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
    // Split by new line, remove empty lines
    const reqList = requirementsText
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);
    updated[index] = { ...updated[index], requirements: reqList };
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
    // Validate
    const invalid = localVacancies.some(v => !v.title.trim());
    if (invalid) {
      alert('Nama Posisi / Jabatan tidak boleh kosong.');
      return;
    }
    await onSave(localVacancies);
    setIsEditingList(false);
  };

  // If not editing, display read-only view
  const displayList = isEditingList ? localVacancies : vacancies;
  const selectedIdx = activeTab !== null ? activeTab : (displayList.length > 0 ? 0 : null);
  const selectedVacancy = selectedIdx !== null ? displayList[selectedIdx] : null;

  return (
    <div className="bg-white rounded-[--radius-editorial] border border-editorial-border overflow-hidden font-sans" id="vacancy-manager-card">
      {/* Top action header info */}
      <div className="bg-editorial-navy px-6 py-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 select-none relative">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-brand-500/20 text-brand-300 rounded-[--radius-editorial]">
              <Briefcase className="h-5 w-5" />
            </span>
            <h2 className="font-serif font-black text-xl tracking-tight leading-none text-white">Kelola Lowongan Aktif</h2>
          </div>
          <p className="text-xs text-stone-400 font-medium">
            Atur dan rombak formasi jabatan pendaftaran yang sedang dibuka saat ini.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-stone-300 rounded-[--radius-editorial] transition-all cursor-pointer"
            title="Refresh Data"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {!isEditingList ? (
            <button
               onClick={startEditing}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-[--radius-editorial] transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Edit Formasi Lowongan</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={cancelEditing}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-[--radius-editorial] transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2.5 bg-editorial-green hover:bg-green-800 text-white font-bold text-xs rounded-[--radius-editorial] transition-all cursor-pointer flex items-center space-x-1.5"
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
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3.5 text-xs text-editorial-green font-bold flex items-center space-x-2">
          <Check className="h-4 w-4 text-editorial-green" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3.5 text-xs text-state-error font-bold flex items-center space-x-2">
          <X className="h-4 w-4 text-state-error" />
          <span>{errorMessage}</span>
        </div>
      )}

      {displayList.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <div className="h-16 w-16 bg-editorial-cream rounded-[--radius-editorial] flex items-center justify-center mx-auto border border-editorial-border">
            <Briefcase className="h-8 w-8 text-stone-400" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="font-bold text-editorial-navy">Belum Ada Lowongan Terdaftar</h3>
            <p className="text-xs text-stone-500 leading-relaxed font-medium">Belum ada formasi lowongan yang dibuat. Klik tombol di bawah untuk menambahkan lowongan pertama.</p>
          </div>
          {isEditingList && (
            <button
              onClick={addVacancy}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-[--radius-editorial] transition-all inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Lowongan Perdana</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-editorial-border">
          {/* Left Navigation Sidepanel */}
          <div className="lg:col-span-4 border-r border-editorial-border bg-editorial-cream/30 p-4 space-y-3 max-h-[550px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Daftar Lowongan ({displayList.length})</span>
              {isEditingList && (
                <button
                  onClick={addVacancy}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors flex items-center space-x-0.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {displayList.map((vac, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`p-3 rounded-[--radius-editorial] border transition-all cursor-pointer text-left flex items-start justify-between space-x-3 ${
                    selectedIdx === idx
                      ? 'bg-white border-brand-500 shadow-[--shadow-editorial]'
                      : 'bg-white hover:bg-editorial-cream border-editorial-border text-stone-700'
                  }`}
                >
                  <div className="space-y-1 truncate flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold truncate leading-tight block text-editorial-charcoal">{vac.title || '(Tanpa Nama)'}</span>
                      {vac.archived && (
                        <span className="shrink-0 text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Arsip</span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-stone-400 block truncate">{vac.category || 'Belum diisi'}</span>
                  </div>
                  {isEditingList && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Anda yakin ingin menghapus formasi lowongan "${vac.title || 'ini'}"?`)) {
                          deleteVacancy(idx);
                        }
                      }}
                      className="p-1 text-stone-400 hover:text-state-error transition-colors cursor-pointer"
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
                <div className="border-b border-editorial-border pb-4">
                  <span className="text-[10px] font-bold text-brand-600 bg-brand-50 rounded-[--radius-editorial] px-2.5 py-1 uppercase tracking-wide inline-block mb-2">
                    Evaluasi & Atur Kriteria Detail
                  </span>
                  
                  {isEditingList ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Jabatan Posisi</label>
                          <input
                            type="text"
                            value={selectedVacancy.title}
                            onChange={(e) => handleFieldChange(selectedIdx!, 'title', e.target.value)}
                            className="w-full bg-editorial-cream border border-editorial-border focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-[--radius-editorial] p-2.5 text-xs font-bold outline-hidden transition-all duration-200"
                            placeholder="Contoh: Senior Full Stack Developer"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Kategori</label>
                          <input
                            type="text"
                            value={selectedVacancy.category}
                            onChange={(e) => handleFieldChange(selectedIdx!, 'category', e.target.value)}
                            className="w-full bg-editorial-cream border border-editorial-border focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-[--radius-editorial] p-2.5 text-xs font-bold outline-hidden transition-all duration-200"
                            placeholder="Contoh: IT / Engineering"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <h3 className="font-serif font-bold text-2xl tracking-tight text-editorial-navy">
                      {selectedVacancy.title}
                    </h3>
                  )}

                  {/* Status & Archival Control Panel */}
                  <div className="mt-4 p-4 bg-editorial-cream border border-editorial-border rounded-[--radius-editorial] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                    <div className="flex items-center space-x-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${selectedVacancy.archived ? 'bg-state-warning' : 'bg-editorial-green'}`}></span>
                      <div>
                        <p className="text-xs font-bold text-editorial-charcoal">
                          Status: {selectedVacancy.archived ? 'Diarsipkan' : 'Aktif / Terbuka'}
                        </p>
                        <p className="text-[10px] text-stone-500 leading-normal">
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
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-[--radius-editorial] transition-all cursor-pointer ${
                          selectedVacancy.archived 
                            ? 'bg-editorial-green hover:bg-green-700 text-white' 
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        }`}
                      >
                        {selectedVacancy.archived ? 'Buka Lowongan ini' : 'Arsipkan Lowongan ini'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="text-stone-400 bg-stone-100 border border-editorial-border text-xs font-semibold px-3.5 py-1.5 rounded-[--radius-editorial] cursor-not-allowed"
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
                  <div className="bg-editorial-cream border border-editorial-border rounded-[--radius-editorial] p-4 flex items-start space-x-3">
                    <div className="p-2 bg-brand-50 text-brand-600 rounded-[--radius-editorial]">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">Penempatan Kerja</span>
                      {isEditingList ? (
                        <input
                          type="text"
                          value={selectedVacancy.location}
                          onChange={(e) => handleFieldChange(selectedIdx!, 'location', e.target.value)}
                          className="w-full bg-white border border-editorial-border focus:border-brand-400 rounded-[--radius-editorial] px-2 py-1.5 text-xs font-bold outline-hidden"
                          placeholder="Solo / Remote"
                        />
                      ) : (
                        <span className="text-xs font-bold text-editorial-charcoal block">{selectedVacancy.location || 'Not Configured'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Description row */}
                <div className="bg-editorial-cream border border-editorial-border rounded-[--radius-editorial] p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-stone-400">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Deskripsi Formasi Jabatan / Tugas Pokok</span>
                  </div>
                  {isEditingList ? (
                    <textarea
                      rows={3}
                      value={selectedVacancy.description}
                      onChange={(e) => handleFieldChange(selectedIdx!, 'description', e.target.value)}
                      className="w-full bg-white border border-editorial-border focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-[--radius-editorial] p-2.5 text-xs font-medium outline-hidden transition-all duration-200"
                      placeholder="Masukkan deskripsi penawaran / tugas ringkas untuk posisi..."
                    />
                  ) : (
                    <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line text-left">
                      {selectedVacancy.description || 'Tidak ada deskripsi rinci untuk jabatan ini.'}
                    </p>
                  )}
                </div>

                {/* Primary Qualifications bullet lists mapping */}
                <div className="bg-editorial-cream border border-editorial-border rounded-[--radius-editorial] p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center space-x-2 text-stone-400">
                      <ListChecks className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Kualifikasi & Persyaratan Khusus</span>
                    </div>
                    {isEditingList && (
                      <span className="text-[9px] text-stone-400 font-bold">Satu kualifikasi per baris</span>
                    )}
                  </div>

                  {isEditingList ? (
                    <textarea
                      rows={5}
                      value={selectedVacancy.requirements.join('\n')}
                      onChange={(e) => handleRequirementsChange(selectedIdx!, e.target.value)}
                      className="w-full bg-white border border-editorial-border focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-[--radius-editorial] p-2.5 text-xs font-mono outline-hidden transition-all duration-200"
                      placeholder="Satu baris berisi satu poin persyaratan kualifikasi..."
                    />
                  ) : (
                    <ul className="space-y-2 text-left text-xs text-stone-600 list-disc pl-4 leading-relaxed">
                      {selectedVacancy.requirements && selectedVacancy.requirements.length > 0 ? (
                        selectedVacancy.requirements.map((req, rIdx) => (
                          <li key={rIdx} className="font-medium">{req}</li>
                        ))
                      ) : (
                        <p className="text-stone-400">Bebas kualifikasi khusus.</p>
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
