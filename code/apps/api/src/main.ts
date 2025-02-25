/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule, RedisIoAdapter } from './app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  const redisIoAdapter = new RedisIoAdapter(app);
  const configService = app.get<ConfigService>(ConfigService);
  const redisPass = configService.get('REDIS_PASSWORD');

  let redisUrl = redisPass ? `redis://:${redisPass}@` : 'redis://';

  redisUrl += `${configService.get('REDIS_HOST')}:${configService.get(
    'REDIS_PORT'
  )}`;

  await redisIoAdapter.connectToRedis(redisUrl);

  app.useWebSocketAdapter(redisIoAdapter);

  app.setGlobalPrefix(globalPrefix);
  app.enableCors({
    origin: '*',
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const port = configService.get('PORT') || 5000;
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}.`
  );
}

bootstrap();
