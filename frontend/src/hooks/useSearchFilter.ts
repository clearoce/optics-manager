import { useMemo } from 'react';

type SearchValue = string | number | boolean | null | undefined;
type SearchFieldGetter<T> = (item: T) => SearchValue;
export type SearchToken = {
  term: string;
  exact: boolean;
};

type SearchMatcher<T> = (item: T, token: SearchToken) => boolean;

const normalizeSearchValue = (value: SearchValue) => String(value ?? '').toLowerCase();
const WORD_CHAR_REGEX = /[\p{L}\p{N}_]/u;

const isWordChar = (char: string | undefined) => !!char && WORD_CHAR_REGEX.test(char);

const hasExactTermMatch = (normalizedValue: string, normalizedTerm: string) => {
  if (!normalizedTerm) return false;
  if (normalizedValue === normalizedTerm) return true;

  let fromIndex = 0;
  while (fromIndex < normalizedValue.length) {
    const matchIndex = normalizedValue.indexOf(normalizedTerm, fromIndex);
    if (matchIndex === -1) return false;

    const prevChar = matchIndex > 0 ? normalizedValue[matchIndex - 1] : undefined;
    const nextCharIndex = matchIndex + normalizedTerm.length;
    const nextChar = nextCharIndex < normalizedValue.length ? normalizedValue[nextCharIndex] : undefined;

    if (!isWordChar(prevChar) && !isWordChar(nextChar)) {
      return true;
    }

    fromIndex = matchIndex + normalizedTerm.length;
  }

  return false;
};

export const matchSearchTokenInValue = (value: SearchValue, token: SearchToken) => {
  const normalizedValue = normalizeSearchValue(value);
  return token.exact
    ? hasExactTermMatch(normalizedValue, token.term)
    : normalizedValue.includes(token.term);
};

export function createFieldSearchMatcher<T>(fieldGetters: SearchFieldGetter<T>[]): SearchMatcher<T> {
  return (item, token) =>
    fieldGetters.some((getter) => matchSearchTokenInValue(getter(item), token));
}

type UseSearchFilterParams<T> = {
  items: T[];
  searchTerm: string;
  matcher: SearchMatcher<T>;
};

export function useSearchFilter<T>({ items, searchTerm, matcher }: UseSearchFilterParams<T>) {
  return useMemo(() => {
    const normalizedTerms: SearchToken[] = [];
    const tokenRegex = /"([^"]+)"|(\S+)/g;

    for (const match of searchTerm.matchAll(tokenRegex)) {
      const exactValue = match[1];
      const fuzzyValue = match[2];
      const normalizedValue = (exactValue ?? fuzzyValue ?? '').trim().toLowerCase();
      if (!normalizedValue) continue;
      normalizedTerms.push({ term: normalizedValue, exact: exactValue !== undefined });
    }

    if (normalizedTerms.length === 0) return items;

    return items.filter((item) => normalizedTerms.every((token) => matcher(item, token)));
  }, [items, searchTerm, matcher]);
}
