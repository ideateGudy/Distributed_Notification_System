/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Connection, Channel } from 'amqplib';
import { AppLoggerService } from '../logger/app-logger.service';

export type StatusUpdateCallback = (message: {
  notification_id: string;
  status: 'pending' | 'processing' | 'delivered' | 'failed' | 'bounced';
  timestamp?: string;
  error?: string;
}) => Promise<void>;

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private conn!: Connection;
  private ch!: Channel;
  private exchange: string;
  private statusCallbacks: StatusUpdateCallback[] = [];

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

    // Ensure notification queues
    await this.ch.assertQueue('email.queue', { durable: true });
    await this.ch.assertQueue('push.queue', { durable: true });

    await this.ch.bindQueue('email.queue', this.exchange, 'email.queue');
    await this.ch.bindQueue('push.queue', this.exchange, 'push.queue');

    // Ensure status queue for receiving status updates from consumer services
    await this.ch.assertQueue('status.queue', { durable: true });
    await this.ch.bindQueue('status.queue', this.exchange, 'status.update');

    // Start listening to status queue
    await this.listenToStatusQueue();
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    this.logger.log('RabbitMQ initialized', {
      exchange: this.exchange,
      queues: ['email.queue', 'push.queue', 'status.queue'],
    });
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

  /**
   * Register a callback to be invoked when status updates arrive
   * Useful for real-time status notifications and updates
   */
  onStatusUpdate(callback: StatusUpdateCallback) {
    this.statusCallbacks.push(callback);
    this.logger.log('Status update callback registered', {
      totalCallbacks: this.statusCallbacks.length,
    });
  }

  /**
   * Listen to status.queue for updates from consumer services
   * Consumer services (email, push, sms) publish status updates here
   * Statuses: pending, processing, delivered, failed, bounced
   */
  private async listenToStatusQueue() {
    if (!this.ch) {
      this.logger.error('Channel not ready for status listener');
      return;
    }

    try {
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
      await this.ch.consume(
        'status.queue',
        async (msg) => {
          if (!msg) return;

          try {
            const content = msg.content.toString();
            /* eslint-disable @typescript-eslint/no-unsafe-argument */
            const statusUpdate = JSON.parse(content);
            /* eslint-enable @typescript-eslint/no-unsafe-argument */

            this.logger.log('Status update received', {
              notification_id: statusUpdate.notification_id,
              status: statusUpdate.status,
              timestamp: statusUpdate.timestamp,
            });

            // Invoke all registered callbacks with the status update
            for (const callback of this.statusCallbacks) {
              try {
                /* eslint-disable @typescript-eslint/no-unsafe-argument */
                await callback(statusUpdate);
                /* eslint-enable @typescript-eslint/no-unsafe-argument */
              } catch (err) {
                this.logger.error('Error in status callback', {
                  error: err instanceof Error ? err.message : String(err),
                  notification_id: statusUpdate.notification_id,
                });
              }
            }

            // Acknowledge the message after successful processing
            this.ch.ack(msg);
          } catch (parseErr) {
            this.logger.error('Error processing status message', {
              error:
                parseErr instanceof Error ? parseErr.message : String(parseErr),
            });
            // Reject and requeue on parse error
            this.ch.nack(msg, false, true);
          }
        },
        { noAck: false }, // Manual acknowledgment
      );
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

      this.logger.log('Status queue listener started', {
        queue: 'status.queue',
      });
    } catch (err) {
      this.logger.error('Failed to start status queue listener', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
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
