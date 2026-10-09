const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function propertyName(node) {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
    throw new Error(`Unsupported catalog property name: ${node.getText()}`);
}

function unwrapExpression(expression) {
    let current = expression;
    while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isTypeAssertionExpression(current)) {
        current = current.expression;
    }
    return current;
}

function stringProperties(object, strict = true) {
    if (!ts.isObjectLiteralExpression(object)) throw new Error(`Expected object literal: ${object.getText()}`);
    const values = {};
    for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property)) throw new Error(`Unsupported catalog member: ${property.getText()}`);
        const name = propertyName(property.name);
        const value = unwrapExpression(property.initializer);
        if (ts.isStringLiteral(value)) values[name] = value.text;
        else if (strict) throw new Error(`Expected a string literal for ${name}: ${value.getText()}`);
    }
    return values;
}

function variableInitializer(sourceFile, name) {
    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
                return unwrapExpression(declaration.initializer);
            }
        }
    }
    throw new Error(`Could not find ${name} in ${sourceFile.fileName}`);
}

function parseSource(relativePath) {
    const filePath = path.join(root, relativePath);
    const contents = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const parseErrors = sourceFile.parseDiagnostics;
    if (parseErrors.length) throw new Error(`Cannot parse ${relativePath}: ${parseErrors.map(error => error.messageText).join('; ')}`);
    return sourceFile;
}

const definitions = variableInitializer(parseSource('src/demonstrations.ts'), 'definitions');
if (!ts.isArrayLiteralExpression(definitions) || definitions.elements.length === 0) {
    throw new Error('The demonstrations catalog must remain a non-empty array literal.');
}

const messages = stringProperties(variableInitializer(parseSource('src/localization/en.ts'), 'en'));
const demonstrations = definitions.elements.map(element => {
    const entry = stringProperties(unwrapExpression(element), false);
    for (const required of ['id', 'path', 'title']) {
        if (!entry[required]) throw new Error(`A demonstration definition is missing ${required}: ${element.getText()}`);
    }
    const headingKey = entry.heading || entry.title;
    const heading = messages[headingKey];
    if (!heading || heading.includes('{')) throw new Error(`Missing plain English heading for ${entry.id}: ${headingKey}`);
    if (!entry.path.startsWith('/bezeg-2.0/')) throw new Error(`Demonstration path must stay under /bezeg-2.0/: ${entry.path}`);
    return {id: entry.id, path: entry.path, heading};
});

const routePaths = new Set();
const ids = new Set();
for (const demonstration of demonstrations) {
    if (routePaths.has(demonstration.path)) throw new Error(`Duplicate demonstration path: ${demonstration.path}`);
    if (ids.has(demonstration.id)) throw new Error(`Duplicate demonstration id: ${demonstration.id}`);
    routePaths.add(demonstration.path);
    ids.add(demonstration.id);
}

module.exports = demonstrations;
