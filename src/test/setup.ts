/*
 * mocha setup (see "test" script in package.json).
 * redirects imports of the "vscode" module to the mock, which allows to run unit tests without VS Code
 */
import 'reflect-metadata';
import Module from 'module';
import * as vscodeMock from './vscode-mock';

type RequireFunction = (this: NodeJS.Module, id: string) => unknown;

const modulePrototype = Module.prototype as unknown as { require: RequireFunction };
const originalRequire = modulePrototype.require;

modulePrototype.require = function (this: NodeJS.Module, id: string) {
  if (id === 'vscode') {
    return vscodeMock;
  }

  return originalRequire.call(this, id);
};
