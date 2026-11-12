const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const ts = require('typescript');
const {sameCamera} = require('../scripts/demonstration-preview-recipes.cjs');

const root = path.resolve(__dirname, '..');

function assertMotionPosterCamera(demonstration, capture, motion) {
    if (demonstration.view === 'surface') {
        const validCamera = camera => camera && typeof camera === 'object' && !Array.isArray(camera) &&
            Object.keys(camera).sort().join(',') === 'az,distance,el,target' &&
            Number.isFinite(camera.az) && Number.isFinite(camera.el) && Number.isFinite(camera.distance) && camera.distance > 0 &&
            Array.isArray(camera.target) && camera.target.length === 3 && camera.target.every(Number.isFinite);
        // A row's corner drag holds the camera instead of orbiting it; it must hold exactly the poster camera (compared at tolerance 0 below).
        const heldRowDrag = motion.mode === 'pointer-drag' && Boolean(motion.row) && motion.cameraHeld === true;
        if ((motion.mode !== 'surface-orbit' && !heldRowDrag) || capture.framing?.kind !== 'surface-view' ||
            !validCamera(capture.framing.camera) || !validCamera(motion.camera) ||
            !sameCamera(motion.camera, capture.framing.camera, 0)) {
            throw new Error(`Surface poster and clip cameras differ: ${motion.id}`);
        }
        return;
    }
    if (motion.mode === 'surface-orbit' || !Array.isArray(capture.framing?.boardBoundingBox) ||
        JSON.stringify(motion.camera) !== JSON.stringify(capture.framing.boardBoundingBox)) {
        throw new Error(`Poster and clip cameras differ: ${motion.id}`);
    }
}

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
    const filePath = path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath);
    const contents = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const parseErrors = sourceFile.parseDiagnostics;
    if (parseErrors.length) throw new Error(`Cannot parse ${relativePath}: ${parseErrors.map(error => error.messageText).join('; ')}`);
    return sourceFile;
}

const demonstrationSource = parseSource('src/demonstrations.ts');
/**
 * The row object literals of `name`: an array literal whose elements are rows or `...identifier` spreads, each resolved
 * to a variable of the same file or of the module it imports (feature-registered families, see src/graphs/graphLoaders.ts).
 */
function rowElements(sourceFile, name) {
    const array = variableInitializer(sourceFile, name);
    // A spread list may be empty (the legacy table is, once every family registers); the resolved catalog may not.
    if (!ts.isArrayLiteralExpression(array)) {
        throw new Error(`${name} in ${path.basename(sourceFile.fileName)} must remain an array literal.`);
    }
    return array.elements.flatMap(element => {
        if (!ts.isSpreadElement(element)) return [element];
        const spread = unwrapExpression(element.expression);
        if (!ts.isIdentifier(spread)) throw new Error(`Unsupported catalog spread: ${element.getText()}`);
        const local = sourceFile.statements.some(statement => ts.isVariableStatement(statement) &&
            statement.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === spread.text));
        if (local) return rowElements(sourceFile, spread.text);
        const imported = sourceFile.statements.find(statement => ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly &&
            statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings) &&
            statement.importClause.namedBindings.elements.some(binding => binding.name.text === spread.text));
        if (!imported) throw new Error(`Could not resolve catalog spread ${spread.text} in ${path.basename(sourceFile.fileName)}.`);
        const target = path.join(path.dirname(sourceFile.fileName), `${imported.moduleSpecifier.text}.ts`);
        return rowElements(parseSource(target), spread.text);
    });
}
const definitionElements = rowElements(demonstrationSource, 'definitions');
if (definitionElements.length === 0) throw new Error('definitions in demonstrations.ts resolved to no rows.');
const familyDefinitions = variableInitializer(demonstrationSource, 'families');
if (!ts.isArrayLiteralExpression(familyDefinitions) || familyDefinitions.elements.length === 0) {
    throw new Error('The demonstration family catalog must remain a non-empty array literal.');
}
const familyCatalog = familyDefinitions.elements.map(element => {
    const family = stringProperties(unwrapExpression(element), false);
    if (!family.id || !family.title) throw new Error(`A demonstration family is missing its id or title: ${element.getText()}`);
    return {id: family.id, titleKey: family.title};
});
const familyIds = familyCatalog.map(family => family.id);
if (new Set(familyIds).size !== familyIds.length) throw new Error('The demonstration family catalog contains duplicate ids.');

function coordinateContextPolicy(demonstration) {
    return demonstration.family === 'basics' || demonstration.family === '/bezeg-2.0/functions' || demonstration.family === 'analysis'
        ? 'retain'
        : 'hide';
}

const messages = stringProperties(variableInitializer(parseSource('src/localization/en.ts'), 'en'));
// A Demonstration offers a guided lesson unless its definition opts out with `lesson: false` (LESSON_DEMONSTRATION_IDS in src/demonstrations.ts).
const availableLessonIds = new Set(definitionElements.filter(element => {
    const object = unwrapExpression(element);
    if (!ts.isObjectLiteralExpression(object)) throw new Error(`Expected object literal: ${object.getText()}`);
    return !object.properties.some(property => ts.isPropertyAssignment(property) && propertyName(property.name) === 'lesson' &&
        property.initializer.kind === ts.SyntaxKind.FalseKeyword);
}).map(element => stringProperties(unwrapExpression(element), false).id));
// Demonstrations whose catalog manifest carries a motion clip; the rest are still-poster only until their timelines ship.
const manifestMotionIds = new Set((JSON.parse(fs.readFileSync(path.join(root, 'scripts/demonstration-previews/manifest.json'), 'utf8')).motions || []).map(motion => motion.id));
// Demonstrations registered before their poster is captured (src/demonstrationPosterPending.ts); their cards show an empty preview frame.
const pendingDefinition = variableInitializer(parseSource('src/demonstrationPosterPending.ts'), 'POSTER_PENDING');
if (!ts.isArrayLiteralExpression(pendingDefinition) || !pendingDefinition.elements.every(element => ts.isStringLiteral(element))) {
    throw new Error('POSTER_PENDING must remain an array literal of Demonstration ids.');
}
const posterPendingIds = new Set(pendingDefinition.elements.map(element => element.text));
const demonstrations = definitionElements.map(element => {
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
    return {id: entry.id, path: entry.path, family: entry.family, view: entry.view === 'surface' ? 'surface' : 'board', title, heading, hasMotion: manifestMotionIds.has(entry.id),
        hasLesson: availableLessonIds.has(entry.id), hasPoster: !posterPendingIds.has(entry.id)};
});
const families = familyCatalog.map(family => {
    const title = messages[family.titleKey];
    if (!title || title.includes('{')) throw new Error(`Missing plain English title for demonstration family ${family.id}: ${family.titleKey}`);
    return {id: family.id, title, demonstrations: demonstrations.filter(demonstration => demonstration.family === family.id)};
}).filter(family => family.demonstrations.length > 0); // mirrors getDemonstrationCatalog: a family without shipped entries is not rendered

const routePaths = new Set();
const ids = new Set();
for (const demonstration of demonstrations) {
    if (routePaths.has(demonstration.path)) throw new Error(`Duplicate demonstration path: ${demonstration.path}`);
    if (ids.has(demonstration.id)) throw new Error(`Duplicate demonstration id: ${demonstration.id}`);
    routePaths.add(demonstration.path);
    ids.add(demonstration.id);
    if (!familyIds.includes(demonstration.family)) throw new Error(`Unknown demonstration family for ${demonstration.id}: ${demonstration.family}`);
}
for (const id of posterPendingIds) if (!ids.has(id)) throw new Error(`POSTER_PENDING names an unknown Demonstration: ${id}`);

function findVariableDeclaration(sourceFile, name) {
    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.name.text === name) return declaration;
        }
    }
    throw new Error(`Could not find ${name} in ${sourceFile.fileName}`);
}

function validateGeneratedPreviews(catalogDemonstrations, options = {}) {
    const activeDemonstrations = catalogDemonstrations.filter(demonstration => demonstration.hasPoster !== false);
    const previewCapture = require('../scripts/demonstration-preview-capture-api.cjs');
    const catalogDirectory = options.catalogDirectory || path.join(root, 'src/images/demonstrations/catalog');
    const mappingSource = parseSource(options.mappingPath || 'src/demonstrationPreviewAssets.ts');
    const mappingDeclaration = findVariableDeclaration(mappingSource, 'demonstrationPreviewAssets');
    // The map is Partial so a new Demonstration does not block typecheck before capture runs; src/demonstrationPreviewAssets.test.ts reports the gap.
    const partialType = mappingDeclaration.type;
    const recordType = partialType && ts.isTypeReferenceNode(partialType) && ts.isIdentifier(partialType.typeName) && partialType.typeName.text === 'Partial' &&
        partialType.typeArguments?.length === 1 ? partialType.typeArguments[0] : undefined;
    if (!recordType || !ts.isTypeReferenceNode(recordType) || !ts.isIdentifier(recordType.typeName) || recordType.typeName.text !== 'Record' ||
        recordType.typeArguments?.length !== 2 ||
        !ts.isTypeReferenceNode(recordType.typeArguments[0]) ||
        !ts.isIdentifier(recordType.typeArguments[0].typeName) ||
        recordType.typeArguments[0].typeName.text !== 'DemonstrationId' ||
        recordType.typeArguments[1].kind !== ts.SyntaxKind.StringKeyword) {
        throw new Error('The generated preview map must remain typed as Partial<Record<DemonstrationId, string>>.');
    }
    const importedAssets = new Map();
    for (const statement of mappingSource.statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause?.name || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text;
        const match = /^\.\/images\/demonstrations\/catalog\/(.+)\.png$/.exec(specifier);
        if (!match) throw new Error(`Unexpected generated preview import: ${specifier}`);
        if (importedAssets.has(statement.importClause.name.text)) throw new Error(`Duplicate preview import alias: ${statement.importClause.name.text}`);
        importedAssets.set(statement.importClause.name.text, match[1]);
    }
    const mapping = unwrapExpression(mappingDeclaration.initializer);
    if (!ts.isObjectLiteralExpression(mapping)) throw new Error('The generated preview map must be an object literal.');
    const mappedIds = new Map();
    for (const property of mapping.properties) {
        if (!ts.isPropertyAssignment(property)) throw new Error(`Unsupported generated preview map entry: ${property.getText()}`);
        const id = propertyName(property.name);
        const importedAlias = unwrapExpression(property.initializer);
        if (!ts.isIdentifier(importedAlias)) throw new Error(`Preview map entry for ${id} must refer to its imported asset.`);
        if (!importedAssets.has(importedAlias.text)) throw new Error(`Preview map entry for ${id} has no matching image import.`);
        const importedId = importedAssets.get(importedAlias.text);
        if (importedId !== id) throw new Error(`Preview map entry ${id} points to the ${importedId} image.`);
        if (mappedIds.has(id)) throw new Error(`Duplicate generated preview map id: ${id}`);
        mappedIds.set(id, importedAlias.text);
    }

    const activeIds = activeDemonstrations.map(demonstration => demonstration.id).sort();
    const mappedActiveIds = Array.from(mappedIds.keys()).sort();
    if (JSON.stringify(mappedActiveIds) !== JSON.stringify(activeIds)) {
        throw new Error(`Generated preview map must cover every Demonstration outside POSTER_PENDING exactly once. Expected ${activeIds.join(', ')}; found ${mappedActiveIds.join(', ')}.`);
    }
    if (importedAssets.size !== activeDemonstrations.length) {
        throw new Error(`Expected one generated image import per active Demonstration; found ${importedAssets.size}.`);
    }

    const manifestPath = options.manifestPath || path.join(root, 'scripts/demonstration-previews/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.version !== 2) throw new Error('Preview manifest must use recipe provenance version 2.');
    if(!/^[a-f0-9]{64}$/.test(manifest.presentationFingerprint || '')) throw new Error('Missing capture-presentation fingerprint.');
    if (!/^[a-f0-9]{40}$/.test(manifest.graphSourceRevision || '') || !/^[a-f0-9]{64}$/.test(manifest.graphSourceFingerprint || '') || !Array.isArray(manifest.graphDirtyFiles)) throw new Error('Missing source revision/fingerprint provenance.');
    const {recipes, validateRecipes, assertOutcomeEvidence, sameCamera, pointsOutsideFrame, SURFACE_FRAME_MARGIN_PX} = require('../scripts/demonstration-preview-recipes.cjs');
    const {assertNonUniformPixels} = require('../scripts/demonstration-preview-png.cjs');
    // A poster needs a recipe; a pending Demonstration may already carry the recipe its capture will use.
    validateRecipes(catalogDemonstrations.filter(demonstration => demonstration.hasPoster !== false || Object.hasOwn(recipes, demonstration.id)));
    if (manifest.generator !== 'scripts/capture-demonstration-previews.cjs') throw new Error('Preview manifest generator provenance is missing or stale.');
    if (!manifest.capture || manifest.capture.source !== 'live #jgbox from each Demonstration metadata route') {
        throw new Error('Preview manifest must identify live route-default capture provenance.');
    }
    if (!/fresh browser context with empty local\/session storage; exact route without query; route default preset/.test(manifest.capture.scene || '')) {
        throw new Error('Preview manifest must document clean-storage capture from exact default routes.');
    }
    if (!/capture-only .*preview legibility treatment/.test(manifest.capture.scene || '') ||
        !/capture-only .*JSXGraph text/.test(manifest.capture.typography || '') ||
        !/capture-only .*curve strokes scaled/.test(manifest.capture.strokeTreatment || '')) {
        throw new Error('Preview manifest must document capture-only legibility treatment and its source-preserving scope.');
    }
    if (!manifest.capture.viewport || !manifest.capture.frameCssPixels || !manifest.capture.deviceScaleFactor ||
        !manifest.capture.coordinateContextPolicy || !manifest.capture.boundsPolicy || !manifest.capture.containment) {
        throw new Error('Preview manifest is missing capture dimensions, coordinate-context policy, or containment provenance.');
    }
    const frame = manifest.capture.frameCssPixels;
    if (!manifest.image || !Number.isInteger(manifest.image.width) || !Number.isInteger(manifest.image.height)) {
        throw new Error('Preview manifest is missing common generated image dimensions.');
    }
    if (!frame || !Number.isInteger(frame.width) || !Number.isInteger(frame.height) ||
        manifest.image.width !== frame.width * manifest.capture.deviceScaleFactor ||
        manifest.image.height !== frame.height * manifest.capture.deviceScaleFactor) {
        throw new Error('Preview image dimensions do not match the CSS frame and device scale factor.');
    }

    const demonstrationsById = new Map(activeDemonstrations.map(demonstration => [demonstration.id, demonstration]));
    if (!Array.isArray(manifest.captures)) throw new Error('Preview manifest captures must be an array.');
    const capturesById = new Map();
    for (const capture of manifest.captures) {
        if (!demonstrationsById.has(capture.id)) throw new Error(`Preview manifest contains inactive Demonstration ${capture.id}.`);
        if (capturesById.has(capture.id)) throw new Error(`Preview manifest contains duplicate capture ${capture.id}.`);
        const demonstration = demonstrationsById.get(capture.id);
        if (JSON.stringify(capture.recipe) !== JSON.stringify(recipes[capture.id]) || !capture.evidence || !capture.posterCheckpoint) throw new Error(`Missing or stale recipe/outcome provenance for ${capture.id}.`);
        assertOutcomeEvidence(capture.id,capture.evidence);
        if (capture.path !== demonstration.path || capture.file !== `${capture.id}.png`) {
            throw new Error(`Preview manifest route or filename does not match active metadata for ${capture.id}.`);
        }
        const expectedPolicy = coordinateContextPolicy(demonstration);
        if (!['retain', 'hide'].includes(expectedPolicy)) {
            throw new Error(`Invalid shared coordinate-context policy for ${capture.id}: ${expectedPolicy}`);
        }
        if (capture.coordinateContextPolicy !== expectedPolicy || capture.axesAndGrid !== expectedPolicy) {
            throw new Error(`Preview coordinate-context policy for ${capture.id} should be ${expectedPolicy}.`);
        }
        if (capture.image?.width !== manifest.image.width || capture.image?.height !== manifest.image.height) {
            throw new Error(`Preview dimensions for ${capture.id} do not match the common manifest dimensions.`);
        }
        if (capture.framing?.frameCssPixels?.width !== frame.width || capture.framing?.frameCssPixels?.height !== frame.height ||
            capture.board?.width !== frame.width || capture.board?.height !== frame.height) {
            throw new Error(`Preview frame dimensions for ${capture.id} do not match the global capture frame.`);
        }
        if (!/^[a-f0-9]{64}$/.test(capture.sha256 || '')) throw new Error(`Preview checksum is missing for ${capture.id}.`);
        const imagePath = path.join(catalogDirectory, capture.file);
        if (!fs.existsSync(imagePath)) throw new Error(`Generated preview image is missing for ${capture.id}: ${capture.file}`);
        const png = fs.readFileSync(imagePath);
        if (png.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`${capture.file} is not a PNG.`);
        const imageDimensions = {width: png.readUInt32BE(16), height: png.readUInt32BE(20)};
        if (imageDimensions.width !== manifest.image.width || imageDimensions.height !== manifest.image.height ||
            imageDimensions.width !== capture.image.width || imageDimensions.height !== capture.image.height) {
            throw new Error(`PNG dimensions for ${capture.id} do not match its manifest.`);
        }
        const digest = crypto.createHash('sha256').update(png).digest('hex');
        if (digest !== capture.sha256) throw new Error(`PNG checksum for ${capture.id} does not match its manifest.`);
        const framing = capture.framing;
        if (demonstration.view === 'surface') {
            // A surface view has no curve board: its evidence is a real render, the recipe camera and a fully framed control net.
            if (framing?.kind !== 'surface-view' || recipes[capture.id].framing.kind !== 'surface-view') throw new Error(`Surface capture ${capture.id} must carry surface-view framing.`);
            assertNonUniformPixels(png, `Surface preview ${capture.id}`);
            if (!framing.camera || !sameCamera(framing.camera, recipes[capture.id].framing.camera) || !sameCamera(capture.evidence.camera, recipes[capture.id].framing.camera)) {
                throw new Error(`Surface preview camera for ${capture.id} differs from its recipe camera.`);
            }
            const points = framing.projectedControlPoints;
            const declared = recipes[capture.id].framing.controlPointCount;
            if (!Array.isArray(points) || (declared === undefined ? points.length === 0 : points.length !== declared) || points.length !== capture.evidence.controlPointCount ||
                framing.controlPointMarginCssPixels !== SURFACE_FRAME_MARGIN_PX) {
                throw new Error(`Surface preview ${capture.id} is missing its projected control points.`);
            }
            const outside = pointsOutsideFrame(points, frame.width, frame.height);
            if (outside.length || !Array.isArray(framing.outOfFrameElements) || framing.outOfFrameElements.length !== 0) {
                throw new Error(`Surface preview ${capture.id} has control points outside its frame: ${outside.join(', ')}.`);
            }
            capturesById.set(capture.id, capture);
            continue;
        }
        if (!framing || !Array.isArray(framing.boardBoundingBox) || framing.boardBoundingBox.length !== 4 ||
            !framing.boardBoundingBox.every(Number.isFinite) || !framing.sceneBounds ||
            !Number.isFinite(framing.sceneBounds.minX) || !Number.isFinite(framing.sceneBounds.maxX) ||
            !Number.isFinite(framing.sceneBounds.minY) || !Number.isFinite(framing.sceneBounds.maxY) ||
            framing.sceneBounds.minX < framing.boardBoundingBox[0] - 1e-6 ||
            framing.sceneBounds.maxX > framing.boardBoundingBox[2] + 1e-6 ||
            framing.sceneBounds.minY < framing.boardBoundingBox[3] - 1e-6 ||
            framing.sceneBounds.maxY > framing.boardBoundingBox[1] + 1e-6 ||
            !Array.isArray(framing.outOfFrameElements) || framing.outOfFrameElements.length !== 0) {
            throw new Error(`Preview scene containment is invalid for ${capture.id}.`);
        }
        capturesById.set(capture.id, capture);
    }
    if (JSON.stringify(Array.from(capturesById.keys()).sort()) !== JSON.stringify(activeIds)) {
        throw new Error('Preview manifest must contain exactly one capture for every active Demonstration.');
    }

    const generatedPngNames = fs.readdirSync(catalogDirectory).filter(name => name.endsWith('.png')).sort();
    const expectedPngNames = activeDemonstrations.map(demonstration => `${demonstration.id}.png`).sort();
    if (JSON.stringify(generatedPngNames) !== JSON.stringify(expectedPngNames)) {
        throw new Error(`Generated preview files must match the active Demonstration catalog. Expected ${expectedPngNames.join(', ')}; found ${generatedPngNames.join(', ')}.`);
    }
    const motionSource = parseSource(options.motionMappingPath || 'src/demonstrationMotionAssets.ts');
    const motionMap = variableInitializer(motionSource, 'demonstrationMotionAssets');
    if (!ts.isObjectLiteralExpression(motionMap)) throw new Error('Motion delivery map must be an object literal.');
    const motionImports = new Map();
    for (const statement of motionSource.statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause?.name || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const match = /^\.\/images\/demonstrations\/catalog\/(.+\.webm)\?no-inline$/.exec(statement.moduleSpecifier.text);
        if (!match) throw new Error('Unexpected motion import.');
        motionImports.set(statement.importClause.name.text, match[1]);
    }
    const motions = manifest.motions;
    if (!Array.isArray(motions)) throw new Error('Missing motion provenance array.');
    const motionIds = new Set();
    for (const property of motionMap.properties) {
        if (!ts.isPropertyAssignment(property)) throw new Error('Unexpected motion mapping property.');
        const id = propertyName(property.name);
        if (!demonstrationsById.has(id) || motionIds.has(id)) throw new Error(`Inactive or duplicate motion ID: ${id}`);
        motionIds.add(id);
        const fields = unwrapExpression(property.initializer);
        if (!ts.isObjectLiteralExpression(fields)) throw new Error(`Missing motion delivery fields for ${id}`);
        const values = new Map(fields.properties.map(p => [propertyName(p.name), unwrapExpression(p.initializer)]));
        const src = values.get('src'), type = values.get('type'), duration = values.get('duration');
        const motion = motions.find(m => m.id === id);
        if (!motion || !src || !ts.isIdentifier(src) || motionImports.get(src.text) !== motion.file || !type || !ts.isStringLiteral(type) || type.text !== motion.type || !duration || !ts.isNumericLiteral(duration) || Number(duration.text) !== motion.duration) throw new Error(`Motion delivery/provenance mismatch: ${id}`);
        const demonstration = demonstrationsById.get(id);
        const capture = capturesById.get(id);
        assertMotionPosterCamera(demonstration, capture, motion);
        if (previewCapture.isRecipeAligned(id) &&
            (motion.samples?.[0]?.capture?.sha256 !== capturesById.get(id).sha256 || motion.samples?.at(-1)?.capture?.sha256 !== capturesById.get(id).sha256)) {
            throw new Error(`Motion loop does not return to its recipe poster: ${id}`);
        }
        previewCapture.assertMotionEvidence(motion);
        assertMotionBackground(motion);
        const validCamera = demonstration.view === 'surface'
            ? motion.camera && typeof motion.camera === 'object' && !Array.isArray(motion.camera) &&
                Object.keys(motion.camera).sort().join(',') === 'az,distance,el,target' &&
                Number.isFinite(motion.camera.az) && Number.isFinite(motion.camera.el) && Number.isFinite(motion.camera.distance) && motion.camera.distance > 0 &&
                Array.isArray(motion.camera.target) && motion.camera.target.length === 3 && motion.camera.target.every(Number.isFinite)
            : Array.isArray(motion.camera) && motion.camera.length === 4 && motion.camera.every(Number.isFinite);
        if (motion.type !== 'video/webm' || motion.width !== 720 || motion.height !== 440 || motion.duration !== 4 || motion.bytes > 300*1024 || motion.bytes <= 0 || motion.frameCount !== 96 || motion.sampleRate !== 24 || !motion.encoder || !Array.isArray(motion.arguments) || !Array.isArray(motion.samples) || !motion.samples.length || !validCamera) throw new Error(`Invalid motion budget/provenance: ${id}`);
        const file = path.join(catalogDirectory,motion.file);
        if (fs.statSync(file).size !== motion.bytes || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== motion.sha256) throw new Error(`Motion checksum/size mismatch: ${id}`);
        for(const sample of motion.samples) if (!/^[a-f0-9]{64}$/.test(sample.capture?.sha256 || '') || sample.capture.width !== 720 || sample.capture.height !== 440) throw new Error(`Missing lossless frame provenance: ${id}`);
    }
    if(motionIds.size !== motions.length || motionImports.size !== motions.length || new Set(motions.map(m=>m.id)).size !== motions.length) throw new Error('Motion map/imports/manifest coverage mismatch.');
    // Every configured timeline must be delivered, except a Demonstration listed in MOTION_PENDING (src/demonstrationMotionPending.ts; a clip
    // not captured yet, checked by src/demonstrationMotionAssets.test.ts). A delivered clip must always be configured. With an empty list this is the exact comparison.
    const pendingMotion = variableInitializer(parseSource(options.motionPendingPath || 'src/demonstrationMotionPending.ts'), 'MOTION_PENDING');
    if (!ts.isArrayLiteralExpression(pendingMotion)) throw new Error('MOTION_PENDING must remain an array literal.');
    const motionPendingIds = new Set(pendingMotion.elements.map(element => {
        const entry = stringProperties(unwrapExpression(element), false);
        if (!entry.id) throw new Error(`MOTION_PENDING entry without an id: ${element.getText()}`);
        return entry.id;
    }));
    const requiredIds = previewCapture.motionIds.filter(id => !motionPendingIds.has(id));
    if(requiredIds.some(id => !motionIds.has(id)) || [...motionIds].some(id => !previewCapture.motionIds.includes(id))) throw new Error('Motion delivery must cover every configured timeline.');
    const expectedWebm = motions.map(m=>m.file).sort();
    if(JSON.stringify(fs.readdirSync(catalogDirectory).filter(f=>f.endsWith('.webm')).sort()) !== JSON.stringify(expectedWebm)) throw new Error('Generated motion files differ from manifest.');
    return {manifest, map: Object.fromEntries(Array.from(mappedIds.keys(), id => [id, `./images/demonstrations/catalog/${id}.png`]))};
}

/**
 * A clip's colour check samples the cream background. A clip-row capture may instead record a still patch of another colour, with
 * its position, when a moving grid covers every background pixel (spec lesson-guided-catalog-clips, colour check decision).
 */
function assertMotionBackground(motion) {
    const pixel = motion.backgroundPixel;
    const cream = JSON.stringify(pixel?.rgb) === JSON.stringify([255, 253, 245]);
    const rowPatch = Boolean(motion.row) && Array.isArray(pixel?.rgb) && pixel.rgb.length === 3 && Number.isInteger(pixel.x) && Number.isInteger(pixel.y);
    if (!cream && !rowPatch) throw new Error(`Invalid motion background provenance: ${motion.id}`);
}

module.exports = demonstrations;
module.exports.assertMotionBackground = assertMotionBackground;
module.exports.familyIds = familyIds;
module.exports.families = families;
module.exports.availableLessonIds = [...availableLessonIds];
module.exports.coordinateContextPolicy = coordinateContextPolicy;
module.exports.assertMotionPosterCamera = assertMotionPosterCamera;
module.exports.validateGeneratedPreviews = options => validateGeneratedPreviews(demonstrations, options);
