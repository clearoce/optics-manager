import { useCallback, useEffect, useState } from 'react';
import type { View } from '../types';

const VIEW_SET = new Set<View>(['dashboard', 'inventory', 'orders', 'customers']);

const getStateFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const viewCandidate = params.get('view');
  const view = viewCandidate && VIEW_SET.has(viewCandidate as View) ? (viewCandidate as View) : 'dashboard';
  const search = params.get('search') || '';
  return { view, search };
};

export function useUrlViewState() {
  const initial = getStateFromUrl();
  const [activeView, setActiveView] = useState<View>(initial.view);
  const [searchTerm, setSearchTerm] = useState(initial.search);

  useEffect(() => {
    const onPopState = () => {
      const state = getStateFromUrl();
      setActiveView(state.view);
      setSearchTerm(state.search);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const updateUrlAndState = useCallback((view: View, search: string, push = true) => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (search.trim()) {
      params.set('search', search.trim());
    }

    const url = `${window.location.pathname}?${params.toString()}`;
    if (push) {
      window.history.pushState({}, '', url);
    } else {
      window.history.replaceState({}, '', url);
    }

    setActiveView(view);
    setSearchTerm(search);
  }, []);

  const handleViewChange = useCallback(
    (view: View) => {
      updateUrlAndState(view, '', true);
    },
    [updateUrlAndState],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateUrlAndState(activeView, value, true);
    },
    [activeView, updateUrlAndState],
  );

  return {
    activeView,
    searchTerm,
    updateUrlAndState,
    handleViewChange,
    handleSearchChange,
  };
}