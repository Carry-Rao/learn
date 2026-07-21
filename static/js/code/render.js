const colorMap = Object.freeze({
  string: 'color:#a6e3a1',
  keyword: 'color:#89b4fa',
  number: 'color:#fab387',
  operator: 'color:#94e2d5'
});

const bracketColors = Object.freeze([
  'color:#f38ba8',
  'color:#89dceb',
  'color:#f9e2af',
  'color:#cba6f7',
  'color:#a6e3a1'
]);

const escapeChar = c => {
  switch (c) {
    case '&': return '&amp;';
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '"': return '&quot;';
    case "'": return '&#039;';
    default: return c;
  }
};

const isBracket = c => /[(){}\[\]<>]/.test(c);

export async function renderCode(code, lang, dom) {
  Object.assign(dom.style, {
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
    color: '#cdd6f4',
    fontSize: '14px'
  });

  let rules = [];
  try {
    const mod = await import(`/static/js/code/${lang}.js`);
    rules = mod.default || [];
  } catch (err) {
    console.warn(`[CodeHighlight] ${lang} load failed, fallback to js`, err);
    const mod = await import(`/static/js/code/js.js`);
    rules = mod.default || [];
  }

  const chars = [...code];
  let bracketLevel = 0;
  const ruleList = rules.map(item => ({
    reg: item.reg,
    type: item.type,
    style: colorMap[item.type] || ''
  }));

  const parts = [];
  for (let i = 0; i < chars.length; i++) {
    const curr = chars[i];
    let charHtml = escapeChar(curr);
    let style = '';

    if (isBracket(curr)) {
      if (/[(\[{<]/.test(curr)) bracketLevel++;
      const idx = (bracketLevel - 1) % bracketColors.length;
      style = bracketColors[idx];
      if (/[)\]}>]/.test(curr)) bracketLevel--;
    } else if (/[=:+\-*/%&|!,.]/.test(curr)) {
      style = colorMap.operator;
    }

    if (!style) {
      for (const rule of ruleList) {
        const slice = code.slice(i);
        const match = slice.match(rule.reg);
        if (match && match.index === 0) {
          style = rule.style;
          const matchStr = match[0];
          for (let j = 0; j < matchStr.length - 1; j++) i++;
          charHtml = [...matchStr].map(escapeChar).join('');
          break;
        }
      }
    }

    parts.push(style ? `<span style="${style}">${charHtml}</span>` : charHtml);
  }

  dom.innerHTML = parts.join('');
}
