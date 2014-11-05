'use strict';
describe('ClayTemplate-Helper', function () {
    var helper;
    helper = Claylump.helper;
    describe('mix', function () {
        it('extend object', function () {
            var a, b;
            a = { foo: 'bar' };
            b = {
                foo: 'barbar',
                baz: 'qux'
            };
            helper.mix(a, b);
            assert(a.foo === 'bar');
            return assert(a.baz === 'qux');
        });
        it('extend overwrite force', function () {
            var a, b;
            a = { foo: 'bar' };
            b = {
                foo: 'barbar',
                baz: 'qux'
            };
            helper.mix(a, b, true);
            assert(a.foo === 'barbar');
            assert(a.baz === 'qux');
        });
    });
    describe('flatten', function () {
        it('shallow flatten', function () {
            var flat;
            flat = helper.flatten([
                ['foo'],
                ['bar'],
                ['baz']
            ]);
            assert(flat[0] === 'foo');
            assert(flat[1] === 'bar');
            assert(flat[2] === 'baz');
        });
        it('not deeply flatten', function () {
            var flat;
            flat = helper.flatten([
                ['foo'],
                ['bar'],
                ['baz'],
                [['qux']]
            ]);
            assert(flat[0] === 'foo');
            assert(flat[1] === 'bar');
            assert(flat[2] === 'baz');
            assert(typeof flat[3] === 'object');
            assert(flat[3][0] === 'qux');
        });
    });
    describe('clone', function () {
        it('clone object', function () {
            var clone, orig;
            orig = { foo: 'bar' };
            clone = helper.clone(orig);
            assert(clone !== orig);
            assert(clone.foo === orig.foo);
        });
        it('clone array', function () {
            var clone, orig;
            orig = [
                'foo',
                'bar',
                'baz'
            ];
            clone = helper.clone(orig);
            assert(clone !== orig);
            assert(clone.toString() === 'foo,bar,baz');
        });
    });
    describe('uniq', function () {
        it('reject duplicate item and return new array', function () {
            var orig, unique;
            orig = [
                'foo',
                'foo',
                'bar',
                'baz',
                'qux',
                'qux'
            ];
            unique = helper.uniq(orig);
            assert(unique.length === 4);
            assert(unique[0] = 'foo');
            assert(unique[1] = 'bar');
            assert(unique[2] = 'baz');
            assert(unique[3] = 'qux');
        });
        it('return new array', function () {
            var orig, unique;
            orig = [
                'foo',
                'bar',
                'baz',
                'qux'
            ];
            unique = helper.uniq(orig);
            assert(orig !== unique);
        });
    });
    describe('matchSelector', function () {
        it('match element when return true', function () {
            var div;
            div = document.createElement('div');
            div.className = 'foo';
            assert(helper.matchElement(div, '.foo'));
            div.id = 'bar';
            assert(helper.matchElement(div, '#bar'));
        });
        it('not match element when return false', function () {
            var div;
            div = document.createElement('div');
            div.className = 'qux';
            assert(!helper.matchElement(div, '.foo'));
            div.id = 'qux';
            assert(!helper.matchElement(div, '#bar'));
        });
    });
    describe('toString', function () {
        it('from primitive data', function () {
            assert(helper.toString('') === 'String');
            assert(helper.toString(1) === 'Number');
            assert(helper.toString(true) === 'Boolean');
        });
        it('from composite data', function () {
            assert(helper.toString({}) === 'Object');
            assert(helper.toString([]) === 'Array');
        });
        it('from special data', function () {
            assert(helper.toString(null) === 'Null');
            assert(helper.toString(void 0) === 'Undefined');
        });
        it('from original data', function () {
            var clayTplInstance;
            clayTplInstance = Claylump.template.create('<div></div>', {});
            assert(helper.toString(clayTplInstance) === 'Object');
        });
    });
    describe('toArray', function () {
        it('from Arguments', function () {
            var test;
            test = function () {
                var array;
                array = helper.toArray(arguments);
                assert(helper.toString(array) === 'Array');
                assert(helper.toString(arguments) === 'Arguments');
                assert(array.length === arguments.length);
            };
            test('foo', 'bar', 'baz');
        });
        it('from NodeList', function () {
            var array, list;
            list = document.querySelectorAll('*');
            array = helper.toArray(list);
            assert(helper.toString(array) === 'Array');
            assert(helper.toString(list) === 'NodeList');
            assert(array.length === list.length);
        });
    });
    describe('is...', function () {
        it('isFunction');
        it('isString');
        it('isNumber');
        it('isArray');
        it('isCustomElementName', function () {
            assert(helper.isCustomElementName('div') === false);
            assert(helper.isCustomElementName('x-foo') === true);
        });
    });
});
