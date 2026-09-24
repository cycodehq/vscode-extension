import { CommandParameters } from './constants';
import JSON_ from '../utils/json_';
import { config } from '../utils/config';

interface UserAgent {
  appName: string;
  appVersion: string;
  envName: string;
  envVersion: string;
}

export const getUserAgentArg = () => {
  const userAgent: UserAgent = {
    appName: config.agentName,
    appVersion: config.agentVersion,
    envName: config.envName,
    envVersion: config.envVersion,
  };

  // passed as a single argv entry (no shell), so no quoting or escaping is needed
  return `${CommandParameters.UserAgent}=${JSON_.stringify(userAgent)}`;
};
