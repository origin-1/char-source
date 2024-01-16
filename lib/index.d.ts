/**
 * Represents a code unit produced by the evaluation of a JavaScript common token like a string
 * literal or template token.
 */
export interface CodeUnit
{
    readonly char:      string & { readonly length: 1; };
    readonly charCode:  number;
    readonly start:     number;
    readonly end:       number;
    readonly length:    number;
    readonly source:    string;
    readonly surrogate: undefined | 'high' | 'low';
}

export interface ParseError extends SyntaxError { pos: number; }

/**
 * Parses a string literal.
 *
 * @param source - The string literal to parse, including the delimiting quotes.
 * @returns
 * A list of code units produced by the string literal as {@linkcode CodeUnit} objects, with an
 * additional property `usedFeatures`.
 * @throws If the provided argument is not a valid string literal, a {@linkcode ParseError} is
 * thrown.
 */
export function parseStringLiteral(source: string):
CodeUnit[] &
{ usedFeatures: { codePointEscape: boolean; lineTerminator: boolean; octalEscape: boolean; }; };

/**
 * Parses a template token.
 *
 * @param source -
 * The template token to parse, including the delimiting sequences `` ` ``, `${` and `}`.
 * @returns A list of code units produced by the template token as {@linkcode CodeUnit} objects.
 * @throws If the provided argument is not a valid string literal, a {@linkcode ParseError} is
 * thrown.
 */
export function parseTemplateToken(source: string): CodeUnit[];
