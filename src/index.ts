import 'dotenv/config';
import {JobData, RabbitMqHelper} from '@open-mail-archive/rabbitmq-helper';
import {
  GenericPayload,
  DeletePayload,
  InsertPayload,
  RealtimeHelper,
} from '@open-mail-archive/realtime-helper';
import {
  ImapAccountChannel,
  ImapAccountPayload,
  ImapAccountQueue,
} from '@open-mail-archive/types';
import {RealtimeSubscription} from '@supabase/realtime-js';
import {Logger} from '@open-mail-archive/logger';

Logger.Instance.info({
  trace: 'ImapAccountsWorker',
  message: 'Initializing helpers.',
});
RealtimeHelper.client.connect();
await RabbitMqHelper.init();
Logger.Instance.info({
  trace: 'ImapAccountsWorker',
  message: 'Helpers initialized.',
});

Logger.Instance.info({
  trace: 'ImapAccountsWorker',
  message: 'Creating the realtime subscription channel.',
});
const channel = RealtimeHelper.client.channel(
  ImapAccountChannel,
) as RealtimeSubscription;
Logger.Instance.debug({
  trace: 'ImapAccountsWorker',
  message: 'Realtime channel created.',
  data: channel,
});

Logger.Instance.info({
  trace: 'ImapAccountsWorker',
  message: 'Attaching hooks to channel.',
});
channel.on('*', async (payload: GenericPayload) => {
  let messagePayload: ImapAccountPayload;

  switch (payload.type) {
    case 'INSERT':
      messagePayload = (payload as InsertPayload<ImapAccountPayload>).record;
      break;
    case 'DELETE':
      messagePayload = (payload as DeletePayload<ImapAccountPayload>)
        .old_record;
      break;
    case 'UPDATE':
      // nothing to do here
      return;
  }

  await RabbitMqHelper.send(
    ImapAccountQueue,
    new JobData<ImapAccountPayload>(payload.type, messagePayload).toJson(),
  );
});
Logger.Instance.info({
  trace: 'ImapAccountsWorker',
  message: 'Hooks attached',
});

Logger.Instance.info({
  trace: 'ImapAccountsWorker',
  message: 'Subscribing for events...',
});
channel.subscribe();
