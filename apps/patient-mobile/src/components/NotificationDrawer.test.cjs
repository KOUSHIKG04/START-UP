const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real drawer effect; native hosts are mocked, not device layout.
function drawerEffect(visible, mounted) {
  const effects = [], updates = [], animations = [];
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState: () => [mounted, value => updates.push(value)],
    useEffect: effect => effects.push(effect),
    useRef: value => ({ current: value }),
    useCallback: callback => callback,
  };
  const native = {
    Dimensions: { get: () => ({ width: 390 }) },
    StyleSheet: { create: styles => styles, absoluteFill: {} },
    Animated: {
      Value: class { setValue() {} },
      timing: () => ({}),
      parallel: () => {
        const animation = {
          stopped: false,
          start(callback) { this.callback = callback; },
          stop() { this.stopped = true; },
        };
        animations.push(animation);
        return animation;
      },
    },
  };
  native.Animated.View = 'AnimatedView';
  const requireMock = id => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === 'react-native') return native;
    if (id === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 0 }) };
    if (id === '@tanstack/react-query') return {
      useQueryClient: () => ({}), useQuery: () => ({ data: [] }), useMutation: () => ({}),
    };
    if (id === '@startup/design-tokens') return { colors: { patient: {}, ui: { overlay: '#00000066' } }, fontFamilies: {}, radius: {} };
    return {};
  };
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/NotificationDrawer.tsx`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: requireMock });
  module.exports.NotificationDrawer({ visible, onClose() {} });
  const cleanup = effects[0]();
  return { animations, updates, cleanup };
}

test('reload with a hidden drawer starts no native animation', () => {
  const result = drawerEffect(false, false);
  assert.equal(result.animations.length, 0);
  assert.deepEqual(result.updates, []);
});
test('disposed closing animation cannot update drawer state', () => {
  const result = drawerEffect(false, true);
  result.cleanup();
  result.animations[0].callback({ finished: true });
  assert.equal(result.animations[0].stopped, true);
  assert.deepEqual(result.updates, []);
});
test('only a completed active close hides the drawer', () => {
  const result = drawerEffect(false, true);
  result.animations[0].callback({ finished: false });
  assert.deepEqual(result.updates, []);
  result.animations[0].callback({ finished: true });
  assert.deepEqual(result.updates, [false]);
});
