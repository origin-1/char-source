# char-source

char-source is a parser for JavaScript string literals and template tokens that includes information about the location and source text of each resolved character in its output.

The two exported functions are:

* `parseStringLiteral(source)` to parse string literals like `"Hello, world!"` or `'JavaScript'`.

* `parseTemplateToken(source)` to parse template tokens like `` `foo${ `` and `` }baz` `` in `` `foo${bar}baz` ``.

Both functions return an array of `CodeUnit` elements (more below), each providing information about the encoded character and the part of source text that encodes it.

## Parsing specification

A string literal like `"A\nZ"` evaluates in JavaScript to a string with three characters: "A", a line feed character, and "Z". Accordingly, `parseStringLiteral('"A\\nZ"')` returns an array of three elements:

| `char` | `charCode` | `start` | `end` | `length` | `source` | `surrogate` |
|--------|-----------:|--------:|------:|---------:|----------|:-----------:|
| `"A"`  | 65         | 1       | 2     | 1        | `"A"`    | `undefined` |
| `"\n"` | 10         | 2       | 4     | 2        | `"\\n"`  | `undefined` |
| `"Z"`  | 90         | 4       | 5     | 1        | `"Z"`    | `undefined` |

Each element returned by `parseStringLiteral` or `parseTemplateToken` corresponds to one UTF-16 code unit in the value of the string literal or template token, regardless of the number of [source characters][SourceCharacter] used to produce it.

### Escape sequences

Escape sequences can evaluate to one or two characters.
This is reflected in the number of `CodeUnit` elements output by the parser.

The `source` property of a `CodeUnit` produced by an escape sequence always contains the whole sequence, including the leading backslash.
If an escape sequence evaluates to two characters (both surrogate code points), then the output will contain two elements both with the same `source`, but with different values for the `surrogate` property (`"high"` and `"low"`).

### Line continuations

A backslash followed by a line terminator sequence is treated as a [line continuation][LineContinuation].
Line continuations don't produce any characters, so they are not reflected in the parser's output.

### &lt;CR&gt; &lt;LF&gt; sequences

Template tokens can contain sequences of a carriage return (U+000D) and a line feed character (U+000A) outside of line continuations.
Those sequences produce a single line feed character.
They are reflected in the parser's output by a single `CodeUnit` with source `"\r\n"`.

### Characters in supplementary Unicode planes

Because of the UTF-16 encoding used by JavaScript, Unicode code points beyond U+FFFF in source text are encoded by two surrogate code points in the range U+D800–U+DBFF and U+DC00–U+DFFF.
Each surrogate code point is reflected as a distinct element in the parser's output.

## API

### `parseStringLiteral`

The function `parseStringLiteral` accepts a single string argument containing the source text of a [string literal][String Literals] to parse.
It returns an array of `CodeUnit` elements.
The returned array has an additional property `usedFeatures` which holds an object with the following properties:

* `codePointEscape`:
  `true` if the literal contains any code point [Unicode escape sequences][UnicodeEscapeSequence] (`\u{CodePoint}`), otherwise `false`.
  Unicode code-point escape sequences are only supported in ECMAScript 2015 or later.
* `lineTerminator`:
  `true` if the literal contains a line separator (U+2028) or paragraph separator character (U+2029) outside of a [line continuation][LineContinuation], otherwise `false`.
  Line separators and paragraph separators in string literals are only supported in ECMAScript 2019 or later.
* `octalEscape`:
  `true` if the literal contains any [legacy octal][LegacyOctalEscapeSequence] or [non-octal decimal escape sequences][NonOctalDecimalEscapeSequence], otherwise `false`.
  These escape sequences are not supported in [strict mode code][Strict Mode Code].

### `parseTemplateToken`

The function `parseTemplateToken` accepts a single string argument containing the source text of a template token (a [no-substitution template][NoSubstitutionTemplate], [template head][TemplateHead], [template middle][TemplateMiddle], or [template tail][TemplateTail]) to parse.
It returns an array of `CodeUnit` elements.

### `CodeUnit`

#### `char`

The single character represented by the current instance.

#### `charCode`

The character code. This is an integer between 0 and 65535.

#### `start`

The zero-based start position of the character's source text in the string literal or template token.

#### `end`

The zero-based end position of the character's source text in the string literal or template token.

#### `length`

The length of the character's source text in characters. This is the difference between `start` and `end`.

#### `source`

The character's source text in the string literal or template token.

#### `surrogate`

This property is only set for surrogate pairs produces by escape sequences for code points beyond U+FFFF. The first code unit or high surrogate has this property set to `"high"`, the second code unit of low surrogate has this property set to `"low"`. For surrogates not produced by escape sequences beyond U+FFFF and for non-surrogate characters, this property is `undefined`.

[LegacyOctalEscapeSequence]: https://262.ecma-international.org/#prod-LegacyOctalEscapeSequence
[LineContinuation]: https://262.ecma-international.org/#prod-LineContinuation
[NoSubstitutionTemplate]: https://262.ecma-international.org/#prod-NoSubstitutionTemplate
[NonOctalDecimalEscapeSequence]: https://262.ecma-international.org/#prod-NonOctalDecimalEscapeSequence
[SourceCharacter]: https://262.ecma-international.org/#prod-SourceCharacter
[Strict Mode Code]: https://262.ecma-international.org/#sec-strict-mode-code
[String Literals]: https://262.ecma-international.org/#sec-literals-string-literals
[TemplateHead]: https://262.ecma-international.org/#prod-TemplateHead
[TemplateMiddle]: https://262.ecma-international.org/#prod-TemplateMiddle
[TemplateTail]: https://262.ecma-international.org/#prod-TemplateTail
[UnicodeEscapeSequence]: https://262.ecma-international.org/#prod-UnicodeEscapeSequence
