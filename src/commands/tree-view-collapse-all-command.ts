import { container } from 'tsyringe';
import { IExtensionService } from '../services/extension-service';
import { ExtensionServiceSymbol } from '../symbols';

export default async () => {
  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);
  await extension.treeDataProvider.collapseAll();
};
