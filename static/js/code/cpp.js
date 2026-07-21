export default [
    { reg: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, type: 'string' },
    { reg: /\b(int|char|bool|string|class|struct|namespace|template|if|else|for|while|return|auto|const|using|include)\b/g, type: 'keyword' },
    { reg: /\b\d+\b/g, type: 'number' },
    { reg: /[+\-*\/=!&|;:,.]/g, type: 'operator' }
];