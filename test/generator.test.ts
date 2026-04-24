import {spawnSync}          from 'child_process';
import fs                   from 'fs';
import path                 from 'path';
import {http, HttpResponse} from 'msw';
import {server}             from './server';
import ApiDocJS2TypeScript  from '../src/ApiDocJS2TypeScript';

describe('generator test', () => {
  const generatedTypeDirs = [
    'endpoints',
    'requests',
    'responses',
  ];

  const actionFiles = [
    'Category_official.ts',
    'City.ts',
    'User.ts',
    'Warnings.ts',
  ];

  const staticFiles = [
    'Endpoint.ts',
    'RequestService.ts',
    'RequestServiceError.ts',
  ];

  beforeAll(() => {
    fs.rmSync('./test/api', {recursive: true, force: true});

    const result = spawnSync(
        'node',
        [
          './dist/index.js',
          '--docs-json=./test/data/api-data.json',
          '--out=./test/api',
        ],
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        },
    );

    expect(result.stderr).toContain('Documentation Error: Path parameter name is not present the action URL (/user). Parameter will be skipped!');
    expect(result.stderr).toContain('Documentation Error: Path parameter id is not present the action URL (/resource/:resId). Parameter will be skipped!');
    expect(result.stderr).toContain('Documentation Error: Path parameter oops is not present the action URL (/user/:id). Parameter will be skipped!');
    expect(result.stderr).toContain('Documentation Error: Path parameter id is not present the action URL (/api/school/students/:studentId/cloth). Parameter will be skipped!');
    expect(result.stderr).toContain('Documentation Error: Path parameter name is not present the action URL (/api/school/students/:studentId/cloth). Parameter will be skipped!');

    expect(result.status).toBe(0);
  });

  test('all generated files exist', () => {

    generatedTypeDirs.forEach(typeDir => {

      const files = fs.readdirSync(path.join(__dirname, './api/default', typeDir));
      actionFiles.forEach(expectedFilename => {
        expect(files).toContain(expectedFilename);
      });

    });

    expect(fs.readdirSync(path.join(__dirname, './api/default/requests/types'))).toContain('request-types.ts');

    const files = fs.readdirSync(path.join(__dirname, './api'));
    staticFiles.forEach(expectedFilename => {
      expect(files).toContain(expectedFilename);
    });
  });

  test('can compile generated files', () => {

    const compileTsFile = (filename: string) => {
      return spawnSync('npx', [
        'tsc',
        filename,
        '--noEmit',
        '--strict',
      ], {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    };

    generatedTypeDirs.forEach(typeDir => {
      actionFiles.forEach(filename => {
        const result = compileTsFile(path.join(__dirname, './api/default', typeDir, filename));

        expect(result.status).toBe(0);

      });
    });

    const requestTypesResult = compileTsFile(path.join(__dirname, './api/default/requests/types/request-types.ts'));
    expect(requestTypesResult.status).toBe(0);

    staticFiles.forEach(filename => {
      const result = compileTsFile(path.join(__dirname, './api', filename));

      expect(result.status).toBe(0);

    });

  });

  describe('type deduplication', () => {

    test('identical nested types are deduplicated within a file', () => {
      const content = fs.readFileSync('./test/api/default/responses/User.ts', 'utf-8');

      // Profile and Options each appear in exactly one export type declaration
      expect((content.match(/^export type Profile = /mg) ?? []).length).toBe(1);
      expect((content.match(/^export type Options = /mg) ?? []).length).toBe(1);

      // The interfaces reference the named types instead of inlining
      expect(content).toContain('profile: Profile');
      expect(content).toContain('options: Options[]');
    });

    test('top-level request groups are not merged across interfaces', () => {
      const types  = fs.readFileSync('./test/api/default/requests/types/request-types.ts', 'utf-8');
      const city   = fs.readFileSync('./test/api/default/requests/City.ts', 'utf-8');

      // Each group gets its own named type prefixed with the interface name
      expect(types).toContain('export type CreateCityRequestHeader');
      expect(types).toContain('export type CreateCityRequestPath');
      expect(types).toContain('export type CreateCityRequestQuery');
      expect(types).toContain('export type CreateCityRequestBody');

      // The interface file imports and references those types
      expect(city).toContain("from './types/request-types'");
      expect(city).toContain('header?: CreateCityRequestHeader');

      // path must not reuse the Header type even though both are empty
      expect(city).not.toMatch(/path\??: \w*Header/);
    });

    test('conflicting type names are prefixed with the parent interface name', () => {
      const types = fs.readFileSync('./test/api/default/requests/types/request-types.ts', 'utf-8');

      // DeleteUserRequest and GetUserRequest both have a header group but with different shapes
      expect(types).toContain('export type DeleteUserRequestHeader');
      expect(types).toContain('export type GetUserRequestHeader');
    });

  });

  describe('--inline-types flag', () => {
    const outDir = './test/api-inline';

    beforeAll(() => {
      fs.rmSync(outDir, {recursive: true, force: true});

      spawnSync(
          'node',
          [
            './dist/index.js',
            '--docs-json=./test/data/api-data.json',
            `--out=${outDir}`,
            '--inline-types',
          ],
          {encoding: 'utf-8', stdio: 'pipe'},
      );
    });

    afterAll(() => {
      fs.rmSync(outDir, {recursive: true, force: true});
    });

    test('no extracted type declarations in request files', () => {
      const content = fs.readFileSync(path.join(outDir, 'default/requests/City.ts'), 'utf-8');

      // With --inline-types no separate export type declarations for objects or unions
      expect(content).not.toMatch(/^export type \w+ = \{/m);
      expect(content).not.toMatch(/^export type \w+ = '/m);
    });

    test('union types are rendered inline', () => {
      const content = fs.readFileSync(path.join(outDir, 'default/requests/City.ts'), 'utf-8');

      // With --inline-types the union is inlined directly on the field
      expect(content).toContain("view:'Aerial' | 'Land' | 'Underwater'");
    });

    test('nested object types are rendered inline', () => {
      const content = fs.readFileSync(path.join(outDir, 'default/requests/User.ts'), 'utf-8');

      // extraInfo is an inline object block, not a named type reference
      expect(content).toMatch(/extraInfo\??: \{/);
    });

    test('can compile inline-types generated files', () => {
      const result = spawnSync('npx', [
        'tsc',
        path.join(outDir, 'default/requests/City.ts'),
        path.join(outDir, 'default/requests/User.ts'),
        path.join(outDir, 'default/responses/User.ts'),
        '--noEmit',
        '--strict',
      ], {encoding: 'utf-8', stdio: 'pipe'});

      expect(result.status).toBe(0);
    });

  });

  describe('--no-request-service flag', () => {
    const outDir = './test/api-no-rs';

    beforeAll(() => {
      fs.rmSync(outDir, {recursive: true, force: true});

      spawnSync(
          'node',
          [
            './dist/index.js',
            '--docs-json=./test/data/api-data.json',
            `--out=${outDir}`,
            '--no-request-service',
          ],
          {encoding: 'utf-8', stdio: 'pipe'},
      );
    });

    afterAll(() => {
      fs.rmSync(outDir, {recursive: true, force: true});
    });

    test('RequestService.ts is not copied', () => {
      expect(fs.existsSync(path.join(outDir, 'RequestService.ts'))).toBe(false);
    });

    test('other static files are still copied', () => {
      expect(fs.existsSync(path.join(outDir, 'Endpoint.ts'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, 'RequestServiceError.ts'))).toBe(true);
    });

  });

  describe('URL-based docs-json', () => {
    const outDir = './test/api-url';
    const docsUrl = 'http://test.apidocjs/api-data.json';

    beforeAll(async () => {
      fs.rmSync(outDir, {recursive: true, force: true});

      const apiData = JSON.parse(fs.readFileSync('./test/data/api-data.json', 'utf-8'));
      server.use(
          http.get(docsUrl, () => HttpResponse.json(apiData)),
      );

      const generator = new ApiDocJS2TypeScript(docsUrl, 'default', outDir);
      await generator.loadData();
      generator.cleanApiDir()
          .generateRequestModels()
          .generateResponseModels()
          .generateEndpointDefinitions();
    });

    afterAll(() => {
      fs.rmSync(outDir, {recursive: true, force: true});
    });

    test('generates request, response and endpoint files from a URL', () => {
      ['requests', 'responses', 'endpoints'].forEach(typeDir => {
        ['User.ts', 'City.ts'].forEach(file => {
          expect(fs.existsSync(path.join(outDir, 'default', typeDir, file))).toBe(true);
        });
      });
      expect(fs.existsSync(path.join(outDir, 'default/requests/types/request-types.ts'))).toBe(true);
    });

    test('URL-fetched output matches local-file output', () => {
      const localContent  = fs.readFileSync('./test/api/default/requests/City.ts', 'utf-8');
      const urlContent    = fs.readFileSync(path.join(outDir, 'default/requests/City.ts'), 'utf-8');
      expect(urlContent).toBe(localContent);
    });

  });

});
