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

  // escape double quotes
  const userAgentString = JSON_.stringify(userAgent).replace(/"/g, '\\"');
  return `${CommandParameters.UserAgent}="${userAgentString}"`;
};
