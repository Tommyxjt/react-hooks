# @tx-labs/react-hooks

[![NPM version](https://img.shields.io/npm/v/%40tx-labs%2Freact-hooks.svg?style=flat)](https://npmjs.org/package/@tx-labs/react-hooks)
[![NPM downloads](https://img.shields.io/npm/dm/%40tx-labs%2Freact-hooks.svg?style=flat)](https://npmjs.org/package/@tx-labs/react-hooks)
[![CI](https://github.com/Tommyxjt/react-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/Tommyxjt/react-hooks/actions/workflows/ci.yml)

A small, practical React Hooks library built with TypeScript. Includes common state/lifecycle helpers, debounce/raf utilities, storage hooks, event bus, and DOM-related hooks.

- ✅ TypeScript typings
- ✅ ESM + CJS outputs (tree-shake friendly)
- ✅ React >= 16.8

## Installation

```bash

# npm

npm i @tx-labs/react-hooks

# pnpm

pnpm add @tx-labs/react-hooks

# yarn

yarn add @tx-labs/react-hooks
```

## Quick Start

```tsx
import React from 'react';
import { useToggle, useDebouncedCallback } from '@tx-labs/react-hooks';

export default function Demo() {
  const [on, { toggle }] = useToggle(false);
  const log = useDebouncedCallback((v: boolean) => console.log('on =', v), 300);

  return (
    <button
      onClick={() => {
        toggle();
        log(!on);
      }}
    >
      {on ? 'ON' : 'OFF'}
    </button>
  );
}
```

## Hooks

> The list below reflects what is currently exported from the package entry.

### Basic utilities

- `useLatestRef`
- `useUnmount`
- `useStableCallback`
- `useUpdateEffect`
- `useIsMounted`
- `useElementInstance`
- `useTargetEffect`

### State helpers

- `useToggle`
- `useBoolean`
- `useSafeSetState`
- `usePrevious`
- `useMergeState`
- `useMap`
- `useSet`
- `useArray`

### Event & subscription

- `createEventBus`
- `useEventBus`

### Storage

- `useStorageState`
- `useLocalStorageState`
- `useSessionStorageState`
- `useCookieState`

### Debounce

- `useDebounceController`
- `useDebouncedState`
- `useDebouncedClick`
- `useDebouncedCallback`
- `useDebouncedEffect`

### RAF utilities

- Drivers: `createFrameDriver`, `createRafDriver`, `createTimeoutDriver`
- Hooks: `useRaf`, `useRafLoop`, `useRafRef`, `useRafState`, `useRafThrottledEffect`
- Core: `useRafScheduler`

### DOM

- `useSafeLayoutEffect`
- `useEventListener`
- `useTitle`
- `useDocumentVisibility`
- `useClickAway`
- `useScroll`
- `useSize`

### Escape hatches

- `useForceUpdate`

## Development

```bash

# install

pnpm install

# dev docs (dumi)

pnpm start

# test

pnpm test

# build package only

pnpm build:pkg

# or: pnpm --filter @tx-labs/react-hooks build

# build docs only

pnpm build:docs

# build both (package + docs)

pnpm build
```

## License

MIT
