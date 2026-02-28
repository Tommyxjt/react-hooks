import type { StorageLike } from '../../useStorageState';
import type { CookieAttributes } from './cookieTypes';

function formatCookieAttributes(attrs: CookieAttributes) {
  const parts: string[] = [];

  // path 是 cookie 身份的一部分（影响读写/删除是否命中），强制存在
  parts.push(`Path=${attrs.path}`);

  if (attrs.domain) parts.push(`Domain=${attrs.domain}`);
  if (attrs.maxAge != null) parts.push(`Max-Age=${attrs.maxAge}`);
  if (attrs.expires) parts.push(`Expires=${attrs.expires.toUTCString()}`);
  if (attrs.sameSite) parts.push(`SameSite=${attrs.sameSite}`);
  if (attrs.secure) parts.push('Secure');

  return parts.join('; ');
}

function parseCookieJar(cookie: string) {
  // document.cookie 形如：a=1; b=2; c=hello
  const map = new Map<string, string>();

  cookie.split(';').forEach((chunk) => {
    const entry = chunk.trim();
    if (!entry) return;

    const eq = entry.indexOf('=');
    if (eq <= 0) return;

    const name = entry.slice(0, eq).trim();
    const value = entry.slice(eq + 1).trim();

    // 同名 cookie 理论上可能因为 path/domain 不同而共存，但 document.cookie 可见集合受当前路径限制
    // 这里保守：后者覆盖前者
    map.set(name, value);
  });

  return map;
}

/**
 * 创建一个 StorageLike 适配器，把 cookie 伪装成“getItem/setItem/removeItem”。
 *
 * 场景与价值：
 * - 复用 useStorageState 的主逻辑（serializer/codec、默认值、同 tab 多实例同步等）；
 * - 把 cookie 的“字符串拼接/删除规则/属性一致性”封装起来，减少使用者踩坑。
 *
 * 注意：
 * - 只能读写 document.cookie 可见的 cookie（HttpOnly cookie JS 读不到，也写不了）。
 */
export function createCookieStorage(
  attrs: CookieAttributes,
  onError?: (err: unknown) => void,
): StorageLike | null {
  if (typeof document === 'undefined') return null;

  let _cookieStr = '';
  try {
    // 触发一次读取：某些环境/策略下访问 document.cookie 可能抛异常
    _cookieStr = document.cookie ?? '';
  } catch (e) {
    onError?.(e);
    return null;
  }

  const attributesStr = formatCookieAttributes(attrs);

  const storage: StorageLike = {
    getItem(key) {
      try {
        const jar = parseCookieJar(document.cookie ?? '');
        return jar.get(key) ?? null;
      } catch (e) {
        onError?.(e);
        return null;
      }
    },

    setItem(key, value) {
      // 这里的 value 已经是 useStorageState 处理后的 “encoded string”
      // （默认 urlCodec + serializer 后的结果），我们只负责按 cookie 语法写入。
      const cookieLine = `${key}=${value}; ${attributesStr}`;

      // 经验阈值：单条 cookie 通常约 4KB 限制（浏览器有差异）。
      // 这里做“预防性失败”，避免写入后截断/静默失败导致状态与存储不一致。
      if (cookieLine.length > 3800) {
        throw new Error(
          `Cookie value is too large (len=${cookieLine.length}). ` +
            `Consider storing a smaller value or using localStorage/sessionStorage.`,
        );
      }

      document.cookie = cookieLine;

      // 写入后读回校验：尽量把“静默失败/被策略拒绝”的问题显式化
      const jar = parseCookieJar(document.cookie ?? '');
      const readBack = jar.get(key) ?? null;
      if (readBack !== value) {
        throw new Error(`Failed to persist cookie "${key}" (write/read mismatch).`);
      }
    },

    removeItem(key) {
      // 删除规则：写入同名 cookie，并设置过期
      // 关键点：必须使用同样的 path/domain，否则“删不掉”（会删到另一条 path/domain 下的 cookie）
      const expires = new Date(0).toUTCString();
      const domainPart = attrs.domain ? `Domain=${attrs.domain}; ` : '';
      const sameSitePart = attrs.sameSite ? `SameSite=${attrs.sameSite}; ` : '';
      const securePart = attrs.secure ? 'Secure; ' : '';

      document.cookie = `${key}=; ${domainPart}Path=${
        attrs.path
      }; ${`Expires=${expires}; Max-Age=0; ${sameSitePart}${securePart}`.trim()}`;

      // 删除后不强制校验（某些浏览器策略/路径可见性可能导致读不到但实际删除成功）
    },
  };

  return storage;
}
