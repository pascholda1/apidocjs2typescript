import {spawnSync} from 'child_process';
import fs          from 'fs';
import path        from 'path';

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

    staticFiles.forEach(filename => {
      const result = compileTsFile(path.join(__dirname, './api', filename));

      expect(result.status).toBe(0);

    });

  });

});
