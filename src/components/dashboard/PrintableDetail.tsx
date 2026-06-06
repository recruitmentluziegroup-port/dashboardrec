import React from 'react';
import { Applicant, Anak, PendidikanFormal, Kursus, PengalamanKerja, ReferensiPerusahaan, Organisasi, ReferensiKontak } from '../../types';

interface PrintableDetailProps {
  applicant: Applicant;
}

function formatDate(s: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  try {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch {
    return d.toDateString();
  }
}

function formatDateTime(s: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  try {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(d);
  } catch {
    return d.toString();
  }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <div className="text-[8pt] font-bold text-stone-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[10pt] text-stone-900 leading-snug">{value || '-'}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid mb-6">
      <h2 className="font-serif font-black text-base text-stone-900 border-b border-stone-300 pb-1.5 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) {
    return <p className="text-[9pt] text-stone-500 italic">Tidak ada data.</p>;
  }
  return (
    <table className="w-full border-collapse text-[9pt] mb-3">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              className="text-left text-stone-600 font-bold border-b border-stone-300 pb-1 px-2 first:pl-0 last:pr-0"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-stone-100 last:border-b-0">
            {row.map((cell, j) => (
              <td
                key={j}
                className="py-1.5 px-2 first:pl-0 last:pr-0 text-stone-800 align-top"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const PrintableDetail: React.FC<PrintableDetailProps> = ({ applicant }) => {
  const a = applicant;

  const simSummary = [
    a.simC ? `SIM C (${a.noSimC || '-'})` : null,
    a.simA ? `SIM A (${a.noSimA || '-'})` : null,
  ].filter(Boolean).join(', ') || '-';

  const isMarriedOrDivorced = a.statusPernikahan === 'Menikah' || a.statusPernikahan === 'Bercerai';

  const anakRows: React.ReactNode[][] = (a.anak || []).map((row: Anak) => [
    row.nama, row.ttl, row.pendidikan,
  ]);
  const pendidikanRows: React.ReactNode[][] = (a.pendidikanFormal || []).map((row: PendidikanFormal) => [
    `${row.dari}–${row.sampai}`, row.sekolah, row.jurusan, row.kota, row.ijazah || '-',
  ]);
  const kursusRows: React.ReactNode[][] = (a.kursus || []).map((row: Kursus) => [
    row.bidang, row.lamanya, row.tempat,
  ]);
  const pengalamanRows: React.ReactNode[][] = (a.pengalamanKerja || []).map((row: PengalamanKerja) => [
    row.perusahaan, `${row.dari}–${row.sampai}`, row.jabatan, row.gaji ? `Rp ${row.gaji}` : '-', row.alasanPindah,
  ]);
  const referensiPerusahaanRows: React.ReactNode[][] = (a.referensiPerusahaan || []).map((row: ReferensiPerusahaan) => [
    row.perusahaan, row.kontak, row.telp, row.hubungan,
  ]);
  const organisasiRows: React.ReactNode[][] = (a.organisasi || []).map((row: Organisasi) => [
    row.nama, row.periode, row.jabatan, row.keterangan,
  ]);
  const referensiKontakRows: React.ReactNode[][] = (a.referensiKontak || []).map((row: ReferensiKontak) => [
    row.nama, row.hubungan, row.telp,
  ]);

  return (
    <div className="printable-detail bg-white p-8 max-w-3xl mx-auto text-stone-900 font-sans">
      <header className="border-b-2 border-stone-900 pb-4 mb-6 flex items-end justify-between">
        <div>
          <p className="text-[8pt] font-bold uppercase tracking-[0.2em] text-stone-500">Luzie Group Recruitment</p>
          <h1 className="font-serif font-black text-2xl mt-1 leading-tight">Data Personal Pelamar</h1>
          <p className="text-[9pt] text-stone-600 mt-1">Dokumen ini dicetak untuk tinjauan internal rekrutmen.</p>
        </div>
        <div className="text-right text-[8pt] text-stone-500 leading-snug">
          <div><span className="font-bold text-stone-700">ID:</span> {a.id}</div>
          <div><span className="font-bold text-stone-700">Status:</span> {a.status}</div>
          <div><span className="font-bold text-stone-700">Diajukan:</span> {formatDateTime(a.submissionDate)}</div>
        </div>
      </header>

      <Section title="1. Identitas Pribadi">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Nama Lengkap" value={a.namaLengkap} />
          <Field label="Nomor KTP" value={a.nomorKtp} />
          <Field label="Tempat, Tanggal Lahir" value={`${a.tempatLahir || ''}, ${formatDate(a.tanggalLahir)}`} />
          <Field label="Jenis Kelamin" value={a.jenisKelamin} />
          <Field label="Agama" value={a.agama} />
          <Field label="Golongan Darah" value={a.golonganDarah} />
          <Field label="Kewarganegaraan" value={a.kewarganegaraan} />
          <Field label="Status Pernikahan" value={a.statusPernikahan + (a.tanggalStatusPernikahan ? ` (${formatDate(a.tanggalStatusPernikahan)})` : '')} />
          <Field label="Email" value={a.emailPribadi} />
          <Field label="No. HP" value={a.noTelp} />
          <Field label="SIM" value={simSummary} />
          <Field label="Alamat Tinggal" value={a.alamatTinggal} />
          <div className="col-span-2">
            <Field label="Alamat KTP" value={a.alamatKtp} />
          </div>
        </div>
      </Section>

      <Section title="2. Keluarga & Lingkungan">
        {isMarriedOrDivorced && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
            <Field label="Nama Pasangan" value={a.namaPasangan} />
            <Field label="TTL Pasangan" value={a.ttlPasangan} />
            <Field label="Pendidikan Pasangan" value={a.pendidikanPasangan} />
            <Field label="Pekerjaan Pasangan" value={a.pekerjaanPasangan} />
          </div>
        )}
        <Table
          headers={['Nama Anak', 'TTL', 'Pendidikan']}
          rows={anakRows}
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-3">
          <Field label="Nama Orang Tua" value={a.namaOrtu} />
          <Field label="Pekerjaan Orang Tua" value={a.pekerjaanOrtu} />
          <div className="col-span-2">
            <Field label="Alamat Orang Tua" value={a.alamatOrtu} />
          </div>
        </div>
      </Section>

      <Section title="3. Riwayat Pendidikan & Pelatihan">
        <Table
          headers={['Tahun', 'Sekolah', 'Jurusan', 'Kota', 'Ijazah']}
          rows={pendidikanRows}
        />
        <Table
          headers={['Bidang Kursus', 'Durasi', 'Tempat']}
          rows={kursusRows}
        />
      </Section>

      <Section title="4. Pengalaman Kerja & Referensi">
        <Table
          headers={['Perusahaan', 'Periode', 'Jabatan', 'Gaji', 'Alasan Pindah']}
          rows={pengalamanRows}
        />
        <div className="mb-3">
          <Field label="Jobdesk Terakhir" value={a.jobdeskTerakhir} />
        </div>
        <Table
          headers={['Perusahaan', 'Kontak', 'Telp', 'Hubungan']}
          rows={referensiPerusahaanRows}
        />
      </Section>

      <Section title="5. Minat & Konsep Diri">
        <div className="space-y-3">
          <Field label="Jabatan yang Dituju" value={a.jabatanDituju} />
          <Field label="Alasan Memilih Jabatan" value={a.alasanJabatan} />
          <Field label="Pengetahuan tentang Jabatan" value={a.pengetahuanJabatan} />
          <Field label="Lingkungan Kerja yang Diinginkan" value={a.lingkunganKerja} />
          <Field label="Cita-Cita" value={a.citaCita} />
          <Field label="Kesulitan dalam Pengambilan Keputusan" value={a.kesulitanKeputusan} />
        </div>
      </Section>

      <Section title="6. Aktifitas Sosial & Kemasyarakatan">
        <div className="space-y-3">
          <Field label="Hobby" value={a.hobby} />
          <Field label="Waktu Luang" value={a.waktuLuang} />
          <Field
            label="Pernah ke Luar Negeri?"
            value={a.pernahKeLuarNegeri + (a.pernahKeLuarNegeri === 'Ya' && a.detailKunjunganLuarNegeri ? ` — ${a.detailKunjunganLuarNegeri}` : '')}
          />
          <Field label="Kekuatan Diri" value={a.kekuatanDiri} />
          <Field label="Kelemahan Diri" value={a.kelemahanDiri} />
        </div>
        <Table
          headers={['Organisasi', 'Periode', 'Jabatan', 'Keterangan']}
          rows={organisasiRows}
        />
      </Section>

      <Section title="7. Ekspektasi Karir & Kesehatan">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Gaji yang Diinginkan" value={a.gajiDiinginkan ? `Rp ${a.gajiDiinginkan}` : '-'} />
          <Field label="Dapat Mulai Bekerja" value={a.dapatMulaiBekerja} />
          <Field label="Fasilitas yang Diharapkan" value={a.fasilitasDiharapkan} />
          <Field label="Kendaraan yang Dimiliki" value={a.kendaraanDimiliki} />
          <Field
            label="Pernah Sakit Keras?"
            value={a.pernahSakitKeras + (a.pernahSakitKeras === 'Ya' && a.detailSakitKeras ? ` — ${a.detailSakitKeras}` : '')}
          />
          <Field label="Gangguan Jasmani" value={a.gangguanJasmani} />
          <Field
            label="Kesehatan Keluarga Baik?"
            value={a.kesehatanKeluargaBaik + (a.kesehatanKeluargaBaik === 'Tidak' && a.detailKesehatanKeluarga ? ` — ${a.detailKesehatanKeluarga}` : '')}
          />
          <div className="col-span-2">
            <Field label="Alamat Media Sosial" value={a.alamatMediaSosial} />
          </div>
        </div>
      </Section>

      <Section title="8. Referensi Darurat & Pengesahan">
        <Table
          headers={['Nama', 'Hubungan', 'Telp']}
          rows={referensiKontakRows}
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
          <Field label="Kota & Tanggal" value={a.kotaTgl} />
          <Field label="Nama Terang" value={a.namaTerang} />
        </div>
        <p className="text-[8pt] text-stone-500 italic mt-4 leading-relaxed">
          Dengan ini saya menyatakan bahwa seluruh data yang saya berikan adalah benar dan dapat
          dipertanggungjawabkan. Luzie Group berhak menggunakan data ini untuk keperluan proses
          rekrutmen internal.
        </p>
      </Section>

      <footer className="mt-10 pt-3 border-t border-stone-300 text-[8pt] text-stone-500 flex justify-between">
        <span>Luzie Group — Sistem Rekrutmen Internal</span>
        <span>Dicetak: {formatDateTime(new Date().toISOString())}</span>
      </footer>
    </div>
  );
};
