export type DuplicateResult<T> = {
  items: T[];
  duplicates: T[];
};

export const normalizeDuplicateValue = (value?: string | number | null) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export const buildDuplicateKey = (values: Array<string | number | null | undefined>) =>
  values.map(normalizeDuplicateValue).join("|");

export const isDuplicateItem = <T>(
  items: T[],
  candidate: T,
  getKey: (item: T) => string,
  ignoreIndex?: number | null
) => {
  const candidateKey = getKey(candidate);
  if (!candidateKey.replace(/\|/g, "")) return false;

  return items.some((item, index) => index !== ignoreIndex && getKey(item) === candidateKey);
};

export const filterUniqueNewItems = <T>(
  existingItems: T[],
  newItems: T[],
  getKey: (item: T) => string
): DuplicateResult<T> => {
  const seenKeys = new Set(existingItems.map(getKey).filter(Boolean));
  const result: DuplicateResult<T> = { items: [], duplicates: [] };

  for (const item of newItems) {
    const key = getKey(item);
    if (!key.replace(/\|/g, "") || seenKeys.has(key)) {
      result.duplicates.push(item);
      continue;
    }

    seenKeys.add(key);
    result.items.push(item);
  }

  return result;
};

export const uniqueTextList = (values: string[]): DuplicateResult<string> => {
  const seenKeys = new Set<string>();
  const result: DuplicateResult<string> = { items: [], duplicates: [] };

  for (const value of values) {
    const key = normalizeDuplicateValue(value);
    if (!key || seenKeys.has(key)) {
      result.duplicates.push(value);
      continue;
    }

    seenKeys.add(key);
    result.items.push(value);
  }

  return result;
};

export const formatDuplicateMessage = (label: string, duplicateNames: string[]) => {
  const names = duplicateNames
    .filter(Boolean)
    .map((name) => `- ${name}`)
    .join("\n");

  return [
    `${label} yang sama sudah ada di daftar, jadi data duplikat tidak disimpan.`,
    names ? `\nData duplikat:\n${names}` : "",
  ].join("");
};
