/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CommandPalette — ⌘K / Ctrl+K quick-action overlay for AdminPanel.
 * Fuzzy-ish search across applicants (name / ID / position) plus tab
 * navigation and data refresh. Pure client-side on already-loaded data.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, LayoutDashboard, ListFilter, Briefcase, TableProperties, CalendarDays, RefreshCw, User } from 'lucide-react';
import type { Applicant } from '../../types';

type AdminTab = 'dashboard' | 'list' | 'vacancies' | 'tracker' | 'calendar';

interface Command {
  id: string;
  label: string;
  hint?: string;
  section: string;
  Icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  applicants: Applicant[];
  onSelectApplicant: (id: string) => void;
  onSwitchTab: (tab: AdminTab) => void;
  onRefresh: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  applicants,
  onSelectApplicant,
  onSwitchTab,
  onRefresh,
}) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Wait a tick so the input exists before focusing
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const people: Command[] = applicants.slice(0, 200).map((c) => ({
      id: `person-${c.id}`,
      label: c.namaLengkap || '(tanpa nama)',
      hint: `${c.id} · ${c.jabatanDituju || '—'}`,
      section: 'Berkas Pelamar',
      Icon: User,
      run: () => onSelectApplicant(c.id),
    }));
    const tabs: Command[] = [
      { id: 'tab-dashboard', label: 'Buka Dashboard', section: 'Navigasi', Icon: LayoutDashboard, run: () => onSwitchTab('dashboard') },
      { id: 'tab-list', label: 'Buka Daftar Berkas', section: 'Navigasi', Icon: ListFilter, run: () => onSwitchTab('list') },
      { id: 'tab-vacancies', label: 'Kelola Lowongan', section: 'Navigasi', Icon: Briefcase, run: () => onSwitchTab('vacancies') },
      { id: 'tab-tracker', label: 'Buka Tracker Rekrutmen', section: 'Navigasi', Icon: TableProperties, run: () => onSwitchTab('tracker') },
      { id: 'tab-calendar', label: 'Buka Kalender Wawancara', section: 'Navigasi', Icon: CalendarDays, run: () => onSwitchTab('calendar') },
      { id: 'refresh', label: 'Sinkronkan data dari Google Sheet', section: 'Navigasi', Icon: RefreshCw, run: onRefresh },
    ];
    return [...people, ...tabs];
  }, [applicants, onSelectApplicant, onSwitchTab, onRefresh]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 12);
    return commands
      .filter((c) => `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [commands, query]);

  useEffect(() => { setActive(0); }, [query]);

  // Keep the active row visible while arrow-navigating
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(results.length - 1, a + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = results[active];
        if (cmd) {
          cmd.run();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, active, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-stone-950/50" onClick={onClose} aria-hidden="true" />
      <div className="berkas-stripe relative w-full max-w-xl bg-white rounded-2xl border border-editorial-border shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-editorial-border">
          <Search className="h-4 w-4 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari berkas pelamar atau perintah..."
            aria-label="Cari perintah"
            className="flex-1 bg-transparent border-0 outline-hidden text-sm font-semibold text-stone-800 placeholder:text-stone-400"
          />
          <kbd className="hidden sm:block text-[9px] font-extrabold text-stone-400 bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs font-bold text-stone-400 uppercase tracking-wider">
              Tidak ada hasil untuk &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map((cmd, idx) => {
              const showSection = idx === 0 || results[idx - 1].section !== cmd.section;
              return (
                <React.Fragment key={cmd.id}>
                  {showSection && (
                    <p className="px-4 pt-2 pb-1 text-[9px] font-extrabold text-stone-400 uppercase tracking-widest">
                      {cmd.section}
                    </p>
                  )}
                  <button
                    data-idx={idx}
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => {
                      cmd.run();
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                      idx === active ? 'bg-brand-50' : 'bg-transparent'
                    }`}
                  >
                    <span className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center border ${idx === active ? 'bg-brand-100 border-brand-200 text-brand-700' : 'bg-stone-50 border-editorial-border text-stone-500'}`}>
                      <cmd.Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs font-extrabold truncate ${idx === active ? 'text-brand-700' : 'text-stone-800'}`}>{cmd.label}</span>
                      {cmd.hint && <span className="block text-[10px] font-bold text-stone-400 truncate">{cmd.hint}</span>}
                    </span>
                    {idx === active && <CornerDownLeft className="h-3.5 w-3.5 text-brand-500 shrink-0" />}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-editorial-border bg-editorial-cream">
          <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider">↑↓ Navigasi · Enter Buka</span>
          <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider">⌘K / Ctrl+K</span>
        </div>
      </div>
    </div>
  );
};