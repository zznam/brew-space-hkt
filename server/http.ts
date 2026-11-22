import { randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AppDatabase } from './database';
import {
  contracts,
  signInSchema,
  type ApiCommand,
  customerContracts,
  type CustomerCommand,
} from './contracts';
import type { Reply } from '../src/core/pilot/engine';
import { PilotError, type ErrorCode } from '../src/core/pilot/errors';
import { createPayments } from './payments';
import type { PaymentGateway } from './vnpay';

const statuses: Partial<Record<ErrorCode, number>> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  THROTTLED: 429,
  INTERNAL: 500,
  TENANT_SUSPENDED: 403,
};
const statusFor = (code: ErrorCode) => statuses[code] ?? 400;
function send(
  res: ServerResponse,
  result: Reply<unknown>,
  requestId: string,
  status?: number,
) {
  res.writeHead(status ?? (result.ok ? 200 : statusFor(result.error.code)), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify({ ...result, requestId }));
}
async function readBody(req: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? ''))
    throw new PilotError('VALIDATION', 'Send application/json.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > 64 * 1024)
      throw new PilotError('VALIDATION', 'Request is too large.');
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new PilotError('VALIDATION', 'Invalid JSON.');
  }
}

export function createApiServer(
  db: AppDatabase,
  options: { allowedOrigins?: string[]; gateway?: PaymentGateway } = {},
) {
  const allowed = new Set(options.allowedOrigins ?? []);
  const payments = createPayments(db, options.gateway);
  const server = createServer(async (req, res) => {
    const requestId = randomUUID();
    try {
      const origin = req.headers.origin;
      if (origin && !allowed.has(origin))
        throw new PilotError('FORBIDDEN', 'Origin is not allowed.');
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Authorization, Content-Type',
        );
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      const url = new URL(req.url ?? '/', 'http://api.local');
      const path = url.pathname;
      if (req.method === 'GET' && path === '/api/health') {
        send(
          res,
          { ok: true, data: { ready: db.initialized() } },
          requestId,
          db.initialized() ? 200 : 503,
        );
        return;
      }
      if (!db.initialized())
        throw new PilotError('INTERNAL', 'Service is not initialized.');
      // Never trust X-Forwarded-For from a caller. A proxy must configure its own edge limits.
      const ip = req.socket.remoteAddress ?? 'unknown';
      if (!db.allowRequest(`all:${ip}`, 300, 60_000))
        throw new PilotError('THROTTLED');
      if (req.method === 'GET' && path === '/api/payments/vnpay/ipn') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify(payments.ipn(url.searchParams)));
        return;
      }
      if (req.method === 'GET' && path.startsWith('/api/venues/')) {
        const slug = decodeURIComponent(path.slice('/api/venues/'.length));
        if (!/^[a-z0-9-]{3,80}$/.test(slug)) throw new PilotError('NOT_FOUND');
        const result = db.execute('publicVenue', { slug });
        send(
          res,
          result.ok
            ? {
                ok: true,
                data: {
                  ...result.data,
                  onlinePaymentAvailable: payments.available(
                    result.data.branch.tenantId,
                  ),
                },
              }
            : result,
          requestId,
        );
        return;
      }
      if (req.method !== 'POST') throw new PilotError('NOT_FOUND');
      if (path.startsWith('/api/customer/')) {
        const name = path.slice('/api/customer/'.length);
        if (!Object.hasOwn(customerContracts, name))
          throw new PilotError('NOT_FOUND');
        const command = name as CustomerCommand;
        const token = /^Bearer ([a-f0-9]{64})$/.exec(
          req.headers.authorization ?? '',
        )?.[1];
        if (command !== 'createQuote' && !token)
          throw new PilotError('UNAUTHENTICATED');
        const input = customerContracts[command].safeParse(await readBody(req));
        if (!input.success) throw new PilotError('VALIDATION');
        const auth = { clientId: ip, accessTokens: token ? [token] : [] };
        if (
          command === 'startOnlinePayment' ||
          command === 'resumeOnlinePayment'
        ) {
          send(
            res,
            { ok: true, data: payments.start(input.data as never, auth, ip) },
            requestId,
          );
          return;
        }
        if (command === 'recheckPayment') {
          if (!db.allowRequest(`payment-query:${ip}`, 20, 60_000))
            throw new PilotError('THROTTLED');
          send(
            res,
            await payments.recheck(input.data as never, auth),
            requestId,
          );
          return;
        }
        send(res, db.execute(command, input.data as never, auth), requestId);
        return;
      }
      if (path === '/api/staff/sign-in' || path === '/api/platform/sign-in') {
        if (!db.allowRequest(`login:${ip}`, 20, 300_000))
          throw new PilotError('THROTTLED');
        const input = signInSchema.safeParse(await readBody(req));
        if (!input.success)
          throw new PilotError('VALIDATION', 'Check email and password.');
        send(
          res,
          db.execute(
            path.includes('/staff/') ? 'staffSignIn' : 'platformSignIn',
            input.data,
          ),
          requestId,
        );
        return;
      }
      const command = path.slice('/api/commands/'.length);
      if (
        !path.startsWith('/api/commands/') ||
        !Object.hasOwn(contracts, command)
      )
        throw new PilotError('NOT_FOUND');
      const contract = contracts[command as ApiCommand];
      const token = /^Bearer ([a-f0-9]{64})$/.exec(
        req.headers.authorization ?? '',
      )?.[1];
      if (!token) throw new PilotError('UNAUTHENTICATED');
      const input = contract.schema.safeParse(await readBody(req));
      if (!input.success)
        throw new PilotError('VALIDATION', 'Check the submitted fields.');
      if (
        command === 'startOnlinePayment' ||
        command === 'resumeOnlinePayment'
      ) {
        send(
          res,
          {
            ok: true,
            data: payments.start(
              input.data as never,
              { staffToken: token },
              ip,
            ),
          },
          requestId,
        );
        return;
      }
      if (command === 'recheckPayment') {
        if (!db.allowRequest(`payment-query:${ip}`, 20, 60_000))
          throw new PilotError('THROTTLED');
        send(
          res,
          await payments.recheck(input.data as never, { staffToken: token }),
          requestId,
        );
        return;
      }
      // Runtime schema fixes each input; identity comes only from the Authorization header.
      const result = db.execute(
        command as ApiCommand,
        input.data as never,
        contract.auth === 'staff'
          ? { staffToken: token }
          : { platformToken: token },
      );
      send(res, result, requestId);
    } catch (error) {
      const failure =
        error instanceof PilotError
          ? error
          : new PilotError('INTERNAL', 'The request could not be completed.');
      // No request bodies, credentials, stack traces or database paths in responses/logs.
      if (!res.headersSent)
        send(
          res,
          {
            ok: false,
            error: { code: failure.code, message: failure.message },
          },
          requestId,
        );
      else res.end();
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return server;
}
