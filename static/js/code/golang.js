export default [
  { reg: /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, type: 'string' },
  { reg: /\b(var|func|package|import|if|else|for|return|type|struct|interface|chan|go|defer|const)\b/g, type: 'keyword' },
  { reg: /\b\d+\b/g, type: 'number' },
  { reg: /[+\-*\/=!&|;:,.]/g, type: 'operator' }
];