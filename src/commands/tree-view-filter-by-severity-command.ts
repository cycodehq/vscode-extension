import { container } from 'tsyringe';
import { ExtensionServiceSymbol, StateServiceSymbol } from '../symbols';
import vscode from 'vscode';
import { IStateService } from '../services/state-service';
import { IExtensionService } from '../services/extension-service';

const _SEVERITY_NAMES: readonly string[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

const treeViewFilterBySeverityCallback = (severityName: string, enabled: boolean) => {
  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  const tempState = stateService.tempState;

  switch (severityName) {
    case 'Critical':
      tempState.IsTreeViewFilterByCriticalSeverityEnabled = enabled;
      break;
    case 'High':
      tempState.IsTreeViewFilterByHighSeverityEnabled = enabled;
      break;
    case 'Medium':
      tempState.IsTreeViewFilterByMediumSeverityEnabled = enabled;
      break;
    case 'Low':
      tempState.IsTreeViewFilterByLowSeverityEnabled = enabled;
      break;
    case 'Info':
      tempState.IsTreeViewFilterByInfoSeverityEnabled = enabled;
      break;
  }

  stateService.save();
  extension.treeDataProvider.refresh();
};

export default (context: vscode.ExtensionContext): void => {
  for (const severity of _SEVERITY_NAMES) {
    const enableFilterCommandId = `cycode.enableFilterBy${severity}Severity`;
    context.subscriptions.push(
      vscode.commands.registerCommand(
        enableFilterCommandId, () => { treeViewFilterBySeverityCallback(severity, true); },
      ),
    );

    const disableFilterCommandId = `cycode.disableFilterBy${severity}Severity`;
    context.subscriptions.push(
      vscode.commands.registerCommand(
        disableFilterCommandId, () => { treeViewFilterBySeverityCallback(severity, false); },
      ),
    );
  }
};
