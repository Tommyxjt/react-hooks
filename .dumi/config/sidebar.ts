interface SidebarItem {
  title: string;
  link: string;
}
interface SidebarGroup {
  title: string;
  children: SidebarItem[];
}

function kebab(s: string) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function hook(name: string, override?: Partial<SidebarItem>): SidebarItem {
  return {
    title: override?.title ?? name,
    link: override?.link ?? `/hooks/${kebab(name)}`,
  };
}

function group(title: string, hooks: Array<string | SidebarItem>): SidebarGroup {
  return { title, children: hooks.map((x) => (typeof x === 'string' ? hook(x) : x)) };
}

export default {
  '/hooks': [
    group('基础积木', [
      'useLatestRef',
      'useUnmount',
      'useIsMounted',
      'useStableCallback',
      'useUpdateEffect',
      'useTargetEffect',
      'useElementInstance',
    ]),
    group('状态相关', [
      'useBoolean',
      'useToggle',
      'useSafeSetState',
      'usePrevious',
      'useMergeState',
      'useMap',
      'useSet',
      'useArray',
    ]),
    group('事件与订阅', ['createEventBus', 'useEventBus']),
    group('useStorage 系列', [
      'useLocalStorageState',
      'useSessionStorageState',
      'useCookieState',
      'useStorageState',
    ]),
    group('useDebounce 系列', [
      'useDebouncedState',
      'useDebouncedClick',
      'useDebouncedCallback',
      'useDebouncedEffect',
      'useDebounceController',
    ]),
    group('useRaf 系列', [
      'useRaf',
      'useRafLoop',
      'useRafRef',
      'useRafState',
      'useRafThrottledEffect',
      'useRafScheduler',
    ]),
    group('DOM 相关', [
      'useSafeLayoutEffect',
      'useEventListener',
      'useTitle',
      'useDocumentVisibility',
      'useClickAway',
      'useScroll',
      'useSize',
    ]),
    group('逃生舱', ['useForceUpdate']),
  ],
};
