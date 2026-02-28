import type { StorageChangeDetail } from '../../useStorageState';
import { cookieSyncer } from './cookieSyncer';

/**
 * cookie 跨 tab “信号语法糖”（可选）。
 *
 * 设计目标：
 * - cookie 天然跨 tab 共享，但没有“变更通知”，其他 tab 通常要等下一次请求/交互才更新 UI；
 * - signal 做的事只有一个：让其他 tab 立刻知道“cookie 变了，该重新读并更新 state 了”；
 * - cookie 仍是事实源；signal 不改变 cookie 的原生语义，只补一条通知链路。
 *
 * 默认实现：
 * - 优先 BroadcastChannel（同源多 tab 原生消息通道）
 * - 若不可用，则降级为不启用 signal（保持可预测，不强行引入轮询）
 */

type SignalMessage = Pick<
  StorageChangeDetail,
  'storageKey' | 'key' | 'reason' | 'prevRaw' | 'nextRaw'
> & {
  /** 用于忽略“自己发送的消息” */
  tabId: string;
};

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const TAB_ID = randomId();
const channels = new Map<string, BroadcastChannel>();

function canUseBroadcastChannel() {
  return typeof BroadcastChannel !== 'undefined';
}

/**
 * 确保某个频道名只绑定一次 listener。
 * - 任何一个 useCookieState 实例开启 signal 后，都可以开启接收；
 * - 同 tab 内其他实例即使没开启 signal，也会因为订阅 cookieSyncer 而同步 state。
 */
export function ensureCookieSignal(channelName: string) {
  if (!canUseBroadcastChannel()) return;

  if (channels.has(channelName)) return;

  const ch = new BroadcastChannel(channelName);
  channels.set(channelName, ch);

  ch.addEventListener('message', (ev) => {
    const data = ev.data as SignalMessage | undefined;
    if (!data) return;
    if (data.tabId === TAB_ID) return;

    // 将跨 tab 信号注入本 tab 的 cookieSyncer，触发 useStorageState 内置订阅对齐 state
    cookieSyncer.emit({
      storageKey: data.storageKey,
      key: data.key,
      reason: 'external',
      prevRaw: data.prevRaw,
      nextRaw: data.nextRaw,
      sourceId: '__external_signal__',
    });
  });
}

/**
 * 向其他 tab 广播“cookie 已变更”的信号。
 * - 只发送必要字段（storageKey/prevRaw/nextRaw），让对端能直接 decode/deserialize
 * - 同时携带 tabId，避免回声导致同 tab 重复注入 external
 */
export function broadcastCookieSignal(channelName: string, detail: StorageChangeDetail) {
  if (!canUseBroadcastChannel()) return;

  const ch = channels.get(channelName);
  if (!ch) return;

  const msg: SignalMessage = {
    storageKey: detail.storageKey,
    key: detail.key,
    reason: detail.reason,
    prevRaw: detail.prevRaw,
    nextRaw: detail.nextRaw,
    tabId: TAB_ID,
  };

  ch.postMessage(msg);
}
