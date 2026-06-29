/**
 * Default route table.
 *
 * This is a sample. Real consumers replace it with their own. The
 * adapter itself is vendor-neutral; this module exists so the package
 * is usable out of the box and so the seven kernel verbs
 * (start/stop/status/health/modules/config/version) have a parallel
 * HTTP entry point.
 *
 * Event shape (consumer-defined):
 *
 *   { "event": "status" | "health" | "modules" | "config"
 *            | "start" | "stop",
 *     "requestId": string }
 *
 * Hermes commands are routed from the `event` string. The HTTP
 * response body is the value side of Hermes's Result (success), or the
 * REST envelope's error side (Hermes failure).
 *
 * The set is constrained to whatever HermesPort exposes. `version` is
 * not on the port (it lives on Hermes itself); consumers wanting a
 * version endpoint should call into the kernel directly or expose a
 * custom route.
 */
import type { HermesPort } from '@agent-os/hermes';
import { err, ok, type Result } from '@agent-os/core';
import type {
  HandlerError,
  ParsedRequest,
  ResponseBody,
  WebhookMethod,
  WebhookRoute,
  WebhookRouteHandler,
} from './types.js';

type WebhookEvent = 'start' | 'stop' | 'status' | 'health' | 'modules' | 'config';

interface WebhookEventPayload {
  readonly event?: string;
  readonly requestId?: string;
}

const handlerError = (code: string, message: string): HandlerError => ({ code, message });

const readEvent = (parsed: ParsedRequest): Result<WebhookEventPayload, HandlerError> => {
  if (parsed.json === null || typeof parsed.json !== 'object') {
    return err(handlerError('BAD_REQUEST', 'request body must be a JSON object'));
  }
  return ok(parsed.json as WebhookEventPayload);
};

const isKnownEvent = (s: string | undefined): s is WebhookEvent =>
  s === 'start' ||
  s === 'stop' ||
  s === 'status' ||
  s === 'health' ||
  s === 'modules' ||
  s === 'config';

const callHermes = async (
  event: WebhookEvent,
  hermes: HermesPort,
): Promise<Result<ResponseBody, HandlerError>> => {
  switch (event) {
    case 'start': {
      const r = await hermes.start();
      return r.ok
        ? ok({ status: 200, body: { phase: hermes.status().phase } })
        : err(handlerError('HERMES', r.error.message));
    }
    case 'stop': {
      const r = await hermes.stop();
      return r.ok
        ? ok({ status: 200, body: { phase: hermes.status().phase } })
        : err(handlerError('HERMES', r.error.message));
    }
    case 'status':
      return ok({ status: 200, body: hermes.status() });
    case 'health': {
      const report = await hermes.health();
      return ok({ status: 200, body: report });
    }
    case 'modules':
      return ok({ status: 200, body: { count: hermes.status().modules } });
    case 'config':
      return ok({ status: 200, body: hermes.config });
  }
};

const webhookEventHandler: WebhookRouteHandler = async (parsed, hermes) => {
  const payloadResult = readEvent(parsed);
  if (!payloadResult.ok) return payloadResult;
  const event = payloadResult.value.event;
  if (!isKnownEvent(event)) {
    return err(handlerError('BAD_REQUEST', `unknown event: ${event ?? '(missing)'}`));
  }
  return callHermes(event, hermes);
};

const healthProbeHandler: WebhookRouteHandler = async (_parsed, hermes) => {
  return ok({
    status: 200,
    body: {
      adapter: 'healthy',
      hermesPhase: hermes.status().phase,
    },
  });
};

export const defaultRouteTable = (): readonly WebhookRoute[] => {
  const routes: { method: WebhookMethod; path: string; handler: WebhookRouteHandler }[] = [
    { method: 'POST', path: '/webhook', handler: webhookEventHandler },
    { method: 'GET', path: '/health', handler: healthProbeHandler },
  ];
  return routes;
};
