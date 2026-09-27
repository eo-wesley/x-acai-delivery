const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const frontend = path.resolve(__dirname, '../apps/frontend');
const appRequire = createRequire(path.join(frontend, 'package.json'));
const ts = appRequire('typescript');

function loadSource(relativePath, suffix = '', mocks = {}) {
    const filename = path.join(frontend, relativePath);
    if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8') + suffix, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2020, esModuleInterop: true,
        },
    }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(name => {
        if (name in mocks) return mocks[name];
        if (name.startsWith('.')) {
            const resolved = path.resolve(path.dirname(filename), name);
            const file = [resolved, resolved + '.ts', resolved + '.tsx', resolved + '.json']
                .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
            if (file) return loadSource(path.relative(frontend, file), '', mocks);
        }
        return appRequire(name);
    }, module, module.exports);
    return module.exports;
}

module.exports = { loadSource, appRequire, frontend };
