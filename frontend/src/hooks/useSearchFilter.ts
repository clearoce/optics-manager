import { useMemo } from 'react';

type SearchValue = string | number | boolean | null | undefined;
type SearchFieldGetter<T> = (item: T) => SearchValue;
type SearchMatcher<T> = (item: T, normalizedSearch: string) => boolean;

const normalizeSearchValue = (value: SearchValue) => String(value ?? '').toLowerCase();

export function createFieldSearchMatcher<T>(fieldGetters: SearchFieldGetter<T>[]): SearchMatcher<T> {
  return (item, normalizedSearch) =>
    fieldGetters.some((getter) => normalizeSearchValue(getter(item)).includes(normalizedSearch));
}

type UseSearchFilterParams<T> = {
  items: T[];
  searchTerm: string;
  matcher: SearchMatcher<T>;
};

export function useSearchFilter<T>({ items, searchTerm, matcher }: UseSearchFilterParams<T>) {
  return useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return items;
    return items.filter((item) => matcher(item, normalizedSearch));
  }, [items, searchTerm, matcher]);
}
