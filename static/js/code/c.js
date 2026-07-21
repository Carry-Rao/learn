export default [
  { reg: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, type: 'string' },
  { reg: /\b(int|char|short|long|float|double|void|if|else|for|while|return|break|continue|include|define)\b/g, type: 'keyword' },
  { reg: /\b\d+\b/g, type: 'number' },
  { reg: /[+\-*\/=!&|;:,.]/g, type: 'operator' }
];