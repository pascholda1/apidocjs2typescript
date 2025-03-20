import ApiDocJS2TypeScript from './ApiDocJS2TypeScript';

const apidocFolder = process.argv[2];
if (!apidocFolder) {
  throw new Error('Must specify apidoc folder: node apidoc2dts.js ../apidoc/');
}

const generator = new ApiDocJS2TypeScript(apidocFolder, process.argv[3]);
generator.generateRequestModels();
