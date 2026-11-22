import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useStore } from 'zustand';
import { Text } from 'react-native';
import { ApiError, apiSession, signIn, signOut } from '@/api/client';
import {
  Banner,
  Button,
  Card,
  Screen,
  ScreenHeader,
  TextField,
  styles,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { accessMessages } from './messages';

export const useIdentity = () => useStore(apiSession, (s) => s.identity);
export function ErrorNotice({ code }: { code: string | null }) {
  const { t } = useT(accessMessages);
  if (!code) return null;
  const key =
    {
      NETWORK: 'network',
      UNAUTHENTICATED: 'unauthenticated',
      FORBIDDEN: 'forbidden',
      VALIDATION: 'invalid',
      THROTTLED: 'throttled',
      TENANT_SUSPENDED: 'suspended',
    }[code] ?? 'failed';
  return (
    <Banner tone="danger" role="alert">
      {t(key as keyof typeof accessMessages.en)}
    </Banner>
  );
}
export function useTask() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      return await task();
    } catch (error) {
      setError(error instanceof ApiError ? error.code : 'INTERNAL');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run };
}
export function useRemote<T>(load: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  const identity = useIdentity();
  const [result, setResult] = useState<{
    load: typeof load;
    identity: typeof identity;
    revision: number;
    data: T | null;
    error: string | null;
  } | null>(null);
  useEffect(() => {
    let active = true;
    void load()
      .then((value) => {
        if (active)
          setResult({ load, identity, revision, data: value, error: null });
      })
      .catch((error) => {
        if (active)
          setResult({
            load,
            identity,
            revision,
            data: null,
            error: error instanceof ApiError ? error.code : 'INTERNAL',
          });
      });
    return () => {
      active = false;
    };
  }, [load, identity, revision]);
  const sameSource = result?.load === load && result.identity === identity;
  const current = sameSource && result.revision === revision;
  return {
    data: sameSource ? result.data : null,
    error: current ? result.error : null,
    loading: !current,
    reload,
  };
}
export function RemoteState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  const { t } = useT(accessMessages);
  return (
    <>
      {loading ? <Text style={styles.text}>{t('loading')}</Text> : null}
      <ErrorNotice code={error} />
      {error ? <Button label={t('retry')} onPress={retry} /> : null}
    </>
  );
}
export function SignOut() {
  const { t } = useT(accessMessages);
  const task = useTask();
  return (
    <>
      <Button
        label={t('signOut')}
        disabled={task.busy}
        onPress={() => void task.run(signOut)}
      />
      <ErrorNotice code={task.error} />
    </>
  );
}
export function AccessGate({
  kind,
  children,
}: {
  kind: 'staff' | 'platform';
  children: ReactNode;
}) {
  const identity = useIdentity();
  const { t } = useT(accessMessages);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const task = useTask();
  if (identity?.kind === kind) return children;
  return (
    <Screen>
      <ScreenHeader
        title={t(kind)}
        subtitle={t(kind === 'staff' ? 'signInHint' : 'platformHint')}
      />
      <Card>
        {identity ? (
          <>
            <Text style={styles.text}>
              {t(kind === 'staff' ? 'staffOnly' : 'platformOnly')}
            </Text>
            <SignOut />
          </>
        ) : (
          <>
            <TextField
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              editable={!task.busy}
            />
            <TextField
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              editable={!task.busy}
            />
            <Button
              label={t(task.busy ? 'working' : 'signIn')}
              variant="primary"
              disabled={task.busy || !email || !password}
              onPress={() =>
                void task.run(async () => {
                  await signIn(kind, email.trim(), password);
                  setPassword('');
                })
              }
            />
            <ErrorNotice code={task.error} />
          </>
        )}
      </Card>
    </Screen>
  );
}
