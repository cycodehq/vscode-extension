import * as vscode from 'vscode';
import { validateConfig } from '../utils/config';
import { container } from 'tsyringe';
import { IStateService } from '../services/state-service';
import { StateServiceSymbol } from '../symbols';

export const getCommonCommand = (command: (...args: never[]) => void | Promise<void>, requiredAuth = true) => {
  return async (...args: never[]) => {
    if (validateConfig()) {
      return;
    }

    const stateService = container.resolve<IStateService>(StateServiceSymbol);
    if (requiredAuth && !stateService.globalState.CliAuthed) {
      vscode.window.showErrorMessage('Please authenticate with Cycode first');
      return;
    }

    await command(...args);
  };
};
