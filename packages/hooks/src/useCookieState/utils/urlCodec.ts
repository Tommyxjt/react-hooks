import type { Codec } from '../../useStorageState';

/**
 * Cookie 默认 codec：URL 编码。
 *
 * 为什么 cookie 需要默认 URL 编码？
 * - cookie value 的语法限制较多（`;`、空格、换行等会破坏格式）；
 * - URL 编码能显著降低“写入成功但读出来解析异常”的概率；
 * - 与 local/session 的默认 identity 不同，这里更贴合 cookie 介质的特性。
 */
export const urlCodec: Codec = {
  encode(raw) {
    return encodeURIComponent(raw);
  },
  decode(stored) {
    return decodeURIComponent(stored);
  },
};
