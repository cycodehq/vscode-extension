import {setContext} from '../utils/context';
import {VscodeStates} from '../utils/states';

export default () => {
  setContext(VscodeStates.TreeViewIsOpen, false);
};

