type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

interface Line {
  indent: number;
  text: string;
  raw: string;
}

function stripFence(source: string): string {
  const trimmed = source.trim();
  const match = /^```(?:yaml|yml)?\s*\r?\n([\s\S]*?)\r?\n```$/i.exec(trimmed);
  return match ? match[1] : source;
}

function preprocess(source: string): Line[] {
  const out: Line[] = [];
  for (const raw of stripFence(source).split(/\r?\n/)) {
    const stripped = raw.replace(/\s+#.*$/, "");
    if (!stripped.trim()) continue;
    const match = /^(\s*)(.*)$/.exec(stripped);
    if (!match) continue;
    out.push({ indent: match[1].length, text: match[2], raw: stripped });
  }
  return out;
}

function parseScalar(text: string): YamlValue {
  if (text === "" || text === "~" || text === "null") return null;
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+$/.test(text)) return Number(text);
  if (/^-?\d+\.\d+$/.test(text)) return Number(text);
  if (/^".*"$/.test(text)) return JSON.parse(text);
  if (/^'.*'$/.test(text)) return text.slice(1, -1);
  return text;
}

function parseInlineArray(text: string): YamlValue[] {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [trimmed];
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  let quote: string | null = null;
  for (const ch of inner) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth += 1;
    else if (ch === "]" || ch === "}") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.map(parseScalar);
}

function findKeyColon(text: string): number {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ":" && (i + 1 === text.length || text[i + 1] === " " || text[i + 1] === "\t")) {
      return i;
    }
  }
  return text.lastIndexOf(":");
}

function parseInlineObject(text: string): { [key: string]: YamlValue } {
  try {
    return JSON.parse(text.replace(/([{,]\s*)([A-Za-z_][\w.-]*)(\s*:)/g, '$1"$2"$3')) as { [key: string]: YamlValue };
  } catch {
    return {};
  }
}

function readLiteralBlock(
  lines: Line[],
  start: number,
  parentIndent: number,
  preserveNewlines: boolean,
): { text: string; next: number } {
  const collected: string[] = [];
  let i = start;
  let blockIndent = -1;
  while (i < lines.length && lines[i].indent > parentIndent) {
    if (blockIndent < 0) blockIndent = lines[i].indent;
    collected.push(lines[i].raw.slice(blockIndent));
    i += 1;
  }
  return { text: preserveNewlines ? collected.join("\n") : collected.join(" "), next: i };
}

function parseValue(rest: string, lines: Line[], nextIndex: number, indent: number): { value: YamlValue; next: number } {
  if (rest === "|" || rest === ">") {
    const block = readLiteralBlock(lines, nextIndex, indent, rest === "|");
    return { value: block.text, next: block.next };
  }
  if (rest === "") return parseBlock(lines, nextIndex, indent + 1);
  if (rest.startsWith("[")) return { value: parseInlineArray(rest), next: nextIndex };
  if (rest.startsWith("{")) return { value: parseInlineObject(rest), next: nextIndex };
  return { value: parseScalar(rest), next: nextIndex };
}

function parseMap(lines: Line[], start: number, indent: number): { value: YamlValue; next: number } {
  const obj: { [key: string]: YamlValue } = {};
  let i = start;
  while (i < lines.length && lines[i].indent === indent) {
    const line = lines[i];
    const colonIdx = findKeyColon(line.text);
    if (colonIdx < 0) {
      i += 1;
      continue;
    }
    const key = line.text.slice(0, colonIdx).trim().replace(/^["'](.*)["']$/, "$1");
    const rest = line.text.slice(colonIdx + 1).trim();
    const parsed = parseValue(rest, lines, i + 1, indent);
    obj[key] = parsed.value;
    i = parsed.next;
  }
  return { value: obj, next: i };
}

function parseArray(lines: Line[], start: number, indent: number): { value: YamlValue; next: number } {
  const arr: YamlValue[] = [];
  let i = start;
  while (i < lines.length && lines[i].indent === indent && lines[i].text.startsWith("- ")) {
    const after = lines[i].text.slice(2);
    const keyColon = findKeyColon(after);
    if (keyColon >= 0) {
      const itemMap: { [key: string]: YamlValue } = {};
      const itemIndent = indent + 2;
      const firstKey = after.slice(0, keyColon).trim();
      const firstRest = after.slice(keyColon + 1).trim();
      const parsed = parseValue(firstRest, lines, i + 1, itemIndent);
      itemMap[firstKey] = parsed.value;
      i = parsed.next;
      while (i < lines.length && lines[i].indent === itemIndent && !lines[i].text.startsWith("- ")) {
        const subLine = lines[i];
        const subColon = findKeyColon(subLine.text);
        if (subColon < 0) {
          i += 1;
          continue;
        }
        const subKey = subLine.text.slice(0, subColon).trim();
        const subRest = subLine.text.slice(subColon + 1).trim();
        const subParsed = parseValue(subRest, lines, i + 1, itemIndent);
        itemMap[subKey] = subParsed.value;
        i = subParsed.next;
      }
      arr.push(itemMap);
    } else {
      arr.push(parseScalar(after));
      i += 1;
    }
  }
  return { value: arr, next: i };
}

function parseBlock(lines: Line[], start: number, indent: number): { value: YamlValue; next: number } {
  if (start >= lines.length || lines[start].indent < indent) return { value: null, next: start };
  return lines[start].text.startsWith("- ") ? parseArray(lines, start, lines[start].indent) : parseMap(lines, start, lines[start].indent);
}

export function parseYaml(source: string): YamlValue {
  const lines = preprocess(source);
  if (!lines.length) return null;
  return parseBlock(lines, 0, lines[0].indent).value;
}
