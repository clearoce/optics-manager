import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../app/notify';

type UseResourceListOptions<T, TArgs extends unknown[]> = {
  autoLoad?: boolean;
  initialData?: T[];
  defaultErrorMessage: string;
  initialArgs?: TArgs;
};

export function useResourceList<T, TArgs extends unknown[]>(
  loader: (...args: TArgs) => Promise<T[]>,
  {
    autoLoad = true,
    initialData = [],
    defaultErrorMessage,
    initialArgs,
  }: UseResourceListOptions<T, TArgs>,
) {
  const initialArgsRef = useRef<TArgs | undefined>(initialArgs);
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async (...args: TArgs) => {
    setLoading(true);
    setError('');
    try {
      const rows = await loader(...args);
      setData(rows);
    } catch (err) {
      setError(getErrorMessage(err, defaultErrorMessage));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [defaultErrorMessage, loader]);

  useEffect(() => {
    if (!autoLoad) return;
    void reload(...((initialArgsRef.current ?? []) as unknown as TArgs));
  }, [autoLoad, reload]);

  return {
    data,
    loading,
    error,
    reload,
    setData,
    setError,
  };
}
