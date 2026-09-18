import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { IncomingMessage, ServerResponse } from 'http';
// `import express from 'express'` compiles to `express_1.default(...)` under
// this project's tsconfig (no esModuleInterop) - express is a plain CommonJS
// `module.exports = fn`, so that default never exists at runtime. The
// TS-specific import-equals form binds directly to module.exports instead.
import express = require('express');
import type { Express } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * Vercel serverless entrypoint.
 *
 * This is an alternative to src/main.ts, not a replacement - main.ts still runs
 * the app as a normal long-lived server (local dev, or any traditional host).
 * This file exists because the backend has run out of free tiers on every
 * platform that hosts a persistent server (Railway, Render, Fly.io), so it
 * needs to run as a Vercel serverless function instead - Vercel's free tier
 * has no time-limited trial.
 *
 * The Nest app is built once per warm container and reused across invocations
 * (see `cachedApp` below); a cold start pays the cost of NestFactory.create()
 * once, which is the main source of first-request latency on this platform.
 */

let cachedApp: Express | null = null;

async function getApp(): Promise<Express> {
  if (cachedApp) return cachedApp;

  const expressInstance = express();
  const adapter = new ExpressAdapter(expressInstance);

  // rawBody: true is required for the Paystack webhook, which verifies a
  // signature computed over the exact raw request bytes (see
  // PaystackService.verifyWebhookSignature and PaymentController.webhook).
  const nestApp = await NestFactory.create(AppModule, adapter, { rawBody: true });

  configureApp(nestApp);

  await nestApp.init();

  cachedApp = expressInstance;
  return expressInstance;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app(req, res);
}
