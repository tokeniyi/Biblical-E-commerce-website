export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The first value of a query parameter, as Next passes repeated keys as arrays. */
export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
