const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_MAX_DEPTH = 64;

export class StrictJsonError extends Error {
  constructor(message, offset) {
    super(`${message} at offset ${offset}`);
    this.name = "StrictJsonError";
    this.offset = offset;
  }
}

function isWhitespace(char) {
  return char === " " || char === "\n" || char === "\r" || char === "\t";
}

export function parseStrictJson(source, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const byteLength = Buffer.byteLength(source, "utf8");

  if (byteLength > maxBytes) {
    throw new StrictJsonError(`JSON exceeds ${maxBytes} byte limit`, 0);
  }

  let index = 0;

  function fail(message) {
    throw new StrictJsonError(message, index);
  }

  function skipWhitespace() {
    while (index < source.length && isWhitespace(source[index])) {
      index += 1;
    }
  }

  function readString() {
    const start = index;
    if (source[index] !== '"') {
      fail("Expected string");
    }

    index += 1;
    while (index < source.length) {
      const char = source[index];
      if (char === '"') {
        index += 1;
        const literal = source.slice(start, index);
        try {
          const value = JSON.parse(literal);
          rejectUnpairedSurrogates(value, start);
          return value;
        } catch (error) {
          if (error instanceof StrictJsonError) {
            throw error;
          }
          throw new StrictJsonError("Invalid string escape", start);
        }
      }
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char < " ") {
        throw new StrictJsonError("Unescaped control character in string", index);
      }
      index += 1;
    }

    throw new StrictJsonError("Unterminated string", start);
  }

  function rejectUnpairedSurrogates(value, offset) {
    for (let character = 0; character < value.length; character += 1) {
      const codeUnit = value.charCodeAt(character);
      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        const next = value.charCodeAt(character + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          character += 1;
          continue;
        }
        throw new StrictJsonError("Unpaired UTF-16 surrogate in string", offset);
      }
      if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
        throw new StrictJsonError("Unpaired UTF-16 surrogate in string", offset);
      }
    }
  }

  function readNumber() {
    const remainder = source.slice(index);
    const match = remainder.match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (!match) {
      fail("Invalid number");
    }
    index += match[0].length;
  }

  function expectLiteral(literal) {
    if (!source.startsWith(literal, index)) {
      fail(`Expected ${literal}`);
    }
    index += literal.length;
  }

  function parseArray(depth) {
    if (depth > maxDepth) {
      fail(`JSON exceeds ${maxDepth} nesting depth`);
    }
    index += 1;
    skipWhitespace();
    if (source[index] === "]") {
      index += 1;
      return;
    }
    while (true) {
      parseValue(depth + 1);
      skipWhitespace();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      if (source[index] !== ",") {
        fail("Expected comma or array end");
      }
      index += 1;
      skipWhitespace();
    }
  }

  function parseObject(depth) {
    if (depth > maxDepth) {
      fail(`JSON exceeds ${maxDepth} nesting depth`);
    }
    index += 1;
    const keys = new Set();
    skipWhitespace();
    if (source[index] === "}") {
      index += 1;
      return;
    }
    while (true) {
      if (source[index] !== '"') {
        fail("Expected object key");
      }
      const keyOffset = index;
      const key = readString();
      if (keys.has(key)) {
        throw new StrictJsonError(`Duplicate object key ${JSON.stringify(key)}`, keyOffset);
      }
      keys.add(key);
      skipWhitespace();
      if (source[index] !== ":") {
        fail("Expected colon after object key");
      }
      index += 1;
      parseValue(depth + 1);
      skipWhitespace();
      if (source[index] === "}") {
        index += 1;
        return;
      }
      if (source[index] !== ",") {
        fail("Expected comma or object end");
      }
      index += 1;
      skipWhitespace();
    }
  }

  function parseValue(depth) {
    skipWhitespace();
    const char = source[index];
    if (char === "{") {
      parseObject(depth);
      return;
    }
    if (char === "[") {
      parseArray(depth);
      return;
    }
    if (char === '"') {
      readString();
      return;
    }
    if (char === "-" || (char >= "0" && char <= "9")) {
      readNumber();
      return;
    }
    if (char === "t") {
      expectLiteral("true");
      return;
    }
    if (char === "f") {
      expectLiteral("false");
      return;
    }
    if (char === "n") {
      expectLiteral("null");
      return;
    }
    fail("Expected JSON value");
  }

  skipWhitespace();
  parseValue(0);
  skipWhitespace();
  if (index !== source.length) {
    fail("Unexpected trailing content");
  }

  try {
    return JSON.parse(source);
  } catch {
    throw new StrictJsonError("Invalid JSON", 0);
  }
}
