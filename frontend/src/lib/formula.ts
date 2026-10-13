/**
 * Safe formula evaluator: numbers, column slugs, + - * /, parentheses.
 * Expressions look like `=qty*price` or `={amount}-{paid}`.
 */

export type FormulaResult = { ok: true; value: number } | { ok: false; error: string }

const TOKEN_RE = /\s*([+\-*/()]|\d+(?:\.\d+)?|[a-zA-Z_][\w]*|\{[a-zA-Z_][\w]*\})\s*/y

function tokenize(expr: string): string[] | null {
  const input = expr.trim().startsWith('=') ? expr.trim().slice(1) : expr.trim()
  if (!input) return null
  const tokens: string[] = []
  TOKEN_RE.lastIndex = 0
  while (TOKEN_RE.lastIndex < input.length) {
    const match = TOKEN_RE.exec(input)
    if (!match) return null
    tokens.push(match[1])
  }
  return tokens
}

function resolveSlug(token: string): string {
  if (token.startsWith('{') && token.endsWith('}')) return token.slice(1, -1)
  return token
}

function isIdent(token: string): boolean {
  return /^[a-zA-Z_]/.test(token) || (token.startsWith('{') && token.endsWith('}'))
}

/**
 * Evaluate a formula against row values and other formula columns (by slug → formula).
 */
export function evaluateFormula(
  formula: string | null | undefined,
  values: Record<string, string | number | null>,
  formulaBySlug: Record<string, string | null | undefined>,
  stack: string[] = [],
): FormulaResult {
  if (!formula || !formula.trim()) {
    return { ok: false, error: 'ცარიელი' }
  }

  const tokens = tokenize(formula)
  if (!tokens) {
    return { ok: false, error: 'არასწორი' }
  }

  let pos = 0

  const peek = () => tokens[pos]
  const consume = () => tokens[pos++]

  const valueOf = (slug: string): FormulaResult => {
    if (stack.includes(slug)) {
      return { ok: false, error: 'ციკლი' }
    }
    const nested = formulaBySlug[slug]
    if (nested != null && nested !== '') {
      return evaluateFormula(nested, values, formulaBySlug, [...stack, slug])
    }
    const raw = values[slug]
    if (raw == null || raw === '') return { ok: true, value: 0 }
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
    if (Number.isNaN(n)) return { ok: false, error: 'NaN' }
    return { ok: true, value: n }
  }

  const parsePrimary = (): FormulaResult => {
    const t = peek()
    if (t === undefined) return { ok: false, error: 'შეცდომა' }
    if (t === '(') {
      consume()
      const inner = parseExpr()
      if (!inner.ok) return inner
      if (peek() !== ')') return { ok: false, error: ')' }
      consume()
      return inner
    }
    if (t === '+' || t === '-') {
      const op = consume()
      const v = parsePrimary()
      if (!v.ok) return v
      return { ok: true, value: op === '-' ? -v.value : v.value }
    }
    if (/^\d/.test(t)) {
      consume()
      return { ok: true, value: Number(t) }
    }
    if (isIdent(t)) {
      consume()
      return valueOf(resolveSlug(t))
    }
    return { ok: false, error: 'ტოკენი' }
  }

  const parseTerm = (): FormulaResult => {
    let left = parsePrimary()
    if (!left.ok) return left
    while (peek() === '*' || peek() === '/') {
      const op = consume()
      const right = parsePrimary()
      if (!right.ok) return right
      if (op === '/' && right.value === 0) return { ok: false, error: '÷0' }
      left = { ok: true, value: op === '*' ? left.value * right.value : left.value / right.value }
    }
    return left
  }

  const parseExpr = (): FormulaResult => {
    let left = parseTerm()
    if (!left.ok) return left
    while (peek() === '+' || peek() === '-') {
      const op = consume()
      const right = parseTerm()
      if (!right.ok) return right
      left = { ok: true, value: op === '+' ? left.value + right.value : left.value - right.value }
    }
    return left
  }

  const result = parseExpr()
  if (!result.ok) return result
  if (pos !== tokens.length) return { ok: false, error: 'ზედმეტი' }
  return result
}

export function formatFormulaValue(result: FormulaResult): string {
  if (!result.ok) return `⚠ ${result.error}`
  return result.value.toLocaleString('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
