export default [
  { reg: /(["'])[^"']*?\1/g, type: 'string' },
  { reg: /\b(div|span|p|a|ul|li|input|button|body|head|html|script|style)\b/g, type: 'keyword' }
];