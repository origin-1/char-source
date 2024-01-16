'use strict';

const assert                                        = require('node:assert/strict');
const { inspect }                                   = require('node:util');
const createCodeUnit                                = require('./lib/code-unit');
const { parseStringLiteral, parseTemplateToken }    = require('./lib/parse');

describe
(
    'parseStringLiteral',
    () =>
    {
        const testOk =
        (source, expectedUnits, expectedUsedFeatures) =>
        () =>
        {
            const codeUnits = parseStringLiteral(source);
            const expectedCharCount = expectedUnits.length;
            assert.equal(codeUnits.length, expectedCharCount);
            for (let index = 0; index < expectedCharCount; ++index)
            {
                const codeUnit = codeUnits[index];
                const expectedUnit = expectedUnits[index];
                const message = `Expected values to be strictly equal at index ${index}`;
                if ('char' in expectedUnit)
                    assert.equal(codeUnit.char,     expectedUnit.char,      message);
                if ('charCode' in expectedUnit)
                    assert.equal(codeUnit.charCode, expectedUnit.charCode,  message);
                assert.equal(codeUnit.start,        expectedUnit.start,     message);
                assert.equal(codeUnit.source,       expectedUnit.source,    message);
                assert.equal(codeUnit.surrogate,    expectedUnit.surrogate, message);
            }
            assert.deepEqual(codeUnits.usedFeatures, expectedUsedFeatures);
        };

        it
        (
            'works with an empty string',
            testOk
            (
                '""',
                [],
                { codePointEscape: false, lineTerminator: false, octalEscape: false },
            ),
        );

        it
        (
            'works with surrogate pairs',
            testOk
            (
                '"a𝄞z"',
                [
                    { char: 'a',        start: 1, source: 'a',      surrogate: undefined },
                    { charCode: 0xd834, start: 2, source: '\ud834', surrogate: undefined },
                    { charCode: 0xdd1e, start: 3, source: '\udd1e', surrogate: undefined },
                    { char: 'z',        start: 4, source: 'z',      surrogate: undefined },
                ],
                { codePointEscape: false, lineTerminator: false, octalEscape: false },
            ),
        );

        it
        (
            'works with escape sequences for single characters',
            testOk
            (
                '"a\\x40\\u231Bz"',
                [
                    { char: 'a', start: 1,  source: 'a',        surrogate: undefined },
                    { char: '@', start: 2,  source: '\\x40',    surrogate: undefined },
                    { char: '⌛', start: 6, source: '\\u231B',  surrogate: undefined },
                    { char: 'z', start: 12, source: 'z',        surrogate: undefined },
                ],
                { codePointEscape: false, lineTerminator: false, octalEscape: false },
            ),
        );

        it
        (
            'works with escape sequences for code points',
            testOk
            (
                '"a\\u{ffff}\\u{10000}\\u{10ffff}z"',
                [
                    { char: 'a',        start: 1,   source: 'a',            surrogate: undefined },
                    { charCode: 0xffff, start: 2,   source: '\\u{ffff}',    surrogate: undefined },
                    { charCode: 0xd800, start: 10,  source: '\\u{10000}',   surrogate: 'high' },
                    { charCode: 0xdc00, start: 10,  source: '\\u{10000}',   surrogate: 'low' },
                    { charCode: 0xdbff, start: 19,  source: '\\u{10ffff}',  surrogate: 'high' },
                    { charCode: 0xdfff, start: 19,  source: '\\u{10ffff}',  surrogate: 'low' },
                    { char: 'z',        start: 29,  source: 'z',            surrogate: undefined },
                ],
                { codePointEscape: true, lineTerminator: false, octalEscape: false },
            ),
        );

        it
        (
            'works with line continuations',
            testOk
            (
                '"a\\\n\\\r\n\\\u2028\\\u2029z"',
                [
                    { char: 'a', start: 1,  source: 'a', surrogate: undefined },
                    { char: 'z', start: 11, source: 'z', surrogate: undefined },
                ],
                { codePointEscape: false, lineTerminator: false, octalEscape: false },
            ),
        );

        it
        (
            'works with simple escape sequences',
            testOk
            (
                '"\\"\\0\\b\\f\\n\\r\\t\\v"',
                [
                    { char: '"',    source: '\\"' },
                    { char: '\0',   source: '\\0' },
                    { char: '\b',   source: '\\b' },
                    { char: '\f',   source: '\\f' },
                    { char: '\n',   source: '\\n' },
                    { char: '\r',   source: '\\r' },
                    { char: '\t',   source: '\\t' },
                    { char: '\v',   source: '\\v' },
                ]
                .map
                (
                    (expectedUnit, index) =>
                    ({ ...expectedUnit, start: 1 + index * 2, surrogate: undefined }),
                ),
                { codePointEscape: false, lineTerminator: false, octalEscape: false },
            ),
        );

        it
        (
            'works with a <LS> character outside of a line continuation',
            testOk
            (
                '"a\u2028z"',
                [
                    { char: 'a', start: 1, source: 'a', surrogate: undefined },
                    { charCode: 0x2028, start: 2, source: '\u2028', surrogate: undefined },
                    { char: 'z', start: 3, source: 'z', surrogate: undefined },
                ],
                { codePointEscape: false, lineTerminator: true, octalEscape: false },
            ),
        );

        it
        (
            'works with a <PS> character outside of a line continuation',
            testOk
            (
                '"a\u2029z"',
                [
                    { char: 'a', start: 1, source: 'a', surrogate: undefined },
                    { charCode: 0x2029, start: 2, source: '\u2029', surrogate: undefined },
                    { char: 'z', start: 3, source: 'z', surrogate: undefined },
                ],
                { codePointEscape: false, lineTerminator: true, octalEscape: false },
            ),
        );

        it
        (
            'works with octal escape sequences',
            testOk
            (
                '"\\0123\\456"',
                [
                    { charCode: 0o12,   source: '\\012',    start: 1,   surrogate: undefined },
                    { char: '3',        source: '3',        start: 5,   surrogate: undefined },
                    { charCode: 0o45,   source: '\\45',     start: 6,   surrogate: undefined },
                    { char: '6',        source: '6',        start: 9,   surrogate: undefined },
                ],
                { codePointEscape: false, lineTerminator: false, octalEscape: true },
            ),
        );

        it
        (
            'works with an escaped 7',
            testOk
            (
                '"\\7"',
                [{ charCode: 0o7, source: '\\7', start: 1, surrogate: undefined }],
                { codePointEscape: false, lineTerminator: false, octalEscape: true },
            ),
        );

        it
        (
            'works with an escaped 8',
            testOk
            (
                '"\\8"',
                [{ char: '8', source: '\\8', start: 1, surrogate: undefined }],
                { codePointEscape: false, lineTerminator: false, octalEscape: true },
            ),
        );

        it
        (
            'works with an escaped 9',
            testOk
            (
                '"\\9"',
                [{ char: '9', source: '\\9', start: 1, surrogate: undefined }],
                { codePointEscape: false, lineTerminator: false, octalEscape: true },
            ),
        );

        it
        (
            'works with the escaped sequence "00"',
            testOk
            (
                '"\\00"',
                [{ charCode: 0, source: '\\00', start: 1, surrogate: undefined }],
                { codePointEscape: false, lineTerminator: false, octalEscape: true },
            ),
        );

        it
        (
            'works with an escaped 0 followed by 8',
            testOk
            (
                '"\\08"',
                [
                    { charCode: 0,  source: '\\0',  start: 1, surrogate: undefined },
                    { char: '8',    source: '8',    start: 3, surrogate: undefined },
                ],
                { codePointEscape: false, lineTerminator: false, octalEscape: true },
            ),
        );

        it
        (
            'works with an escaped 0 followed by 9',
            testOk
            (
                '"\\09"',
                [
                    { charCode: 0,  source: '\\0',  start: 1, surrogate: undefined },
                    { char: '9',    source: '9',    start: 3, surrogate: undefined },
                ],
                { codePointEscape: false, lineTerminator: false, octalEscape: true },
            ),
        );

        const testFail =
        (source, expectedError) =>
        () => assert.throws(() => parseStringLiteral(source), expectedError);

        it
        (
            'fails if the source contains a malformed hexadecimal x sequence',
            testFail
            (
                '"\\x1"',
                { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 },
            ),
        );

        it
        (
            'fails if the source contains a malformed hexadecimal u sequence',
            testFail
            (
                '"\\udear"',
                { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 },
            ),
        );

        it
        (
            'fails if the source contains a malformed code point escape sequence',
            testFail
            (
                '"\\u{x}"',
                { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 },
            ),
        );

        it
        (
            'fails if the source contains a code point escape sequence out of range',
            testFail
            (
                '"\\u{110000}"',
                { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 },
            ),
        );

        it
        (
            'fails if the source ends with a backslash',
            testFail
            (
                '"foo\\',
                { constructor: SyntaxError, message: 'Unexpected trailing backslash', pos: 4 },
            ),
        );

        it
        (
            'fails if the source does not start with a quote',
            testFail
            (
                'foo"',
                {
                    constructor:    SyntaxError,
                    message:        'Expected single or double quotation mark',
                    pos:            0,
                },
            ),
        );

        it
        (
            'fails if the source does not end with a quote',
            testFail
            (
                '\'foo',
                { constructor: SyntaxError, message: 'Unterminated token', pos: 0 },
            ),
        );

        it
        (
            'fails if the source contains an unescaped quote',
            testFail
            (
                '"a"z"',
                {
                    constructor:    SyntaxError,
                    message:        'Unexpected character past end of token',
                    pos:            3,
                },
            ),
        );

        it
        (
            'fails if the source contains a <LF> character outside of a line continuation',
            testFail
            (
                '"a\nz"',
                {
                    constructor:    SyntaxError,
                    message:        'Unexpected line termination',
                    pos:            2,
                },
            ),
        );

        it
        (
            'fails if the source contains a <CR> character outside of a line continuation',
            testFail
            (
                '"a\nz"',
                {
                    constructor:    SyntaxError,
                    message:        'Unexpected line termination',
                    pos:            2,
                },
            ),
        );
    },
);

describe
(
    'parseTemplateToken',
    () =>
    {
        const testOk =
        (source, expectedUnits) =>
        () =>
        {
            const codeUnits = parseTemplateToken(source);
            const expectedCharCount = expectedUnits.length;
            assert.equal(codeUnits.length, expectedCharCount);
            for (let index = 0; index < expectedCharCount; ++index)
            {
                const codeUnit = codeUnits[index];
                const expectedUnit = expectedUnits[index];
                const message = `Expected values to be strictly equal at index ${index}`;
                if ('char' in expectedUnit)
                    assert.equal(codeUnit.char,     expectedUnit.char,      message);
                if ('charCode' in expectedUnit)
                    assert.equal(codeUnit.charCode, expectedUnit.charCode,  message);
                assert.equal(codeUnit.start,        expectedUnit.start,     message);
                assert.equal(codeUnit.source,       expectedUnit.source,    message);
                assert.equal(codeUnit.surrogate,    expectedUnit.surrogate, message);
            }
        };

        it
        (
            'works with an empty template',
            testOk
            (
                '``',
                [],
            ),
        );

        it
        (
            'works with surrogate pairs',
            testOk
            (
                '`A𝄞Z`',
                [
                    { char: 'A',        start: 1, source: 'A',      surrogate: undefined },
                    { charCode: 0xd834, start: 2, source: '\ud834', surrogate: undefined },
                    { charCode: 0xdd1e, start: 3, source: '\udd1e', surrogate: undefined },
                    { char: 'Z',        start: 4, source: 'Z',      surrogate: undefined },
                ],
            ),
        );

        it
        (
            'works with escape sequences for single characters',
            testOk
            (
                '`A\\x40\\u231BZ${',
                [
                    { char: 'A', start: 1,  source: 'A',        surrogate: undefined },
                    { char: '@', start: 2,  source: '\\x40',    surrogate: undefined },
                    { char: '⌛', start: 6, source: '\\u231B',  surrogate: undefined },
                    { char: 'Z', start: 12, source: 'Z',        surrogate: undefined },
                ],
            ),
        );

        it
        (
            'works with escape sequences for code points',
            testOk
            (
                '}A\\u{FFFF}\\u{10000}\\u{10FFFF}Z${',
                [
                    { char: 'A',        start: 1,   source: 'A',            surrogate: undefined },
                    { charCode: 0xffff, start: 2,   source: '\\u{FFFF}',    surrogate: undefined },
                    { charCode: 0xd800, start: 10,  source: '\\u{10000}',   surrogate: 'high' },
                    { charCode: 0xdc00, start: 10,  source: '\\u{10000}',   surrogate: 'low' },
                    { charCode: 0xdbff, start: 19,  source: '\\u{10FFFF}',  surrogate: 'high' },
                    { charCode: 0xdfff, start: 19,  source: '\\u{10FFFF}',  surrogate: 'low' },
                    { char: 'Z',        start: 29,  source: 'Z',            surrogate: undefined },
                ],
            ),
        );

        it
        (
            'works with line continuations',
            testOk
            (
                '}A\\\n\\\r\n\\\u2028\\\u2029Z`',
                [
                    { char: 'A', start: 1,  source: 'A', surrogate: undefined },
                    { char: 'Z', start: 11, source: 'Z', surrogate: undefined },
                ],
            ),
        );

        it
        (
            'works with simple escape sequences',
            testOk
            (
                '`\\0\\`\\b\\f\\n\\r\\t\\v`',
                [
                    { char: '\0',   source: '\\0' },
                    { char: '`',    source: '\\`' },
                    { char: '\b',   source: '\\b' },
                    { char: '\f',   source: '\\f' },
                    { char: '\n',   source: '\\n' },
                    { char: '\r',   source: '\\r' },
                    { char: '\t',   source: '\\t' },
                    { char: '\v',   source: '\\v' },
                ]
                .map
                (
                    (expectedUnit, index) =>
                    ({ ...expectedUnit, start: 1 + index * 2, surrogate: undefined }),
                ),
            ),
        );

        it
        (
            'works with a <LS> character outside of a line continuation',
            testOk
            (
                '`a\u2028z`',
                [
                    { char: 'a', start: 1, source: 'a', surrogate: undefined },
                    { charCode: 0x2028, start: 2, source: '\u2028', surrogate: undefined },
                    { char: 'z', start: 3, source: 'z', surrogate: undefined },
                ],
            ),
        );

        it
        (
            'works with a <PS> character outside of a line continuation',
            testOk
            (
                '`a\u2029z`',
                [
                    { char: 'a', start: 1, source: 'a', surrogate: undefined },
                    { charCode: 0x2029, start: 2, source: '\u2029', surrogate: undefined },
                    { char: 'z', start: 3, source: 'z', surrogate: undefined },
                ],
            ),
        );

        it
        (
            'works with unescaped <CR> <LF> sequences',
            testOk
            (
                '`A\r\nZ`',
                [
                    { char: 'A',    start: 1, source: 'A',      surrogate: undefined },
                    { char: '\n',   start: 2, source: '\r\n',   surrogate: undefined },
                    { char: 'Z',    start: 4, source: 'Z',      surrogate: undefined },
                ],
            ),
        );

        const testFail =
        (source, expectedError) =>
        () => assert.throws(() => parseTemplateToken(source), expectedError);

        it
        (
            'fails if the source contains a malformed hexadecimal x sequence',
            testFail
            ('`\\xx0`', { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 }),
        );

        it
        (
            'fails if the source contains a malformed hexadecimal u sequence',
            testFail
            ('`\\uced`', { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 }),
        );

        it
        (
            'fails if the source contains a malformed code point escape sequence',
            testFail
            (
                '`\\u{x}${',
                { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 },
            ),
        );

        it
        (
            'fails if the source contains a code point escape sequence out of range',
            testFail
            (
                '`\\u{110000}${',
                { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 },
            ),
        );

        it
        (
            'fails if the source ends with a backslash',
            testFail
            (
                '`foo\\',
                { constructor: SyntaxError, message: 'Unexpected trailing backslash', pos: 4 },
            ),
        );

        it
        (
            'fails if the source does not start with a backtick or closing brace',
            testFail
            (
                'foo`',
                {
                    constructor:    SyntaxError,
                    message:        'Expected backtick or closing brace',
                    pos:            0,
                },
            ),
        );

        it
        (
            'fails if the source does not end with a backtick or the sequence "${"',
            testFail
            (
                '`foo',
                { constructor: SyntaxError, message: 'Unterminated token', pos: 0 },
            ),
        );

        it
        (
            'fails if the source contains an unescaped backtick',
            testFail
            (
                '`a`z`',
                {
                    constructor:    SyntaxError,
                    message:        'Unexpected character past end of token',
                    pos:            3,
                },
            ),
        );

        it
        (
            'fails if the source contains the unescaped sequence "${"',
            testFail
            (
                '`a${z`',
                {
                    constructor:    SyntaxError,
                    message:        'Unexpected character past end of token',
                    pos:            4,
                },
            ),
        );

        it
        (
            'fails if the source contains an escaped 8',
            testFail
            ('`\\8z`', { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 }),
        );

        it
        (
            'fails if the source contains an escaped 9',
            testFail
            ('`a\\9`', { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 3 }),
        );

        it
        (
            'fails if the source contains the escaped sequence "00"',
            testFail
            ('`\\00`', { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 }),
        );

        it
        (
            'fails if the source contains the escaped sequence "08"',
            testFail
            ('`\\08`', { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 }),
        );

        it
        (
            'fails if the source contains the escaped sequence "09"',
            testFail
            ('`\\09`', { constructor: SyntaxError, message: 'Invalid escape sequence', pos: 2 }),
        );
    },
);

describe
(
    'CodeUnit',
    () =>
    {
        it
        (
            'has proper debug format',
            () =>
            {
                const codeUnit = createCodeUnit('A', 42, '\\A', 'custom');
                codeUnit.foo = 'bar';
                const actualStr = inspect(codeUnit, { colors: true });
                const expectedStr =
                'CodeUnit {\n' +
                '  char: \x1B[32m\'A\'\x1B[39m,\n' +
                '  charCode: \x1B[33m65\x1B[39m,\n' +
                '  start: \x1B[33m42\x1B[39m,\n' +
                '  end: \x1B[33m44\x1B[39m,\n' +
                '  length: \x1B[33m2\x1B[39m,\n' +
                '  source: \x1B[32m\'\\\\A\'\x1B[39m,\n' +
                '  surrogate: \x1B[32m\'custom\'\x1B[39m,\n' +
                '  foo: \x1B[32m\'bar\'\x1B[39m\n' +
                '}';
                assert.equal(actualStr, expectedStr);
            },
        );

        it
        (
            'has proper string representation',
            () =>
            {
                const codeUnit = createCodeUnit('?', 1, '?');
                assert.equal(String(codeUnit), '[object CodePoint]');
            },
        );
    },
);
