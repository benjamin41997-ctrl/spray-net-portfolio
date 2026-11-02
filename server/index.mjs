import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { colors } from '../src/data/colors.js';
import { createApi } from './api.mjs';
import { loadConfig } from './config.mjs';
import { acquireLedgerLock, ConnectionLedger, UsageLedger } from './quota.mjs';
import { connectionFingerprint } from './pairing.mjs';

const config = loadConfig();
const release = config.configured ? acquireLedgerLock(config.dataFile) : () => {};
const ledger = new UsageLedger(config.dataFile, config);
const analysisLedger = new UsageLedger(`${config.dataFile}.analysis`,{...config,maxDaily:60,maxHourly:30,minIntervalMs:1000});
const connections = new ConnectionLedger(`${config.dataFile}.connections`);
const handle = createApi({ config, catalog: colors, reserve: () => ledger.reserve(), reserveAnalysis: () => analysisLedger.reserve(), reserveConnection: request => connections.reserve(connectionFingerprint(request)) });

const server = createServer(async (incoming, outgoing) => {
  const controller = new AbortController();
  outgoing.on('close', () => { if (!outgoing.writableEnded) controller.abort(); });
  const bodyTimeout = setTimeout(() => controller.abort(), 30_000);
  incoming.on('end', () => clearTimeout(bodyTimeout));
  incoming.on('error', () => { clearTimeout(bodyTimeout); controller.abort(); });
  try {
    const request = new Request(new URL(incoming.url, 'http://localhost'), {
      method: incoming.method,
      headers: incoming.headers,
      body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Readable.toWeb(incoming),
      duplex: 'half',
      signal: controller.signal,
    });
    const response = await handle(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    outgoing.end(JSON.stringify({ error: { code: 'invalid_request', message: 'The request could not be read.' } }));
  } finally {
    clearTimeout(bodyTimeout);
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 30;
server.listen(config.port, config.host, () => {
  console.log(`Spray-Net Visualizer API listening on ${config.host}:${config.port}. Rendering ${config.configured ? 'enabled' : 'disabled until configured'}.`);
});
server.on('error', () => { release(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(() => { release(); process.exit(0); });
  setTimeout(() => process.exit(1), config.timeoutMs + 5000).unref();
});
process.on('exit', release);
