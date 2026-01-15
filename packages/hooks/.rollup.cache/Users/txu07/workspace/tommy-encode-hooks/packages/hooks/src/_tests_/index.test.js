import * as encodeHooks from '..';
describe('encodeHooks', function () {
    test('exports modules should be defined', function () {
        Object.keys(encodeHooks).forEach(function (module) {
            expect(encodeHooks[module]).toBeDefined();
        });
    });
});
//# sourceMappingURL=index.test.js.map