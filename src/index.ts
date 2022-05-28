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

RealtimeHelper.client.connect();
await RabbitMqHelper.init();

const channel = RealtimeHelper.client.channel(
  ImapAccountChannel,
) as RealtimeSubscription;

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

channel.subscribe();
