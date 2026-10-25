/**
 * Finds UI text in the source code for the i18n tests: every t('…') and
 * msg('…') key, and Turkish text that is not wrapped in either. Runs in Jest
 * only (it reads files with Node).
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export type Finding = { file: string; line: number; text: string };

const SRC = path.resolve(__dirname, '..');

/** Files whose Turkish text is data, not UI: translated through en.ts where shown. */
export const DATA_FILES = new Set(['features/colour/catalogue.ts', 'features/colour/palette.ts', 'lib/database.types.ts']);

/** Turkish letters that English never uses. */
export const TURKISH = /[çğıöşüÇĞİÖŞÜ]/;

export function sourceFiles(): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        if (name !== '__tests__') walk(full);
      } else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts') && !name.includes('.mock.')) {
        out.push(full);
      }
    }
  })(SRC);
  return out;
}

function parse(file: string): ts.SourceFile {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, kind);
}

const rel = (file: string) => path.relative(SRC, file).split(path.sep).join('/');

function isCallTo(node: ts.Node | undefined, names: string[]): node is ts.CallExpression {
  return !!node && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && names.includes(node.expression.text);
}

/** The literal text of a string or template, without the ${…} parts. */
function literalText(node: ts.StringLiteralLike | ts.TemplateExpression): string {
  if (!ts.isTemplateExpression(node)) return node.text;
  return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ');
}

export type Scan = {
  /** First arguments of t() and msg() that are string literals. */
  keys: Finding[];
  /** Turkish text outside t()/msg() (outside the engine and data files). */
  unwrapped: Finding[];
};

export function scan(): Scan {
  const keys: Finding[] = [];
  const unwrapped: Finding[] = [];
  for (const file of sourceFiles()) {
    const name = rel(file);
    if (name.startsWith('i18n/')) continue;
    const sf = parse(file);
    const at = (node: ts.Node, text: string): Finding => ({
      file: name,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      text,
    });
    const visit = (node: ts.Node) => {
      if (isCallTo(node, ['t', 'msg']) && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        keys.push(at(node, node.arguments[0].text));
      }
      const checked = !name.startsWith('engine/') && !DATA_FILES.has(name);
      if (checked && ts.isJsxText(node) && TURKISH.test(node.text)) {
        unwrapped.push(at(node, node.text.trim()));
      }
      if (checked && (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) && TURKISH.test(literalText(node))) {
        const wrapped = isCallTo(node.parent, ['t', 'msg']) || ts.isImportDeclaration(node.parent);
        const insideTemplate = ts.isTemplateSpan(node.parent) || ts.isTemplateExpression(node.parent);
        if (!wrapped && !insideTemplate) unwrapped.push(at(node, node.getText(sf)));
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { keys, unwrapped };
}
