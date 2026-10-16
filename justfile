set positional-arguments
set shell := ["node", "--eval"]

# Show the available Bezeg workflows.
default:
    @console.log('Bezeg developer commands: just check | typecheck | unit [args...] | check-localization | build | smoke [args...] | smoke-built [args...] | smoke-lesson <id>... [args...] | preview [port] | loc <pattern> | ci [sha] | tooling-test')

# Run typecheck, all unit tests, then a provenance-recorded production build.
check:
    @require('./scripts/commands.cjs').cli(['check'])

# Typecheck once with the local compiler.
typecheck:
    @require('./scripts/commands.cjs').cli(['typecheck'])

# Run unit tests once and forward all arguments to Vitest.
unit *args:
    @require('./scripts/commands.cjs').cli(['unit', ...process.argv.slice(2)])

# Run typecheck and a provenance-recorded production build.
check-localization:
    @require('./scripts/commands.cjs').cli(['check-localization'])

# Build the production app and record local provenance.
build:
    @require('./scripts/commands.cjs').cli(['build'])

# Build the app, then run Playwright smoke checks.
smoke *args:
    @require('./scripts/commands.cjs').cli(['smoke', ...process.argv.slice(2)])

# Run smoke checks against a provenance-validated existing build.
smoke-built *args:
    @require('./scripts/commands.cjs').cli(['smoke-built', ...process.argv.slice(2)])

# Run guided-lesson smoke rows for the given lesson ids against the existing build.
smoke-lesson +args:
    @require('./scripts/commands.cjs').cli(['smoke-lesson', ...process.argv.slice(2)])

# Show localization keys whose key or sl/en text matches a case-insensitive regex.
loc pattern:
    @require('./scripts/commands.cjs').cli(['loc', ...process.argv.slice(2)])

# Show recent workflow runs for master or a commit, with a short excerpt of a failed run.
ci *args:
    @require('./scripts/commands.cjs').cli(['ci', ...process.argv.slice(2)])

# Serve the provenance-validated production build in the foreground.
preview *args:
    @require('./scripts/commands.cjs').cli(['preview', ...process.argv.slice(2)])

# Run the focused Node tests for this command runner.
tooling-test:
    @require('./scripts/commands.cjs').cli(['tooling-test'])
