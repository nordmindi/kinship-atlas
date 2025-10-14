import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface FamilyTreeContextValue {
  selectedMemberId: string | null;
  setSelectedMemberId: (memberId: string | null) => void;
  clearSelectedMember: () => void;
}

const FamilyTreeContext = createContext<FamilyTreeContextValue | undefined>(undefined);

const STORAGE_PREFIX = 'family-tree:selected-member';

export const FamilyTreeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const storageKey = useMemo(
    () => (user?.id ? `${STORAGE_PREFIX}:${user.id}` : STORAGE_PREFIX),
    [user?.id]
  );

  const [selectedMemberId, setSelectedMemberIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !user?.id) {
      return null;
    }

    try {
      return window.sessionStorage.getItem(`${STORAGE_PREFIX}:${user.id}`) ?? null;
    } catch (error) {
      console.warn('Failed to read family tree state from storage', error);
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!user?.id) {
      setSelectedMemberIdState(null);
      return;
    }

    try {
      const stored = window.sessionStorage.getItem(storageKey);
      setSelectedMemberIdState(stored ?? null);
    } catch (error) {
      console.warn('Failed to load family tree state from storage', error);
      setSelectedMemberIdState(null);
    }
  }, [storageKey, user?.id]);

  const persistSelectedMemberId = useCallback(
    (memberId: string | null) => {
      setSelectedMemberIdState(memberId);

      if (typeof window === 'undefined') {
        return;
      }

      try {
        if (memberId && user?.id) {
          window.sessionStorage.setItem(storageKey, memberId);
        } else if (user?.id) {
          window.sessionStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.warn('Failed to persist family tree selection', error);
      }
    },
    [storageKey, user?.id]
  );

  const clearSelectedMember = useCallback(() => {
    persistSelectedMemberId(null);
  }, [persistSelectedMemberId]);

  const value = useMemo(
    () => ({
      selectedMemberId,
      setSelectedMemberId: persistSelectedMemberId,
      clearSelectedMember,
    }),
    [clearSelectedMember, persistSelectedMemberId, selectedMemberId]
  );

  return <FamilyTreeContext.Provider value={value}>{children}</FamilyTreeContext.Provider>;
};

export const useFamilyTree = (): FamilyTreeContextValue => {
  const context = useContext(FamilyTreeContext);

  if (!context) {
    throw new Error('useFamilyTree must be used within a FamilyTreeProvider');
  }

  return context;
};
