export default [
  { reg: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, type: 'string' },
  { reg: /\b(echo|cd|ls|if|else|fi|for|do|done|while|break|continue|export|function)\b/g, type: 'keyword' },
  { reg: /\b\d+\b/g, type: 'number' },
  { reg: /[+\-*\/=!&|;:,.]/g, type: 'operator' }
];