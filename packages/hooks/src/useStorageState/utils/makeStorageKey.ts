export interface StorageKeyOptions {
  prefix?: string;
  separator?: string; // default ':'
  suffixSeparator?: string; // default '~'

  schema?: string;
  serializerId?: string;
  codecId?: string;
}

export function makeStorageKey(key: string, options?: StorageKeyOptions): string {
  const {
    prefix,
    separator = ':',
    suffixSeparator = '~',
    schema,
    serializerId,
    codecId,
  } = options ?? {};

  const head = prefix ? `${prefix}${separator}${key}` : key;

  let tail = '';
  if (schema) tail += `${suffixSeparator}${schema}`;
  if (serializerId) tail += `${suffixSeparator}${serializerId}`;
  if (codecId) tail += `${suffixSeparator}${codecId}`;

  return head + tail;
}
