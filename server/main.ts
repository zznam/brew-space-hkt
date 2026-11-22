import { resolve } from 'node:path';
import { openDatabase } from './database';
import { createApiServer } from './http';
import { createVnpayGateway } from './vnpay';
import { createPayments } from './payments';

const db = openDatabase(
  resolve(process.env.BREWSPACE_DB ?? '.data/brewspace.sqlite'),
);
if (process.argv.includes('--bootstrap')) {
  try {
    db.bootstrap(
      process.env.BREWSPACE_ADMIN_EMAIL ?? '',
      process.env.BREWSPACE_ADMIN_PASSWORD ?? '',
    );
    console.log(
      'Platform administrator created. Start the API with npm run api.',
    );
  } finally {
    db.close();
  }
} else {
  if (!db.initialized()) {
    db.close();
    throw new Error(
      'Run npm run api:bootstrap with administrator credentials first.',
    );
  }
  const gateway = process.env.VNPAY_TMN_CODE
    ? createVnpayGateway({
        tenantId: process.env.VNPAY_TENANT_ID ?? '',
        tmnCode: process.env.VNPAY_TMN_CODE,
        hashSecret: process.env.VNPAY_HASH_SECRET ?? '',
        publicOrigin: process.env.BREWSPACE_PUBLIC_ORIGIN ?? '',
        serverIp: process.env.VNPAY_SERVER_IP ?? '127.0.0.1',
        mode:
          process.env.VNPAY_MODE === 'production' ? 'production' : 'sandbox',
      })
    : undefined;
  const payments = createPayments(db, gateway);
  const server = createApiServer(db, {
    gateway,
    allowedOrigins: (
      process.env.BREWSPACE_ALLOWED_ORIGINS ??
      'http://localhost:8081,http://127.0.0.1:8081'
    ).split(','),
  });
  const port = Number(process.env.PORT ?? 3001);
  const publish = () => {
    try {
      db.execute('processFulfilment', undefined);
      db.execute('expireUnpaidOrders', undefined);
    } catch {
      console.error('Fulfilment retry could not access storage.');
    }
  };
  publish();
  const worker = setInterval(publish, 2000);
  worker.unref();
  let querying = false;
  const reconcileWorker = setInterval(() => {
    if (querying) return;
    querying = true;
    void payments
      .reconcile()
      .catch(() =>
        console.error('Payment reconciliation could not access storage.'),
      )
      .finally(() => {
        querying = false;
      });
  }, 30_000);
  reconcileWorker.unref();
  server.listen(port, process.env.BREWSPACE_HOST ?? '127.0.0.1', () =>
    console.log(`BrewSpace API listening on port ${port}.`),
  );
  const close = () => {
    clearInterval(worker);
    clearInterval(reconcileWorker);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}
