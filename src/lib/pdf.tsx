import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Applicant } from '../types';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1C1917',
    lineHeight: 1.4,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#F97316',
    padding: 15,
    borderRadius: 6,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  companyName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  docTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 8,
    opacity: 0.9,
  },
  section: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F97316',
    paddingBottom: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCol6: {
    width: '50%',
    marginBottom: 6,
    paddingRight: 10,
  },
  gridCol12: {
    width: '100%',
    marginBottom: 6,
  },
  label: {
    color: '#78716C',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  value: {
    fontSize: 9,
    color: '#1C1917',
  },
  table: {
    width: '100%',
    marginTop: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
    alignItems: 'center',
    padding: 4,
  },
  tableHeader: {
    backgroundColor: '#FFF7ED',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
    alignItems: 'center',
    padding: 4,
  },
  tableCellHeader: {
    fontWeight: 'bold',
    color: '#44403C',
    fontSize: 7,
  },
  tableCell: {
    fontSize: 7.5,
    color: '#1C1917',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#78716C',
    fontSize: 7,
  },
});

interface PdfProps {
  applicant: Applicant;
}

export const MyPdfDocument: React.FC<PdfProps> = ({ applicant }) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return dateStr.split('T')[0];
    } catch {
      return dateStr;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Document Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>
              LUZIE GROUP
            </Text>
            <Text style={styles.docTitle}>DATA PERSONAL KARYAWAN</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.metaText}>ID: {applicant.id}</Text>
            <Text style={styles.metaText}>Status: {applicant.status}</Text>
            <Text style={styles.metaText}>Sub: {formatDate(applicant.submissionDate)}</Text>
          </View>
        </View>

        {/* Step 1: Identitas Pribadi */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. IDENTITAS PRIBADI</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <Text style={styles.value}>{applicant.namaLengkap}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Nomor KTP (ID Card)</Text>
              <Text style={styles.value}>{applicant.nomorKtp}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Tempat, Tanggal Lahir</Text>
              <Text style={styles.value}>{applicant.tempatLahir}, {formatDate(applicant.tanggalLahir)}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Kewarganegaraan / Agama</Text>
              <Text style={styles.value}>{applicant.kewarganegaraan} / {applicant.agama}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Email / No. HP</Text>
              <Text style={styles.value}>{applicant.emailPribadi} / {applicant.noTelp}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Jenis Kelamin / Gol. Darah</Text>
              <Text style={styles.value}>{applicant.jenisKelamin} / {applicant.golonganDarah || '-'}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Status Pernikahan</Text>
              <Text style={styles.value}>
                {applicant.statusPernikahan} {applicant.tanggalStatusPernikahan ? `(${formatDate(applicant.tanggalStatusPernikahan)})` : ''}
              </Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>SIM yang Dimiliki</Text>
              <Text style={styles.value}>
                {[
                  applicant.simC ? `SIM C (${applicant.noSimC || '-'})` : '',
                  applicant.simA ? `SIM A (${applicant.noSimA || '-'})` : ''
                ].filter(Boolean).join(', ') || '-'}
              </Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Alamat Tempat Tinggal</Text>
              <Text style={styles.value}>{applicant.alamatTinggal}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Alamat Sesuai KTP</Text>
              <Text style={styles.value}>{applicant.alamatKtp}</Text>
            </View>
          </View>
        </View>

        {/* Step 2: Keluarga & Lingkungan */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. KELUARGA & LINGKUNGAN</Text>
          </View>
          {applicant.statusPernikahan === 'Menikah' || applicant.statusPernikahan === 'Bercerai' ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#EA580C', marginBottom: 4 }}>Data Pasangan & Anak</Text>
              <View style={styles.grid}>
                <View style={styles.gridCol6}>
                  <Text style={styles.label}>Nama Pasangan (Suami/Istri)</Text>
                  <Text style={styles.value}>{applicant.namaPasangan || '-'}</Text>
                </View>
                <View style={styles.gridCol6}>
                  <Text style={styles.label}>TTL Pasangan</Text>
                  <Text style={styles.value}>{applicant.ttlPasangan || '-'}</Text>
                </View>
                <View style={styles.gridCol6}>
                  <Text style={styles.label}>Pendidikan Terakhir Pasangan</Text>
                  <Text style={styles.value}>{applicant.pendidikanPasangan || '-'}</Text>
                </View>
                <View style={styles.gridCol6}>
                  <Text style={styles.label}>Pekerjaan Pasangan</Text>
                  <Text style={styles.value}>{applicant.pekerjaanPasangan || '-'}</Text>
                </View>
              </View>

              {applicant.anak && applicant.anak.length > 0 && (
                <View>
                  <Text style={styles.label}>Anak-Anak:</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCellHeader, { width: '40%' }]}>Nama Anak</Text>
                      <Text style={[styles.tableCellHeader, { width: '30%' }]}>Tempat, Tanggal Lahir</Text>
                      <Text style={[styles.tableCellHeader, { width: '30%' }]}>Pendidikan</Text>
                    </View>
                    {applicant.anak.map((a, idx) => (
                      <View style={styles.tableRow} key={idx}>
                        <Text style={[styles.tableCell, { width: '40%' }]}>{a.nama || '-'}</Text>
                        <Text style={[styles.tableCell, { width: '30%' }]}>{a.ttl || '-'}</Text>
                        <Text style={[styles.tableCell, { width: '30%' }]}>{a.pendidikan || '-'}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : null}

          <View style={{ marginBottom: 6 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#EA580C', marginBottom: 4 }}>Data Orang Tua & Keluarga</Text>
            <View style={styles.grid}>
              <View style={styles.gridCol6}>
                <Text style={styles.label}>Nama Orang Tua (Ayah/Ibu/Wali)</Text>
                <Text style={styles.value}>{applicant.namaOrtu}</Text>
              </View>
              <View style={styles.gridCol6}>
                <Text style={styles.label}>Pekerjaan Orang Tua</Text>
                <Text style={styles.value}>{applicant.pekerjaanOrtu}</Text>
              </View>
              <View style={styles.gridCol12}>
                <Text style={styles.label}>Alamat Orang Tua</Text>
                <Text style={styles.value}>{applicant.alamatOrtu}</Text>
              </View>
            </View>
          </View>

          {applicant.saudara && applicant.saudara.length > 0 && (
            <View>
              <Text style={styles.label}>Saudara Kandung:</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCellHeader, { width: '40%' }]}>Nama Saudara</Text>
                  <Text style={[styles.tableCellHeader, { width: '15%' }]}>Kakak / Adik</Text>
                  <Text style={[styles.tableCellHeader, { width: '15%' }]}>Usia</Text>
                  <Text style={[styles.tableCellHeader, { width: '30%' }]}>Pendidikan / Pekerjaan</Text>
                </View>
                {applicant.saudara.map((b, idx) => (
                  <View style={styles.tableRow} key={idx}>
                    <Text style={[styles.tableCell, { width: '40%' }]}>{b.nama || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>{b.kakakAdik || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>{b.usia || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{b.pendidikanPekerjaan || '-'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Step 3: Riwayat Pendidikan */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>3. RIWAYAT PENDIDIKAN & PELATIHAN</Text>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#EA580C', marginBottom: 2 }}>Pendidikan Formal</Text>
          {applicant.pendidikanFormal && applicant.pendidikanFormal.length > 0 && (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { width: '15%' }]}>Tahun</Text>
                <Text style={[styles.tableCellHeader, { width: '40%' }]}>Nama Sekolah / Universitas</Text>
                <Text style={[styles.tableCellHeader, { width: '20%' }]}>Jurusan</Text>
                <Text style={[styles.tableCellHeader, { width: '15%' }]}>Kota</Text>
                <Text style={[styles.tableCellHeader, { width: '10%' }]}>Ijazah</Text>
              </View>
              {applicant.pendidikanFormal.map((p, idx) => (
                <View style={styles.tableRow} key={idx}>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{p.dari || '-'} s.d {p.sampai || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '40%' }]}>{p.sekolah || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{p.jurusan || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{p.kota || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{p.ijazah || '-'}</Text>
                </View>
              ))}
            </View>
          )}

          {applicant.kursus && applicant.kursus.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#EA580C', marginBottom: 2 }}>Kursus / Pelatihan</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCellHeader, { width: '40%' }]}>Bidang Kursus</Text>
                  <Text style={[styles.tableCellHeader, { width: '25%' }]}>Durasi</Text>
                  <Text style={[styles.tableCellHeader, { width: '35%' }]}>Tempat</Text>
                </View>
                {applicant.kursus.map((k, idx) => (
                  <View style={styles.tableRow} key={idx}>
                    <Text style={[styles.tableCell, { width: '40%' }]}>{k.bidang || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>{k.lamanya || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '35%' }]}>{k.tempat || '-'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Step 4: Pengalaman Kerja */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>4. PENGALAMAN KERJA & REFERENSI</Text>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#EA580C', marginBottom: 2 }}>Riwayat Pekerjaan</Text>
          {applicant.pengalamanKerja && applicant.pengalamanKerja.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { width: '30%' }]}>Perusahaan</Text>
                <Text style={[styles.tableCellHeader, { width: '15%' }]}>Periode</Text>
                <Text style={[styles.tableCellHeader, { width: '15%' }]}>Jabatan</Text>
                <Text style={[styles.tableCellHeader, { width: '15%' }]}>Gaji akhir</Text>
                <Text style={[styles.tableCellHeader, { width: '25%' }]}>Alasan Pindah</Text>
              </View>
              {applicant.pengalamanKerja.map((pk, idx) => (
                <View style={styles.tableRow} key={idx}>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{pk.perusahaan || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{pk.dari || '-'} s.d {pk.sampai || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{pk.jabatan || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{pk.gaji ? `Rp ${pk.gaji}` : '-'}</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>{pk.alasanPindah || '-'}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 8, fontStyle: 'italic', marginBottom: 6 }}>Tidak ada riwayat pekerjaan.</Text>
          )}

          {applicant.jobdeskTerakhir ? (
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.label}>Uraian Jobdesk Terakhir:</Text>
              <Text style={styles.value}>{applicant.jobdeskTerakhir}</Text>
            </View>
          ) : null}

          {applicant.referensiPerusahaan && applicant.referensiPerusahaan.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#EA580C', marginBottom: 2 }}>Referensi Pihak Atasan / Perusahaan</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCellHeader, { width: '30%' }]}>Perusahaan</Text>
                  <Text style={[styles.tableCellHeader, { width: '25%' }]}>Nama Kontak</Text>
                  <Text style={[styles.tableCellHeader, { width: '20%' }]}>No. HP</Text>
                  <Text style={[styles.tableCellHeader, { width: '25%' }]}>Hubungan Kerja</Text>
                </View>
                {applicant.referensiPerusahaan.map((rp, idx) => (
                  <View style={styles.tableRow} key={idx}>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{rp.perusahaan || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>{rp.kontak || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>{rp.telp || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>{rp.hubungan || '-'}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Step 5: Minat & Konsep Diri */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>5. MINAT & KONSEP DIRI</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Jabatan yang Dituju</Text>
              <Text style={styles.value}>{applicant.jabatanDituju}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Mengapa ingin bekerja pada jabatan tersebut?</Text>
              <Text style={styles.value}>{applicant.alasanJabatan}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Apa yang Saudara ketahui tentang tugas dan tanggung jawab jabatan tersebut?</Text>
              <Text style={styles.value}>{applicant.pengetahuanJabatan}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Lingkungan kerja apa yang Saudara senangi? Apa sebabnya?</Text>
              <Text style={styles.value}>{applicant.lingkunganKerja}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Apa cita-cita dalam hidup Anda?</Text>
              <Text style={styles.value}>{applicant.citaCita}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Terhadap hal-hal apa saja Saudara paling sulit untuk mengambil keputusan?</Text>
              <Text style={styles.value}>{applicant.kesulitanKeputusan}</Text>
            </View>
          </View>
        </View>

        {/* Step 6: Aktifitas Sosial */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>6. AKTIFITAS SOSIAL & KEMASYARAKATAN</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Hobby / Kegemaran</Text>
              <Text style={styles.value}>{applicant.hobby}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Mengisi Waktu Luang</Text>
              <Text style={styles.value}>{applicant.waktuLuang}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Pernah keluar negeri?</Text>
              <Text style={styles.value}>
                {applicant.pernahKeLuarNegeri} {applicant.pernahKeLuarNegeri === 'Ya' ? `(${applicant.detailKunjunganLuarNegeri})` : ''}
              </Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Kekuatan Diri</Text>
              <Text style={styles.value}>{applicant.kekuatanDiri}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Kelemahan Diri</Text>
              <Text style={styles.value}>{applicant.kelemahanDiri}</Text>
            </View>
          </View>

          {applicant.organisasi && applicant.organisasi.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.label}>Organisasi yang pernah diikuti:</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCellHeader, { width: '40%' }]}>Nama Organisasi</Text>
                  <Text style={[styles.tableCellHeader, { width: '20%' }]}>Periode</Text>
                  <Text style={[styles.tableCellHeader, { width: '20%' }]}>Jabatan</Text>
                  <Text style={[styles.tableCellHeader, { width: '20%' }]}>Keterangan</Text>
                </View>
                {applicant.organisasi.map((org, idx) => (
                  <View style={styles.tableRow} key={idx}>
                    <Text style={[styles.tableCell, { width: '40%' }]}>{org.nama || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>{org.periode || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>{org.jabatan || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>{org.keterangan || '-'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Step 7: Ekspektasi & Lain-lain */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>7. PRESTASI / EKSPEKTASI & KESEHATAN PRIBADI</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Gaji yang diinginkan (Rp)</Text>
              <Text style={styles.value}>{applicant.gajiDiinginkan ? `Rp ${applicant.gajiDiinginkan}` : '-'}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Fasilitas yang diharapkan</Text>
              <Text style={styles.value}>{applicant.fasilitasDiharapkan || '-'}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Dapat Mulai Bekerja</Text>
              <Text style={styles.value}>{applicant.dapatMulaiBekerja || '-'}</Text>
            </View>
            <View style={styles.gridCol6}>
              <Text style={styles.label}>Kendaraan yang dimiliki</Text>
              <Text style={styles.value}>{applicant.kendaraanDimiliki || '-'}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Pernah sakit keras / lama?</Text>
              <Text style={styles.value}>
                {applicant.pernahSakitKeras === 'Ya' ? `Ya (${applicant.detailSakitKeras})` : 'Tidak'}
              </Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Gangguan jasmani tetap yang dialami</Text>
              <Text style={styles.value}>{applicant.gangguanJasmani || 'Tidak ada'}</Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Apakah kesehatan keluarga baik-baik saja?</Text>
              <Text style={styles.value}>
                {applicant.kesehatanKeluargaBaik === 'Tidak' ? `Tidak (${applicant.detailKesehatanKeluarga})` : 'Ya'}
              </Text>
            </View>
            <View style={styles.gridCol12}>
              <Text style={styles.label}>Alamat Media Sosial (IG/LinkedIn/dll)</Text>
              <Text style={styles.value}>{applicant.alamatMediaSosial || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Step 8: Referensi Darurat & Pernyataan */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>8. REFERENSI KERABAT TERDEKAT & PERNYATAAN</Text>
          </View>
          <Text style={{ fontStyle: 'italic', fontSize: 7.5, color: '#EA580C', marginBottom: 4 }}>
            Kerabat Dekat yang Dapat Dihubungi dalam Keadaan Darurat (Minimum 1):
          </Text>
          {applicant.referensiKontak && applicant.referensiKontak.length > 0 && (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { width: '40%' }]}>Nama Lengkap</Text>
                <Text style={[styles.tableCellHeader, { width: '30%' }]}>Hubungan / Kekerabatan</Text>
                <Text style={[styles.tableCellHeader, { width: '30%' }]}>Nomor HP / Telpon</Text>
              </View>
              {applicant.referensiKontak.map((ref, idx) => (
                <View style={styles.tableRow} key={idx}>
                  <Text style={[styles.tableCell, { width: '40%' }]}>{ref.nama || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{ref.hubungan || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{ref.telp || '-'}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#E7E5E4', paddingTop: 8, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: '#44403C' }}>Dengan ini saya menyatakan informasi ini dibuat dengan sebenar-benarnya.</Text>
            <Text style={{ fontSize: 8, color: '#44403C', marginTop: 4 }}>Dibuat di: {applicant.kotaTgl || '-'}</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1C1917', marginTop: 15 }}>{applicant.namaTerang}</Text>
            <Text style={{ fontSize: 7, color: '#78716C', fontStyle: 'italic' }}>(Tandatangan Digital)</Text>
          </View>
        </View>

        {/* Document Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Rekrutmen Luzie Group - Dicetak secara otomatis</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};
