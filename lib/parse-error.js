'use strict';

function parseError(pos, message)
{
    const err = SyntaxError(message);
    err.pos = pos;
    return err;
}

module.exports = parseError;
