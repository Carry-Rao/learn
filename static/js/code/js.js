export default [
  { reg: /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, type: 'string' },
  { reg: /\b(let|const|var|function|if|else|return|for|while|class|import|export|new|try|catch|async|await)\b/g, type: 'keyword' },
  { reg: /\b\d+\.?\d*\b/g, type: 'number' },
  { reg: /[+\-*\/=!&|;:,.]/g, type: 'operator' }
];