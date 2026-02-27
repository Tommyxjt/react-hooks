import { SetStateAction, useCallback, useEffect, useMemo, useRef } from 'react';
import type React from 'react';
import useSafeSetState from '../useSafeSetState';
import useLatestRef from '../useLatestRef';
import { makeStorageKey } from './utils/makeStorageKey';

/**
 * Serializer：定义“业务值 T”与“可存储字符串 raw”之间的转换规则。
 *
 * 场景：
 * - storage（localStorage/sessionStorage/cookie）只存 string；
 * - 业务状态可能是对象/数组/复杂结构，需要 serialize；
 * - 读取时再 deserialize 还原。
 */
export interface Serializer<T> {
  /** 将业务值转成可存储的字符串（raw） */
  serialize: (value: T) => string;
  /** 将 raw 字符串还原为业务值 */
  deserialize: (raw: string) => T;
}

/**
 * Codec：定义“raw 字符串”与“最终写入 storage 的 stored 字符串”之间的编码规则。
 *
 * 场景：
 * - URL 编码 / Base64 / 压缩等；
 * - 只处理 string，不关心业务类型。
 */
export interface Codec {
  /** 对 raw 编码，得到最终写入 storage 的字符串 */
  encode: (raw: string) => string;
  /** 对 storage 中的字符串解码，还原 raw */
  decode: (stored: string) => string;
}

/**
 * StorageLike：抽象 localStorage/sessionStorage/cookie 等“键值存储”。
 *
 * 场景：
 * - SSR：可能没有 storage（返回 null）；
 * - Web：localStorage/sessionStorage；
 * - 其他环境：可以适配成同步接口（或由外层 hook 做异步桥接）。
 */
export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/**
 * StorageChangeDetail：描述一次“存储变更事件”的上下文信息。
 *
 * 用途：
 * 1) 同 tab：多个组件共享同一 key 时，让 UI 立即同步；
 * 2) 跨 tab：配合同步器桥接 storage 的能力，让其他 tab 的 UI 也对齐。
 */
export interface StorageChangeDetail {
  /** 完整的最终 key（由 makeStorageKey 生成） */
  storageKey: string;
  /** 业务 key（不含 prefix/schema 等），用于调试/日志更友好 */
  key: string;
  /** 变化原因：set/remove/external（external 通常来自其他 tab 或外部代码） */
  reason: 'set' | 'remove' | 'external';
  /** 变化前的“存储字符串”（编码后），不存在则为 null */
  prevRaw: string | null;
  /** 变化后的“存储字符串”（编码后），remove 时为 null */
  nextRaw: string | null;
  /**
   * 事件来源 ID：
   * - 用于过滤“自己 emit 的事件”，避免 set -> emit -> subscribe -> 再 refresh 一次的重复工作。
   */
  sourceId: string;
}

/**
 * StorageSyncer：同步器（发布/订阅）。
 *
 * 设计原则：
 * - useStorageState 内部绝不内置 syncer：必须外部传入；
 * - 由二次封装（如 useLocalStorageState）决定使用哪种 syncer；
 * - 同步范围应由 storage 自身语义决定：localStorage 可跨 tab；sessionStorage 不跨 tab；不要越权扩张。
 */
export interface StorageSyncer {
  /**
   * 订阅某个 storageKey 的变化。
   * @returns unsubscribe：取消订阅函数（组件卸载或 key 变化时调用）
   */
  subscribe: (storageKey: string, cb: (detail: StorageChangeDetail) => void) => () => void;

  /**
   * 发出一次变化事件。
   *
   * 场景（为什么必须 emit）：
   * - 本 tab 自己调用 setItem 通常不会触发浏览器 storage event；
   * - 如果不 emit，同 tab 内其他组件无法立刻同步 UI（需要它们自己 refresh 或等待其他机制）；
   * - emit 携带 nextRaw，订阅方可直接 decode/deserialize，避免再 getItem 一次。
   */
  emit: (detail: StorageChangeDetail) => void;
}

/**
 * useStorageState 配置项。
 *
 * 重要约束：
 * - prefix/schema/serializerId/codecId/serializer/codec 会影响 key 构建与数据解释：
 *   为了避免运行时切换导致误读/报错，内部会把这些配置“冻结”在首次 render。
 * - defaultValue 允许运行时变化：
 *   用于 save/load 等场景下 reset/remove 的回退目标可切换；
 *   但 defaultValue 的变化不会主动覆盖当前 value，仅影响 reset/remove/persistDefaultValue 的回退行为。
 */
export interface UseStorageStateOptions<T> {
  /** 获取存储实现；不可用时返回 null（SSR/隐私模式等） */
  storage: () => StorageLike | null;

  /** 同步器：必须外部传入（useStorageState 不内置） */
  syncer: StorageSyncer;

  /**
   * 默认值（可选）：
   * - storage 中不存在该 key 时回退到 defaultValue
   * - remove() 后回退到 defaultValue
   * - reset() 写入 defaultValue
   *
   * 若不传：回退值为 undefined（因此通常建议 T 显式允许 undefined，或业务侧保证一定传入）
   */
  defaultValue?: T | (() => T);

  /** 命名空间前缀：语义化标识，避免不同模块 key 冲突 */
  prefix?: string;

  /**
   * 显式缓存破坏（结构升级/不兼容时切 schema）：
   * 类比打包产物 hash 变更让浏览器不再读旧缓存。
   */
  schema?: string;

  /**
   * 序列化策略标识（参与 key 后缀）：
   * 用于“正确性隔离”，避免新策略读旧策略数据。
   */
  serializerId?: string;

  /**
   * 编码策略标识（参与 key 后缀）：
   * 用于“正确性隔离”，避免新策略读旧策略数据。
   */
  codecId?: string;

  /** prefix 与 key 的分隔符（可选，默认值由 makeStorageKey 决定） */
  separator?: string;

  /** suffix 分隔符（可选，默认值由 makeStorageKey 决定） */
  suffixSeparator?: string;

  /**
   * 自定义序列化（默认 JSON.stringify/parse）
   * 注意：若启用自定义 serializer，推荐配套 serializerId + schema 做显式升级与隔离。
   */
  serializer?: Serializer<T>;

  /**
   * 自定义编码（默认 identity：x => x）
   * 注意：若启用自定义 codec，推荐配套 codecId + schema 做显式升级与隔离。
   */
  codec?: Codec;

  /**
   * 是否初始化时从 storage 读取：
   * - true：lazy initializer 阶段读取（读是纯函数，不做写入/emit）
   * - false：直接用 defaultValue 渲染（常用于“先渲染默认值，再自行控制读入时机”）
   */
  initializeWithValue?: boolean;

  /**
   * storage 缺失该 key 时，是否把 defaultValue 落盘：
   * - 在 effect（commit 后）执行，避免 render 阶段副作用；
   * - 并发挂载时会二次检查 key 是否已被别人写入，避免覆盖。
   */
  persistDefaultValue?: boolean;

  /**
   * 判断新旧值是否相等：
   * - 相等则不触发 state 更新（减少无意义 rerender）
   * - 默认 Object.is
   */
  equals?: (a: T, b: T) => boolean;

  /** decode/deserialize 或 storage 读写错误回调 */
  onError?: (err: unknown) => void;
}

/** 解析 defaultValue（支持惰性函数） */
function resolveDefault<T>(dv: T | (() => T)): T {
  return typeof dv === 'function' ? (dv as () => T)() : dv;
}

/** 生成事件源 ID，用于过滤“自己 emit 的事件” */
function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * 默认 JSON serializer。
 *
 * 注意：
 * - JSON.stringify(undefined) 会返回 undefined（不是 string），因此默认 JSON serializer 无法安全存储 undefined；
 * - 本实现会对“默认 JSON + 值为 undefined”的情况做特殊处理（见 set/remove/persistDefaultValue 注释）。
 */
const defaultJsonSerializer: Serializer<any> = {
  serialize: (v) => JSON.stringify(v),
  deserialize: (raw) => JSON.parse(raw),
};

/** 默认 codec：不做任何编码/解码 */
const identityCodec: Codec = {
  encode: (x) => x,
  decode: (x) => x,
};

/**
 * useStorageState：以 storage 为后端的 state，并通过 syncer 做同步。
 *
 * 核心数据流（同 tab 两组件共享）：
 * 1) A set(x) -> serialize/encode -> storage.setItem
 * 2) A emit(detail)：通知其他订阅者“这里发生了变更”
 * 3) B subscribe 收到 detail -> decode/deserialize(detail.nextRaw) -> equals -> setState
 *
 * 轻量监控：
 * - Hook 内置订阅保证 state 与 storage 会自动对齐；
 * - 外部仅用 useEffect(cb, [value]) 就能监听“对齐后的状态变化”。
 */
function useStorageState<T>(
  key: string,
  options: UseStorageStateOptions<T>,
): readonly [
  T,
  {
    set: React.Dispatch<SetStateAction<T>>;
    remove: () => void;
    reset: () => void;
  },
] {
  const {
    storage,
    defaultValue,
    initializeWithValue = true,
    persistDefaultValue = false,
    equals,
    onError,
    syncer,
  } = options;

  /**
   * resolvedDefault：允许运行时变化的默认值。
   * - defaultValue 不传：回退值为 undefined
   * - defaultValue 传函数：惰性求值
   */
  const resolvedDefault = useMemo(() => {
    return defaultValue === undefined ? (undefined as unknown as T) : resolveDefault(defaultValue);
  }, [defaultValue]);

  /**
   * defaultRef：始终指向“最新默认值”。
   * - remove/reset 的回退值来自这里；
   * - persistDefaultValue 也会落盘这里的值。
   */
  const defaultRef = useRef<T>(resolvedDefault);
  defaultRef.current = resolvedDefault;

  /**
   * frozenRef：冻结 keyOptions/serializer/codec（正确性优先）。
   * - 避免运行时切换策略导致同 key 的旧数据被误解码/报错。
   */
  const frozenRef = useRef<{
    keyOptions: {
      prefix?: string;
      schema?: string;
      serializerId?: string;
      codecId?: string;
      separator?: string;
      suffixSeparator?: string;
    };
    serializer: Serializer<T>;
    codec: Codec;
    /** 标记：是否使用默认 JSON serializer（用于处理 undefined 的特殊语义） */
    isDefaultJsonSerializer: boolean;
  } | null>(null);

  if (!frozenRef.current) {
    const usingCustomSerializer = !!options.serializer;
    frozenRef.current = {
      keyOptions: {
        prefix: options.prefix,
        schema: options.schema,
        serializerId: options.serializerId,
        codecId: options.codecId,
        separator: options.separator,
        suffixSeparator: options.suffixSeparator,
      },
      serializer: options.serializer ?? (defaultJsonSerializer as Serializer<T>),
      codec: options.codec ?? identityCodec,
      isDefaultJsonSerializer: !usingCustomSerializer,
    };
  }

  const frozen = frozenRef.current;

  /** 最终 storageKey（由 makeStorageKey 按规范拼接；缺省段不会产生多余分隔符） */
  const storageKey = useMemo(() => makeStorageKey(key, frozen.keyOptions), [key, frozen]);

  /** 本实例事件源 ID：用于过滤“自己 emit 的事件” */
  const sourceIdRef = useRef<string>(randomId());

  /**
   * readFromStorage：纯读（无副作用）。
   *
   * 为什么必须纯读？
   * - lazy initializer 在 render 阶段执行；
   * - React StrictMode 下 render 可能被重复调用；
   * - 如果读函数里做写入/emit，会导致重复落盘/重复广播。
   */
  const readFromStorage = useCallback(
    (s?: StorageLike | null): T => {
      const store = s ?? storage();
      if (!store) return defaultRef.current;

      try {
        const stored = store.getItem(storageKey);
        if (stored == null) return defaultRef.current;

        const raw = frozen.codec.decode(stored);
        return frozen.serializer.deserialize(raw);
      } catch (e) {
        // 场景：数据损坏/策略不匹配/JSON.parse 抛错等
        onError?.(e);
        return defaultRef.current;
      }
    },
    [storage, storageKey, onError, frozen],
  );

  /**
   * initHadStorageRef：记录初始化时 storage 是否可用（用于 SSR/hydration 补读一次）。
   * - init 不可用：首屏用 default 渲染，hydrate 后补读一次对齐 storage。
   * - init 可用：无需额外 refresh，避免重复 getItem/deserialize。
   */
  const initHadStorageRef = useRef<boolean | null>(null);

  const [value, safeSetValue] = useSafeSetState<T>(() => {
    if (!initializeWithValue) return defaultRef.current;

    const s = storage();
    initHadStorageRef.current = !!s;
    return readFromStorage(s);
  });

  /**
   * valueRef：始终是最新 state（render 同步更新）。
   * 场景：set(prev => next) 需要拿到“最新 prev”，避免 effect 同步 ref 的窗口期。
   */
  const valueRef = useLatestRef<T>(value);

  /** 用于内部统一的相等判断（减少重复分支） */
  const isSame = useCallback((a: T, b: T) => (equals ? equals(a, b) : Object.is(a, b)), [equals]);

  /**
   * refresh：从 storage 拉取并对齐到 state（带 equals）。
   * 场景：外部变化（其他组件/其他 tab）触发后，需要把 UI 对齐到真实持久化值。
   */
  const refresh = useCallback(() => {
    const next = readFromStorage();
    safeSetValue((prev) => (isSame(prev, next) ? prev : next));
  }, [readFromStorage, safeSetValue, isSame]);

  /**
   * doRemove：抽出的 remove 核心逻辑，供 remove() 与 set(undefined)（默认 JSON）复用。
   *
   * 场景：默认 JSON 无法安全持久化 undefined：
   * - 如果用户 set(undefined)，更符合直觉的语义是“删除该 key”（缺省=不存在）；
   * - 同时要 emit(reason='remove')，让其他订阅者回退默认值，保持 UI 一致。
   */
  const doRemove = useCallback(() => {
    const s = storage();
    const dv = defaultRef.current;

    if (!s) {
      // storage 不可用：退化为“仅内存回退”
      valueRef.current = dv;
      safeSetValue(dv);
      return;
    }

    try {
      const prevRaw = s.getItem(storageKey);
      s.removeItem(storageKey);

      // 为什么要 emit：
      // - 同 tab：其他组件不会因本 tab setItem/removeItem 自动收到浏览器事件；
      // - emit 让订阅者立刻回退默认值，UI 同步且可预测。
      syncer.emit({
        storageKey,
        key,
        reason: 'remove',
        prevRaw,
        nextRaw: null,
        sourceId: sourceIdRef.current,
      });

      valueRef.current = dv;
      safeSetValue(dv);
    } catch (e) {
      onError?.(e);
    }
  }, [storage, storageKey, syncer, key, safeSetValue, onError, valueRef]);

  /**
   * subscribe：Hook 内置订阅（核心点）。
   *
   * 重点（为什么要内置）：
   * - 内置 subscribe 保证“state 与 storage 同步对齐”这一能力是默认存在的；
   * - 外部只用 useEffect(cb, [value]) 就能完成轻量监控；
   * - 外部直接订阅 syncer 仅用于复杂监听（需要 detail 的上下文信息）。
   */
  useEffect(() => {
    return syncer.subscribe(storageKey, (detail) => {
      // 过滤自己 emit 的事件：自己 set/remove 已经直接更新了 state，无需再走订阅逻辑
      if (detail.sourceId === sourceIdRef.current) return;

      safeSetValue((prev) => {
        // remove 或 nextRaw=null：订阅者回退默认值（用于“清空配置/恢复初始”等场景）
        if (detail.nextRaw == null) {
          const next = defaultRef.current;
          return isSame(prev, next) ? prev : next;
        }

        try {
          // 直接用 detail.nextRaw：避免再次 getItem（减少 IO/避免中间态）
          const raw = frozen.codec.decode(detail.nextRaw);
          const next = frozen.serializer.deserialize(raw);
          return isSame(prev, next) ? prev : next;
        } catch (e) {
          // 外部写入不匹配/数据损坏：报错但不强制回退默认，避免“坏事件把 UI 清空”
          onError?.(e);
          return prev;
        }
      });
    });
  }, [syncer, storageKey, safeSetValue, isSame, onError, frozen]);

  /**
   * hydration 补读：仅当 init 时 storage 不可用才 refresh 一次。
   * 场景：SSR 首屏用 default 渲染，hydrate 后对齐真实持久化值。
   */
  useEffect(() => {
    if (!initializeWithValue) return;
    if (initHadStorageRef.current === false) refresh();
  }, [initializeWithValue, refresh, storageKey]);

  /**
   * persistDefaultValue：storage 缺失时把默认值落盘（在 effect 中执行）。
   *
   * 场景（为什么要落盘）：
   * - 你希望默认配置也能被其他组件/其他路由/其他 tab 读取；
   * - 但写入必须在 commit 后：避免 StrictMode render 双调用导致重复落盘/重复广播。
   */
  useEffect(() => {
    if (!persistDefaultValue) return;

    const s = storage();
    if (!s) return;

    // defaultValue 未提供时，回退值为 undefined：
    // - 默认 JSON serializer 无法安全 stringify(undefined)（不是 string），因此不做落盘更符合直觉
    // - 若用户自定义 serializer 能处理 undefined，则由用户自己保证 serialize 返回 string
    if (defaultValue === undefined && frozen.isDefaultJsonSerializer) return;

    try {
      const existing = s.getItem(storageKey);
      if (existing != null) return; // 已存在：尊重已有值，不覆盖

      const raw = frozen.serializer.serialize(defaultRef.current);
      const encoded = frozen.codec.encode(raw);

      // 二次检查：并发挂载时，避免覆盖别人刚写入的值
      const recheck = s.getItem(storageKey);
      if (recheck != null) return;

      s.setItem(storageKey, encoded);

      // emit：让同 tab 订阅者立刻读取到“默认值已落盘”（UI/逻辑一致）
      syncer.emit({
        storageKey,
        key,
        reason: 'set',
        prevRaw: null,
        nextRaw: encoded,
        sourceId: sourceIdRef.current,
      });
    } catch (e) {
      onError?.(e);
    }
  }, [
    persistDefaultValue,
    storage,
    storageKey,
    syncer,
    key,
    onError,
    frozen,
    resolvedDefault,
    defaultValue,
  ]);

  /**
   * set：写入新值（state + storage + emit）。
   *
   * 同值短路（为什么更严格）：
   * - 只看内存相等不够：如果 storage 被外部清掉，内存仍是对的，但需要补写；
   * - 因此必须同时满足：sameValue && prevRaw === encoded 才能跳过写入/广播。
   */
  const set = useCallback<React.Dispatch<SetStateAction<T>>>(
    (next) => {
      const prev = valueRef.current;
      const computed = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;

      // 默认 JSON serializer 无法安全存 undefined：
      // - set(undefined) 退化为 remove（缺省=不存在），并广播 remove 事件保证订阅者同步回退
      if ((computed as any) === undefined && frozen.isDefaultJsonSerializer) {
        doRemove();
        return;
      }

      const s = storage();
      if (!s) {
        // storage 不可用：退化为“仅内存状态”
        valueRef.current = computed;
        safeSetValue(computed);
        return;
      }

      try {
        const raw = frozen.serializer.serialize(computed);
        const encoded = frozen.codec.encode(raw);

        const prevRaw = s.getItem(storageKey);
        const sameValue = isSame(prev, computed);

        // 同值短路：减少无意义 setItem + emit（降低 IO/广播成本）
        if (sameValue && prevRaw === encoded) return;

        s.setItem(storageKey, encoded);

        // emit：通知其他订阅者用 nextRaw 直接更新 UI（无需 getItem）
        syncer.emit({
          storageKey,
          key,
          reason: 'set',
          prevRaw,
          nextRaw: encoded,
          sourceId: sourceIdRef.current,
        });

        // 本地立即更新：响应用户操作
        valueRef.current = computed;
        safeSetValue(computed);
      } catch (e) {
        onError?.(e);
      }
    },
    [storage, storageKey, safeSetValue, syncer, key, onError, frozen, isSame, valueRef, doRemove],
  );

  /**
   * remove：删除 key，并回退默认值（同时 emit 通知订阅者）。
   */
  const remove = useCallback(() => {
    doRemove();
  }, [doRemove]);

  /**
   * reset：重置为默认值（等价于 set(defaultValue)）。
   *
   * 注意：
   * - 如果 defaultValue 缺省且使用默认 JSON serializer，defaultRef.current 为 undefined，
   *   则 reset 会退化为 remove（因为 set(undefined) 会走 doRemove 语义）。
   * - 这更符合“缺省=不存在”的直觉。
   */
  const reset = useCallback(() => {
    set(defaultRef.current);
  }, [set]);

  return [value, { set, remove, reset }] as const;
}

export default useStorageState;
