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

const demonstrationSource = parseSource('src/demonstrations.ts');
const definitions = variableInitializer(demonstrationSource, 'definitions');
if (!ts.isArrayLiteralExpression(definitions) || definitions.elements.length === 0) {
    throw new Error('The demonstrations catalog must remain a non-empty array literal.');
}
const familyDefinitions = variableInitializer(demonstrationSource, 'families');
if (!ts.isArrayLiteralExpression(familyDefinitions) || familyDefinitions.elements.length === 0) {
    throw new Error('The demonstration family catalog must remain a non-empty array literal.');
}
const familyIds = familyDefinitions.elements.map(element => {
    const family = stringProperties(unwrapExpression(element), false);
    if (!family.id) throw new Error(`A demonstration family is missing its id: ${element.getText()}`);
    return family.id;
});
if (new Set(familyIds).size !== familyIds.length) throw new Error('The demonstration family catalog contains duplicate ids.');

const messages = stringProperties(variableInitializer(parseSource('src/localization/en.ts'), 'en'));
const lessonIdsExpression = variableInitializer(parseSource('src/learning/runtime/lessonCatalog.ts'), 'GUIDED_LESSON_AVAILABLE_IDS');
if (!ts.isArrayLiteralExpression(lessonIdsExpression)) throw new Error('Guided lesson availability must remain an array literal.');
const availableLessonIds = new Set(lessonIdsExpression.elements.map(element => {
    const value = unwrapExpression(element);
    if (!ts.isStringLiteral(value)) throw new Error(`Expected a string lesson id: ${value.getText()}`);
    return value.text;
}));
const lessonContentSource = parseSource('src/learning/content/guidedLessons.ts');
const lessonContentIds = new Set();
function collectLessonIds(sourceFile, variableName) {
    const lessonArray = variableInitializer(sourceFile, variableName);
    if (!ts.isArrayLiteralExpression(lessonArray)) throw new Error(`${variableName} must remain an array literal.`);
    for (const element of lessonArray.elements) {
        const unwrapped = unwrapExpression(element);
        const lesson = ts.isIdentifier(unwrapped) ? variableInitializer(sourceFile, unwrapped.text) : unwrapped;
        if (!ts.isObjectLiteralExpression(lesson)) continue;
        for (const property of lesson.properties) {
            if (ts.isPropertyAssignment(property) && propertyName(property.name) === 'demonstrationId') {
                const value = unwrapExpression(property.initializer);
                if (ts.isStringLiteral(value)) lessonContentIds.add(value.text);
            }
        }
    }
}
collectLessonIds(lessonContentSource, 'pilotGuidedLessons');
for (const statement of lessonContentSource.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly
        || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith('./')
        || !statement.importClause?.namedBindings || !ts.isNamedImports(statement.importClause.namedBindings)) continue;
    const importedSource = parseSource(path.join('src/learning/content', `${statement.moduleSpecifier.text.slice(2)}.ts`));
    for (const specifier of statement.importClause.namedBindings.elements) {
        collectLessonIds(importedSource, (specifier.propertyName || specifier.name).text);
    }
}
const demonstrations = definitions.elements.map(element => {
    const entry = stringProperties(unwrapExpression(element), false);
    for (const required of ['id', 'path', 'family', 'title']) {
        if (!entry[required]) throw new Error(`A demonstration definition is missing ${required}: ${element.getText()}`);
    }
    const headingKey = entry.heading || entry.title;
    const heading = messages[headingKey];
    if (!heading || heading.includes('{')) throw new Error(`Missing plain English heading for ${entry.id}: ${headingKey}`);
    const title = messages[entry.title];
    if (!title || title.includes('{')) throw new Error(`Missing plain English catalog title for ${entry.id}: ${entry.title}`);
    if (!entry.path.startsWith('/bezeg-2.0/')) throw new Error(`Demonstration path must stay under /bezeg-2.0/: ${entry.path}`);
    return {id: entry.id, path: entry.path, family: entry.family, title, heading,
        hasLesson: availableLessonIds.has(entry.id) && lessonContentIds.has(entry.id)};
});

const routePaths = new Set();
const ids = new Set();
for (const demonstration of demonstrations) {
    if (routePaths.has(demonstration.path)) throw new Error(`Duplicate demonstration path: ${demonstration.path}`);
    if (ids.has(demonstration.id)) throw new Error(`Duplicate demonstration id: ${demonstration.id}`);
    routePaths.add(demonstration.path);
    ids.add(demonstration.id);
    if (!familyIds.includes(demonstration.family)) throw new Error(`Unknown demonstration family for ${demonstration.id}: ${demonstration.family}`);
}

module.exports = demonstrations;
module.exports.familyIds = familyIds;
module.exports.availableLessonIds = [...availableLessonIds];
