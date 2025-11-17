import { useState, useCallback, useEffect } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  setSearch: (search: string) => void;
  reset: () => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}

export interface UsePaginationReturn extends PaginationState, PaginationActions {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalPages: number;
  offset: number;
}

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100];

export function usePagination(
  initialState: Partial<PaginationState> = {}
): UsePaginationReturn {
  const [page, setPage] = useState(initialState.page || 1);
  const [limit, setLimit] = useState(initialState.limit || 20);
  const [sortBy, setSortBy] = useState(initialState.sortBy || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    initialState.sortOrder || 'desc'
  );
  const [search, setSearch] = useState(initialState.search || '');

  const offset = (page - 1) * limit;

  const reset = useCallback(() => {
    setPage(1);
    setLimit(initialState.limit || 20);
    setSortBy(initialState.sortBy || 'created_at');
    setSortOrder(initialState.sortOrder || 'desc');
    setSearch('');
  }, [initialState]);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToPage = useCallback((targetPage: number) => {
    setPage(Math.max(1, targetPage));
  }, []);

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
    setSearch,
    reset,
    nextPage,
    prevPage,
    goToPage,
    hasNextPage: false,
    hasPrevPage: page > 1,
    totalPages: 0,
    offset,
  };
}

export function usePaginatedQuery<T>(
  fetcher: (params: PaginationState) => Promise<{ data: T[]; meta: any }>,
  dependencies: any[] = []
) {
  const [state, setState] = useState<PaginationState>({
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc',
    search: '',
  });

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (params: PaginationState) => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher(params);
      setData(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData(state);
  }, [state, fetchData]);

  const updateState = useCallback((updates: Partial<PaginationState>) => {
    setState((prev) => ({
      ...prev,
      ...updates,
      page: updates.page || (updates.limit ? 1 : prev.page),
    }));
  }, []);

  return {
    data,
    meta,
    loading,
    error,
    state,
    updateState,
    refetch: () => fetchData(state),
  };
}

export { DEFAULT_LIMIT_OPTIONS };
