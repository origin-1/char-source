'use strict';

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');
const replacementPrototype = class CodeUnit { }.prototype;

const CodeUnitPrototype =
{
    get charCode()
    {
        return this.char.charCodeAt();
    },
    get end()
    {
        return this.start + this.length;
    },
    get length()
    {
        return this.source.length;
    },
    [Symbol.toStringTag]: 'CodePoint',
    [customInspectSymbol](depth, inspectOptions, inspect)
    {
        const replacement =
        {
            __proto__:  replacementPrototype,
            char:       this.char,
            charCode:   this.charCode,
            start:      this.start,
            end:        this.end,
            length:     this.length,
            source:     this.source,
            surrogate:  this.surrogate,
            ...this,
        };
        return inspect(replacement, inspectOptions);
    },
};

function createCodeUnit(char, start, source, surrogate)
{
    const codeUnit =
    Object.create
    (
        CodeUnitPrototype,
        {
            char:       { configurable: true, value: char },
            start:      { configurable: true, value: start },
            source:     { configurable: true, value: source },
            surrogate:  { configurable: true, value: surrogate },
        },
    );
    return codeUnit;
}

module.exports = createCodeUnit;
