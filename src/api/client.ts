import { createStore } from 'zustand/vanilla';
import type { Command, Input, Output, Reply } from '../core/pilot/engine';

type Identity = {
  kind: 'staff' | 'platform';
  token: string;
  expiresAt: number;
};
/** Credentials deliberately live in memory only, never AsyncStorage or URLs. */
export const apiSession = createStore<{ identity: Identity | null }>(() => ({
  identity: null,
}));
export class ApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
const baseUrl = () =>
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ??
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3001' : '');

async function request<T>(
  path: string,
  body?: unknown,
  identity?: { token: string } | null,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      signal: controller.signal,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(identity ? { Authorization: `Bearer ${identity.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const reply = (await response.json()) as Reply<T>;
    if (!reply.ok) {
      if (
        reply.error.code === 'UNAUTHENTICATED' &&
        identity &&
        apiSession.getState().identity === identity
      )
        apiSession.setState({ identity: null });
      throw new ApiError(reply.error.code);
    }
    return reply.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('NETWORK');
  } finally {
    clearTimeout(timer);
  }
}
export async function signIn(
  kind: Identity['kind'],
  email: string,
  password: string,
) {
  const result = await request<{ token: string; expiresAt: number }>(
    `/api/${kind}/sign-in`,
    { email, password },
  );
  apiSession.setState({ identity: { kind, ...result } });
}
export function apiCommand<K extends Command>(
  command: K,
  input: Input<K>,
): Promise<Output<K>> {
  return request(
    `/api/commands/${command}`,
    input ?? {},
    apiSession.getState().identity,
  );
}
export async function signOut() {
  const identity = apiSession.getState().identity;
  if (!identity) return;
  // Keep the session on network failure so the user can retry server revocation.
  await apiCommand(
    identity.kind === 'staff' ? 'staffSignOut' : 'platformSignOut',
    undefined,
  );
  if (apiSession.getState().identity === identity)
    apiSession.setState({ identity: null });
}
export type PublicMenu = Output<'publicVenue'> & {
  onlinePaymentAvailable?: boolean;
};
export const getPublicVenue = (slug: string): Promise<PublicMenu> =>
  request(`/api/venues/${encodeURIComponent(slug)}`);

export function customerCommand<
  K extends
    | 'createQuote'
    | 'createOrder'
    | 'getOrder'
    | 'cancelOrder'
    | 'startOnlinePayment'
    | 'resumeOnlinePayment'
    | 'recheckPayment',
>(command: K, input: Input<K>, token?: string): Promise<Output<K>> {
  return request(`/api/customer/${command}`, input, token ? { token } : null);
}
/** Non-secret request identity. Retain it when retrying an uncertain response. */
export const requestKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
