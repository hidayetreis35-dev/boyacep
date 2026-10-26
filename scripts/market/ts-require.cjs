// Lets plain Node require the app's TypeScript modules (the engine is pure TS).
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const src = path.resolve(__dirname, '../../src');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const Module = require('module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) request = path.join(src, request.slice(2));
  return resolve.call(this, request, ...rest);
};
