'use strict';

const createCodeUnit    = require('./code-unit');
const parseError        = require('./parse-error');

const SIMPLE_ESCAPE_SEQUENCES =
{ __proto__: null, b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };

function assertEndOfToken(source, pos)
{
    if (source[pos])
        throw parseError(pos, 'Unexpected character past end of token');
}

const createReader = source => ({ source: String(source), pos: 0 });

const invalidEscapeSequence = pos => parseError(pos, 'Invalid escape sequence');

const isDecimalDigit = char => char >= '0' && char <= '9';

const isHexString = str => /^[\dA-Fa-f]+$/.test(str);

const markUsedFeature =
(usedFeatures, featureName) => { if (usedFeatures) usedFeatures[featureName] = true; };

// The reader should be positioned on the first hexadecimal character.
function readHexSequence(reader, length)
{
    const { source, pos } = reader;
    const str = source.substr(pos, length);
    if (str.length !== length || !isHexString(str))
        throw invalidEscapeSequence(pos - 1);
    const charCode = parseInt(str, 16);
    reader.pos = pos + length;
    return String.fromCharCode(charCode);
}

// The reader should be positioned after the "u".
function readUnicodeSequence(reader, usedFeatures)
{
    const { source, pos } = reader;
    const regExp = /\{(?<hexDigits>[\dA-Fa-f]+)}/y;
    regExp.lastIndex = pos;
    const match = regExp.exec(source);
    if (match)
    {
        const codePoint = parseInt(match.groups.hexDigits, 16);
        if (codePoint > 0x10ffff)
            throw invalidEscapeSequence(pos - 1);
        reader.pos = regExp.lastIndex;
        markUsedFeature(usedFeatures, 'codePointEscape');
        return String.fromCodePoint(codePoint);
    }
    return readHexSequence(reader, 4);
}

// The reader should be positioned after the first octal digit.
function readOctalSequence(reader, allowOctalSequence, maxLength)
{
    const posAfterBackslash = reader.pos - 1;
    if (!allowOctalSequence)
        throw invalidEscapeSequence(posAfterBackslash);
    const [octalStr] = reader.source.substr(posAfterBackslash, maxLength).match(/^[0-7]+/);
    reader.pos = posAfterBackslash + octalStr.length;
    const octal = parseInt(octalStr, 8);
    return String.fromCharCode(octal);
}

// The reader should be positioned after the backslash.
function readEscapeSequenceOrLineContinuation(reader, allowOctalSequence, usedFeatures)
{
    const { source, pos } = reader;
    const char = source[pos];
    if (!char)
        throw parseError(pos - 1, 'Unexpected trailing backslash');
    reader.pos = pos + 1;
    const unitChar = SIMPLE_ESCAPE_SEQUENCES[char];
    if (unitChar)
        return unitChar;
    switch (char)
    {
    case 'x':
        return readHexSequence(reader, 2);
    case 'u':
        return readUnicodeSequence(reader, usedFeatures);
    case '\r':
        if (source[pos + 1] === '\n')
            reader.pos = pos + 2;
    // fallthrough
    case '\n':
    case '\u2028':
    case '\u2029':
        return '';
    case '0':
        if (!isDecimalDigit(source[pos + 1]))
            return '\0';
    // fallthrough
    case '1':
    case '2':
    case '3':
        markUsedFeature(usedFeatures, 'octalEscape');
        return readOctalSequence(reader, allowOctalSequence, 3);
    case '4':
    case '5':
    case '6':
    case '7':
        markUsedFeature(usedFeatures, 'octalEscape');
        return readOctalSequence(reader, allowOctalSequence, 2);
    case '8':
    case '9':
        if (!allowOctalSequence)
            throw invalidEscapeSequence(pos);
        markUsedFeature(usedFeatures, 'octalEscape');
    // fallthrough
    default:
        return char;
    }
}

// The reader should be positioned on the backslash.
function * mapEscapeSequenceOrLineContinuation(reader, allowOctalSequence, usedFeatures)
{
    const start = reader.pos++;
    const str = readEscapeSequenceOrLineContinuation(reader, allowOctalSequence, usedFeatures);
    const end = reader.pos;
    const source = reader.source.slice(start, end);
    switch (str.length)
    {
    case 0:
        break;
    case 1:
        {
            const char = str;
            yield createCodeUnit(char, start, source);
        }
        break;
    default:
        {
            const highSurrogate = str[0];   // eslint-disable-line prefer-destructuring
            const lowSurrogate = str[1];    // eslint-disable-line prefer-destructuring
            yield createCodeUnit(highSurrogate, start, source, 'high');
            yield createCodeUnit(lowSurrogate, start, source, 'low');
        }
        break;
    }
}

const unterminatedToken = () => parseError(0, 'Unterminated token');

function parseStringLiteral(source)
{
    const reader = createReader(source);
    ({ source } = reader);
    const quote = source[0]; // eslint-disable-line prefer-destructuring
    if (quote !== '"' && quote !== '\'')
        throw parseError(0, 'Expected single or double quotation mark');
    reader.pos = 1;
    const codeUnits = [];
    const usedFeatures = codeUnits.usedFeatures =
    { codePointEscape: false, lineTerminator: false, octalEscape: false };
    for (;;)
    {
        const { pos } = reader;
        const char = source[pos];
        if (char === quote)
        {
            assertEndOfToken(source, pos + 1);
            break;
        }
        if (char === '\\')
            codeUnits.push(...mapEscapeSequenceOrLineContinuation(reader, true, usedFeatures));
        else if (!char)
            throw unterminatedToken();
        else if (char === '\n' || char === '\r')
            throw parseError(pos, 'Unexpected line termination');
        else
        {
            if (char === '\u2028' || char === '\u2029')
                markUsedFeature(usedFeatures, 'lineTerminator');
            const start = pos;
            const unitSource = char;
            reader.pos = pos + 1;
            codeUnits.push(createCodeUnit(char, start, unitSource));
        }
    }
    return codeUnits;
}

function parseTemplateToken(source)
{
    const reader = createReader(source);
    ({ source } = reader);
    const firstChar = source[0]; // eslint-disable-line prefer-destructuring
    if (firstChar !== '`' && firstChar !== '}')
        throw parseError(0, 'Expected backtick or closing brace');
    reader.pos = 1;
    const codeUnits = [];
    const usedFeatures = { };
    for (;;)
    {
        const { pos } = reader;
        const char = source[pos];
        if (char === '`')
        {
            assertEndOfToken(source, pos + 1);
            break;
        }
        if (char === '$' && source[pos + 1] === '{')
        {
            assertEndOfToken(source, pos + 2);
            break;
        }
        if (char === '\\')
            codeUnits.push(...mapEscapeSequenceOrLineContinuation(reader, false, usedFeatures));
        else if (!char)
            throw unterminatedToken();
        else
        {
            const start = pos;
            let unitChar;
            let unitSource;
            if (char === '\r' && source[pos + 1] === '\n')
            {
                unitChar = '\n';
                unitSource = '\r\n';
                reader.pos = pos + 2;
            }
            else
            {
                unitChar = unitSource = char;
                reader.pos = pos + 1;
            }
            codeUnits.push(createCodeUnit(unitChar, start, unitSource));
        }
    }
    return codeUnits;
}

module.exports = { parseStringLiteral, parseTemplateToken };
