/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Connection, Channel } from 'amqplib';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private conn!: Connection;
  private ch!: Channel;
  private exchange: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.exchange =
      this.configService.get<string>('rabbitmq.exchange') ||
      'notifications.direct';
    this.logger.setContext(RabbitMQService.name);
  }

  async onModuleInit() {
    const url = process.env.RABBITMQ_URL;
    if (!url) throw new Error('RABBITMQ_URL required');
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    this.conn = await amqp.connect(url);
    this.ch = await this.conn.createChannel();
    await this.ch.assertExchange(this.exchange, 'direct', { durable: true });

    // ensure queues & bindings
    await this.ch.assertQueue('email.queue', { durable: true });
    await this.ch.assertQueue('push.queue', { durable: true });

    await this.ch.bindQueue('email.queue', this.exchange, 'email.queue');
    await this.ch.bindQueue('push.queue', this.exchange, 'push.queue');
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    this.logger.log('rabbitmq connected', { exchange: this.exchange });
  }

  publish(routingKey: string, message: object, options?: Record<string, any>) {
    if (!this.ch) throw new Error('channel not ready');
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const publishOptions = {
      persistent: true,
      ...options,
    };
    const ok = this.ch.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      publishOptions,
    );
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    if (!ok)
      this.logger.warn('publish returned false (backpressure)', { routingKey });
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    return ok;
    /* eslint-enable @typescript-eslint/no-unsafe-return */
  }

  getConnection() {
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    return this.conn;
    /* eslint-enable @typescript-eslint/no-unsafe-return */
  }

  async onModuleDestroy() {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      await this.ch.close();
      await this.conn.close();
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    } catch (err) {
      this.logger.error('Error during RabbitMQ shutdown', err);
    }
  }
}
