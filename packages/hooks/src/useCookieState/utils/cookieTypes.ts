/**
 * Cookie 属性选项（用于拼接 document.cookie 写入字符串）。
 *
 * 设计说明：
 * - cookie 不只是“存值”，还需要一组属性来定义传播范围与安全策略；
 * - 为了避免“同名 cookie 但 path/domain 不一致导致删不掉/读不到”的坑，
 *   useCookieState 会在实例初始化时冻结这些配置，之后 set/remove/reset 都使用同一套属性。
 */
export interface CookieAttributes {
  /** 默认固定为 '/'（最常用且最不容易踩坑） */
  path: string;

  /** 可选：用于跨子域共享（例如 .example.com）。不设则为当前 host。 */
  domain?: string;

  /**
   * SameSite 策略：
   * - Lax：默认常见选择
   * - Strict：更严格
   * - None：跨站需要；通常必须配合 secure=true
   */
  sameSite?: 'Lax' | 'Strict' | 'None';

  /** 是否仅在 https 下发送（SameSite=None 时通常要求 true） */
  secure?: boolean;

  /** 过期时间（UTC） */
  expires?: Date;

  /** 过期秒数（优先级通常高于 expires；由使用方决定传哪个） */
  maxAge?: number;
}
