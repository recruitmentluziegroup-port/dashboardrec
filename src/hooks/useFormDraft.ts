/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useFormDraft — localStorage-backed autosave for FormWizard.
 *
 * Storage key:        luzie_form_draft_v1
 * Schema version:     1 (mismatch is silently dropped)
 * TTL:                30 days (older drafts are ignored on read)
 * Write debounce:     500ms (batched; flushes on unmount)
 * Storage fallback:   if localStorage is unavailable (private mode,
 *                     quota exceeded, sandboxed iframe), the hook
 *                     becomes a no-op and `storageAvailable` is false.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Applicant } from '../types';

// -----------------------------------------------------------------
// Constants
// -----------------------------------------------------------------
const STORAGE_KEY = 'luzie_form_draft_v1';
const SCHEMA_VERSION = 1;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEBOUNCE_MS = 500;

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------
export interface DraftMeta {
  savedAt: number;
  currentStep: number;
  selectedPosition: string | null;
}

export interface DraftPayload {
  form: Applicant;
  currentStep: number;
  selectedPosition: string | null;
}

interface DraftData {
  _v: 1;
  savedAt: number;
  form: Applicant;
  currentStep: number;
  selectedPosition: string | null;
}

export interface UseFormDraftReturn {
  hasDraft: boolean;
  draftMeta: DraftMeta | null;
  lastSavedAt: number | null;
  storageAvailable: boolean;
  loadDraft: () => DraftPayload | null;
  saveDraft: (
    form: Applicant,
    currentStep: number,
    selectedPosition: string | null,
  ) => void;
  clearDraft: () => void;
}

// -----------------------------------------------------------------
// Storage probe — runs once at mount
// -----------------------------------------------------------------
function probeStorage(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const k = '__luzie_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------
// Internal reader — validates schema + TTL
// -----------------------------------------------------------------
function readRaw(available: boolean): DraftData | null {
  if (!available) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftData>;
    if (!parsed || parsed._v !== SCHEMA_VERSION) return null;
    if (typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    if (!parsed.form || typeof parsed.currentStep !== 'number') return null;
    return parsed as DraftData;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------
// Hook
// -----------------------------------------------------------------
export function useFormDraft(): UseFormDraftReturn {
  const [storageAvailable] = useState<boolean>(() => probeStorage());
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<DraftPayload | null>(null);

  useEffect(() => {
    const data = readRaw(storageAvailable);
    if (data) {
      setHasDraft(true);
      setDraftMeta({
        savedAt: data.savedAt,
        currentStep: data.currentStep,
        selectedPosition: data.selectedPosition,
      });
    }
  }, [storageAvailable]);

  const flush = useCallback(() => {
    if (!storageAvailable) return;
    const pending = pendingRef.current;
    if (!pending) return;

    const payload: DraftData = {
      _v: SCHEMA_VERSION,
      savedAt: Date.now(),
      form: pending.form,
      currentStep: pending.currentStep,
      selectedPosition: pending.selectedPosition,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSavedAt(payload.savedAt);
    } catch (err) {
      console.warn('[useFormDraft] save failed:', err);
    }
    pendingRef.current = null;
  }, [storageAvailable]);

  const loadDraft = useCallback((): DraftPayload | null => {
    const data = readRaw(storageAvailable);
    if (!data) return null;
    return {
      form: data.form,
      currentStep: data.currentStep,
      selectedPosition: data.selectedPosition,
    };
  }, [storageAvailable]);

  const saveDraft = useCallback(
    (form: Applicant, currentStep: number, selectedPosition: string | null) => {
      if (!storageAvailable) return;
      pendingRef.current = { form, currentStep, selectedPosition };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [storageAvailable, flush],
  );

  const clearDraft = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingRef.current = null;
    if (!storageAvailable) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setHasDraft(false);
    setDraftMeta(null);
    setLastSavedAt(null);
  }, [storageAvailable]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        const pending = pendingRef.current;
        if (pending && storageAvailable) {
          try {
            const payload: DraftData = {
              _v: SCHEMA_VERSION,
              savedAt: Date.now(),
              form: pending.form,
              currentStep: pending.currentStep,
              selectedPosition: pending.selectedPosition,
            };
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          } catch {
            // ignore
          }
        }
      }
    };
  }, [storageAvailable]);

  return {
    hasDraft,
    draftMeta,
    lastSavedAt,
    storageAvailable,
    loadDraft,
    saveDraft,
    clearDraft,
  };
}
