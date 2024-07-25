import {
  NodeClient,
  defaultStackParser,
  getDefaultIntegrations,
  makeNodeTransport,
  Scope,
} from '@sentry/node';
import {
  SENTRY_DEBUG,
  SENTRY_DSN,
  SENTRY_INCLUDE_LOCAL_VARIABLES,
  SENTRY_SAMPLE_RATE,
  SENTRY_SEND_DEFAULT_PII,
} from './constants';
import {config} from './utils/config';

// filter integrations that use the global variable
// it will prevent conflicts with other extensions that use Sentry
const integrations = getDefaultIntegrations({}).filter(
    (defaultIntegration) => {
      return !['OnUncaughtException', 'OnUnhandledRejection', 'Modules', 'LocalVariablesAsync'].includes(
          defaultIntegration.name,
      );
    },
);

const _isSentryDisabled = (): boolean => {
  return config.isOnPremiseInstallation;
};

const _getSentryRelease = (): string => {
  return `${config.agentName}@${config.agentVersion}`;
};

const scope = new Scope();

export const initSentry = () => {
  // we are creating our own client instead of calling Sentry.init() because we are in the shared environment
  // other VS Code extensions might call Sentry.init() with their own configuration which will conflict with ours
  const client = new NodeClient({
    dsn: SENTRY_DSN,
    debug: SENTRY_DEBUG,
    release: _getSentryRelease(),
    serverName: '',
    beforeSend: (event) => {
      event.server_name = ''; // somehow client options are not applied to the event

      if (_isSentryDisabled()) {
        return null;
      }

      return event;
    },
    sampleRate: SENTRY_SAMPLE_RATE,
    sendDefaultPii: SENTRY_SEND_DEFAULT_PII,
    includeLocalVariables: SENTRY_INCLUDE_LOCAL_VARIABLES,
    transport: makeNodeTransport,
    stackParser: defaultStackParser,
    integrations: integrations,
  });

  scope.setClient(client);

  client.init(); // initializing has to be done after setting the client on the scope
};

export const setSentryUser = (userId: string, tenantId: string) => {
  scope.setTag('tenant_id', tenantId);
  scope.setUser({id: userId, tenant_id: tenantId});
};

export const captureException = (error: unknown) => {
  scope.captureException(error);
};

export default scope;
