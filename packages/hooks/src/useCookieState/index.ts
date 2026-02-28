import type React from 'react';
import useStorageState from '../useStorageState';
import type {
  StorageSyncer,
  Codec,
  Serializer,
  UseStorageStateOptions,
  StorageChangeDetail,
} from '../useStorageState';
import { createCookieStorage } from './utils/createCookieStorage';
import { cookieSyncer } from './utils/cookieSyncer';
import { ensureCookieSignal, broadcastCookieSignal } from './utils/cookieSignal';
import type { CookieAttributes } from './utils/cookieTypes';
import { urlCodec } from './utils/urlCodec';

/**
 * Cookie 跨 tab 信号模式：
 * - none：默认不做跨 tab 通知（保持 cookie 原生“无事件”体验）
 * - broadcast：使用 BroadcastChannel 作为通知通道（语法糖，不改变 cookie 事实源）
 */
export type CookieSignalMode = 'none' | 'broadcast';

export interface UseCookieStateOptions<T>
  extends Omit<UseStorageStateOptions<T>, 'storage' | 'syncer' | 'codec'> {
  /**
   * cookie 属性（实例内冻结）：
   * - 默认 path 固定为 '/'
   * - 其他项可选（domain/sameSite/secure/maxAge/expires）
   */
  cookie?: Partial<Omit<CookieAttributes, 'path'>> & { path?: string };

  /**
   * 跨 tab 信号语法糖（可选）：
   * - 开启后：本 tab set/remove 会广播通知，其他 tab 立刻同步 UI（无需等待下一次请求/交互）
   * - 默认关闭：保持 cookie 原生“无变更通知”的体验
   */
  signal?: CookieSignalMode;

  /**
   * BroadcastChannel 频道名：
   * - 同源下 name 相同的 tab 会互相收发消息
   * - 用于微前端/多业务隔离（避免不同业务线互相通知）
   */
  signalChannelName?: string;

  /**
   * codec 注入点（可选）：
   * - cookie 默认使用 URL 编码（encodeURIComponent/decodeURIComponent）
   * - 如果你自定义 codec，请确保它能生成合法的 cookie value
   */
  codec?: Codec;

  /** serializer 注入点（透传，仅为 hover 友好说明；实际由 UseStorageStateOptions 处理） */
  serializer?: Serializer<T>;
}

const DEFAULT_SIGNAL_CHANNEL = '@tx-labs/react-hooks:cookie';

/**
 * useCookieState：以 cookie 为后端的状态管理。
 *
 * 设计要点（与 local/session 的差异）：
 * - cookie 需要额外的属性元数据（path/domain/samesite/secure/maxAge/expires）；
 * - 默认 path 使用 '/'，并默认启用 URL 编码（更贴合 cookie 介质）；
 * - cookie 无原生跨 tab 事件：如需“另一 tab 立即刷新 UI”，可开启 signal（BroadcastChannel 语法糖）。
 */
function useCookieState<T>(
  key: string,
  options: UseCookieStateOptions<T> = {},
): readonly [
  T,
  {
    set: React.Dispatch<React.SetStateAction<T>>;
    remove: () => void;
    reset: () => void;
  },
] {
  const {
    cookie,
    signal = 'none',
    signalChannelName = DEFAULT_SIGNAL_CHANNEL,
    codec,
    onError,
    ...rest
  } = options;

  // cookie 属性默认值：path 固定为 '/'
  const attrs: CookieAttributes = {
    path: cookie?.path ?? '/',
    domain: cookie?.domain,
    sameSite: cookie?.sameSite,
    secure: cookie?.secure,
    expires: cookie?.expires,
    maxAge: cookie?.maxAge,
  };

  // signal 开启时绑定接收端 listener（只要本 tab 任意实例开启即可）
  if (signal === 'broadcast') {
    ensureCookieSignal(signalChannelName);
  }

  // 关键：storage() 每次返回同一个 adapter（useStorageState 内部会处理读写异常与 state 对齐）
  // 这里通过闭包冻结 attrs（实例内稳定），避免运行时切换导致删不掉/读不到。
  const storage = () => createCookieStorage(attrs, onError);

  /**
   * syncer 注入：
   * - 同 tab 多实例同步：统一走 cookieSyncer
   * - 可选跨 tab：在 emit 后广播 signal（语法糖），让其他 tab 立刻注入 external 并对齐 state
   */
  const syncer: StorageSyncer =
    signal === 'broadcast'
      ? {
          subscribe: cookieSyncer.subscribe,
          emit(detail: StorageChangeDetail) {
            // 先同步本 tab 内其他实例（多实例一致性）
            cookieSyncer.emit(detail);

            // 再广播跨 tab 信号（语法糖）：其他 tab 收到后会注入 external → 触发对齐与 rerender
            broadcastCookieSignal(signalChannelName, detail);
          },
        }
      : cookieSyncer;

  return useStorageState<T>(key, {
    ...rest,
    // cookie 的默认 codec 为 URL 编码；如果用户自定义 codec，则以用户为准
    codec: codec ?? urlCodec,
    storage,
    syncer,
    onError,
  });
}

export default useCookieState;
