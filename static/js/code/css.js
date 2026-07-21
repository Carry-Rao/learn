export default [
  { reg: /[\w-]+(?=:)/g, type: 'keyword' },
  { reg: /(["'])[^"']*?\1/g, type: 'string' },
  { reg: /#[\da-fA-F]{3,6}/g, type: 'number' },
  { reg: /\b\d+(px|em|rem|%|vh|vw)\b/g, type: 'number' },
  { reg: /[+\-*\/;:,.]/g, type: 'operator' }
];