import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle } from 'lucide-react';
import { isOverlap, type Interview } from '../lib/interview-links';

interface CalendarAgendaProps {
  interviews: Interview[];
  onSlotClick: (date: string, startHour: number) => void;
  onEventClick: (ev: Interview) => void;
  weekAnchor: Date | string;
  setWeekAnchor: (d: Date) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08..18
const ROW_H = 56; // h-14
const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function toYMD(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function mondayOf(anchor: Date | string): Date {
  const d = anchor instanceof Date ? new Date(anchor) : new Date(anchor);
  if (isNaN(d.getTime())) return startOfTodayMonday();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return d;
}

function startOfTodayMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

function parseHour(t: string): number {
  const [h = '0', m = '0'] = String(t || '0:0').split(':');
  return (parseInt(h, 10) || 0) + (parseInt(m, 10) || 0) / 60;
}

export const CalendarAgenda: React.FC<CalendarAgendaProps> = ({
  interviews,
  onSlotClick,
  onEventClick,
  weekAnchor,
  setWeekAnchor,
}) => {
  const weekDays = useMemo(() => {
    const mon = mondayOf(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const todayStr = toYMD(new Date());
  const anchorStr = useMemo(() => {
    const d = weekAnchor instanceof Date ? weekAnchor : new Date(weekAnchor);
    return isNaN(d.getTime()) ? '' : toYMD(d);
  }, [weekAnchor]);

  const byDate = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const ev of interviews || []) {
      const key = String(ev.date || '').slice(0, 10);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [interviews]);

  const shiftWeek = (delta: number) => {
    const mon = mondayOf(weekAnchor);
    mon.setDate(mon.getDate() + delta);
    setWeekAnchor(mon);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Week strip */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftWeek(-7)}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
            aria-label="Minggu sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => shiftWeek(7)}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
            aria-label="Minggu berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekAnchor(new Date())}
            className="ml-1 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-stone-200 hover:border-brand-700 hover:text-brand-700 cursor-pointer"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Hari Ini</span>
          </button>
        </div>
        <p className="text-xs font-bold text-stone-500">
          {weekDays[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} –{' '}
          {weekDays[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
        {weekDays.map((d, i) => {
          const ymd = toYMD(d);
          const active = ymd === anchorStr;
          const isToday = ymd === todayStr;
          return (
            <button
              key={ymd}
              onClick={() => setWeekAnchor(d)}
              className={`py-2.5 flex flex-col items-center gap-0.5 cursor-pointer transition-colors min-h-[44px] min-w-[44px] ${
                active ? 'bg-brand-50' : 'hover:bg-stone-100'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-stone-400">{DAY_NAMES[i]}</span>
              <span
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black ${
                  isToday ? 'bg-brand-700 text-white' : active ? 'text-brand-700' : 'text-stone-700'
                }`}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto">
        <div className="min-w-[840px] grid grid-cols-7">
          {weekDays.map((d) => {
            const ymd = toYMD(d);
            const events = (byDate.get(ymd) || []).slice().sort((a, b) =>
              String(a.startTime ?? a.start ?? '').localeCompare(String(b.startTime ?? b.start ?? '')),
            );
            return (
              <div key={ymd} className="border-r border-stone-100 last:border-r-0">
                <div className="relative">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      onClick={() => onSlotClick(ymd, h)}
                      className="flex border-b border-stone-100 h-14 cursor-pointer hover:bg-brand-50/40"
                    >
                      <div className="w-14 shrink-0 text-[10px] font-semibold text-stone-400 pt-1 pl-2">
                        {`${`${h}`.padStart(2, '0')}:00`}
                      </div>
                      <div className="flex-1" />
                    </div>
                  ))}
                  {events.map((ev) => {
                    const s = String(ev.startTime ?? ev.start ?? '09:00');
                    const e = String(ev.endTime ?? ev.end ?? '10:00');
                    const top = Math.max(0, (parseHour(s) - 8) * ROW_H);
                    const height = Math.max(24, (parseHour(e) - parseHour(s)) * ROW_H - 4);
                    const conflict = events.some((o) => o !== ev && isOverlap(ev, o));
                    const isHR = /hr/i.test(String(ev.stage || ''));
                    return (
                      <button
                        key={String(ev.id)}
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onEventClick(ev);
                        }}
                        style={{ top, height }}
                        className={`absolute left-14 right-1 rounded-lg px-2 py-1 text-left text-[10px] font-bold border overflow-hidden cursor-pointer transition-shadow hover:shadow min-h-[44px] ${
                          isHR
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : 'bg-brand-100 text-brand-800 border-brand-200'
                        }`}
                      >
                        <span className="block truncate leading-tight">
                          {s} · {ev.candidateName || 'Kandidat'}
                        </span>
                        <span className="block truncate font-semibold opacity-80 leading-tight">
                          {ev.stage || ''} · {ev.interviewer || ''}
                        </span>
                        {conflict && (
                          <span className="mt-0.5 inline-flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                            <AlertTriangle className="h-3 w-3" />
                            Bentrok
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
