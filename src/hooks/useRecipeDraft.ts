import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { readRecipeDraft, writeRecipeDraft, type RecipeDraft } from '../lib/recipeDraft';

export function useRecipeDraft({ storageKey, data, initial, ready, restore }: {
  storageKey: string | null; data: RecipeDraft; initial: RecipeDraft; ready: boolean; restore: (data: RecipeDraft) => void;
}) {
  const [candidate, setCandidate] = useState<ReturnType<typeof readRecipeDraft>>(null);
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const ignoreNavigation = useRef(false);
  const serialized = JSON.stringify(data);
  const initialSerialized = JSON.stringify(initial);
  const dirty = ready && serialized !== initialSerialized;
  const blocker = useBlocker(() => dirty && !ignoreNavigation.current);

  useEffect(() => {
    if (!ready || !storageKey) return;
    try {
      const previous = readRecipeDraft(localStorage, storageKey);
      if (previous && JSON.stringify(previous.data) !== initialSerialized) setCandidate(previous);
    } catch { setStorageStatus('failed'); }
    setCheckedKey(storageKey);
  }, [storageKey, ready, initialSerialized]);

  useEffect(() => {
    if (!ready || !storageKey || checkedKey !== storageKey || candidate || ignoreNavigation.current) return;
    try {
      if (dirty) { writeRecipeDraft(localStorage, storageKey, JSON.parse(serialized)); setStorageStatus('saved'); }
      else { localStorage.removeItem(storageKey); setStorageStatus('idle'); }
    } catch { setStorageStatus('failed'); }
  }, [storageKey, serialized, ready, checkedKey, candidate, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (ignoreNavigation.current) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const discardCandidate = () => {
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch { setStorageStatus('failed'); } }
    setCandidate(null);
  };
  const restoreCandidate = () => { if (candidate) restore(candidate.data); setCandidate(null); };
  const markSaved = () => {
    ignoreNavigation.current = true;
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch { setStorageStatus('failed'); } }
  };
  return { candidate, storageStatus, dirty, blocker, discardCandidate, restoreCandidate, markSaved };
}
