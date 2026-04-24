# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # Compile TypeScript → dist/
npm test            # Run Jest tests
npm run preversion  # Build + test (used before version bumps)
```

Run a single test file:
```bash
npx jest test/generator.test.ts
```

The `prepare` script runs `build` automatically on `npm install`.

## Architecture

**ApiDocJS2TypeScript** converts ApiDocJS `data.json` API documentation into TypeScript type definitions and a ready-to-use HTTP client. It's both a CLI tool (`apidocjs2typescript`) and an npm package.

### 5-Stage Pipeline

```
CLI args (index.ts)
  → Load ApiDocJS JSON (ApiDocJS2TypeScript.loadData)
  → Parse & group actions by group name (ApiDocJS2TypeScript)
  → Render TypeScript source (TypeScriptRenderer)
  → Write output files + copy static classes
```

### Key Source Files

| File | Role |
|------|------|
| `src/index.ts` | CLI entry; parses minimist args; drives the generator |
| `src/ApiDocJS2TypeScript.ts` | Core orchestrator; loads data, groups actions, calls renderer, writes files |
| `src/TypeScriptRenderer.ts` | Renders interfaces, type aliases, JSDoc from parsed data |
| `src/types.ts` | TypeScript types mirroring the ApiDocJS JSON schema |
| `src/helper/TypeHelper.ts` | Maps ApiDocJS type strings → TypeScript types (including arrays, unions from `allowedValues`, custom string types) |
| `src/helper/FormatHelper.ts` | Converts group/action names to PascalCase interface names |
| `src/helper/TypeCollector.ts` | Accumulates extracted named types during rendering; handles dedup and conflict resolution |
| `static/Endpoint.ts` | Generic `Endpoint<RequestData, ResponseData>` class copied to output |
| `static/RequestService.ts` | XHR-based HTTP client copied to output |
| `static/RequestServiceError.ts` | Custom error class copied to output |

### Output Structure

For a given API, the generator produces:

```
<out>/
  <apiName>/
    requests/<Group>.ts                   # Request interfaces (imports from types/)
    requests/types/request-types.ts       # All extracted request named types (shared across groups)
    responses/<Group>.ts                  # Response interfaces + extracted types (per-file)
    endpoints/<Group>.ts                  # Endpoint instances with type generics
  RequestService.ts                       # XHR HTTP client
  Endpoint.ts                             # Generic endpoint class
  RequestServiceError.ts                  # Error class
```

Request types are extracted into `requests/types/request-types.ts` using a single shared `TypeCollector` across all request groups. Each `requests/<Group>.ts` file imports only the types it references. With `--inline-types`, no types file is written and all types are inlined directly into the interface.

### Parameter Nesting

Request parameters use dot or bracket notation (`nested.value`, `nested[value]`, `nested[value].deep`). `ApiDocJS2TypeScript` uses `lodash _.set()` to build nested object shapes, which are then rendered as nested TypeScript interfaces by `TypeScriptRenderer`.

### Type Mapping

`TypeHelper.ts` maps ApiDocJS type names to TypeScript:
- `string`, `char`, `character` → `string`
- `number`, `int`, `long`, `float`, `double`, `decimal` → `number`
- `boolean`, `bool` → `boolean`
- `object`, `record`, `dictionary` → `object`
- Any of the above with `[]` suffix → array type
- `allowedValues` array on a param → TypeScript union of string literals
- Additional string types configurable via `--string-types` CLI flag

### Build Constraints

- `tsconfig.json` uses `module: NodeNext` (ESM) — imports must use `.js` extensions even for `.ts` source files
- `noUnusedLocals` and `noUnusedParameters` are enabled — remove unused variables before building
- Output goes to `dist/`; the package entry point is `dist/index.js`

### Tests

Tests in `test/generator.test.ts` are integration-style: they spawn the CLI, validate that expected files are generated, and compile the output with `tsc --noEmit`. MSW (Mock Service Worker) is used via `jest.setup.ts` to mock HTTP requests for the `--docs-json=<url>` code path. Test fixtures live in `test/data/api-data.json`.
