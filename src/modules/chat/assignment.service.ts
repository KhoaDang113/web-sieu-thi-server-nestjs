import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { withLock } from '../../shared/redis/redis-lock';
import { ChatGateway } from './chat.getway';
import { ChatService } from './chat.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AssignmentService {
  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    @InjectModel(Conversation.name)
    private convModel: Model<ConversationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly gateway: ChatGateway,
    private readonly chatService: ChatService,
  ) {}

  private async getOnlineAvailableAgents() {
    const staff = await this.userModel
      .find({ role: 'staff' })
      .select('_id')
      .lean();
    const list: { id: string; current: number; max: number }[] = [];
    for (const s of staff) {
      const id = String(s._id);
      const [status, cur, max] = await this.redis.mget(
        `agent:${id}:status`,
        `agent:${id}:current`,
        `agent:${id}:max`,
      );
      const current = parseInt(cur || '0', 10);
      const m = parseInt(max || '3', 10);
      if (status === 'ONLINE' && current < m)
        list.push({ id, current, max: m });
    }
    return list;
  }

  private async pickAgent() {
    const c = await this.getOnlineAvailableAgents();
    if (!c.length) return null;
    const minLoad = Math.min(...c.map((a) => a.current));
    const bucket = c.filter((a) => a.current === minLoad);
    const rr = (await this.redis.incr('rr_index')) - 1;
    return bucket[rr % bucket.length];
  }

  async assignConversation(convId: string) {
    return withLock(this.redis, `lock:assign:${convId}`, 5, async () => {
      const conv = await this.convModel.findById(convId);
      if (!conv || conv.state !== 'PENDING') return conv;

      const agent = await this.pickAgent();
      if (!agent) {
        await this.redis.rpush('queue:waiting', convId);
        this.gateway.emitToConversation(convId, 'queue.waiting', {
          position: await this.redis.llen('queue:waiting'),
        });
        return conv;
      }

      await this.redis.incr(`agent:${agent.id}:current`);
      conv.current_agent_id = new Types.ObjectId(agent.id);
      conv.state = 'OPEN';
      await conv.save();

      await this.chatService.sendAgentIntroductionMessage(convId, agent.id);

      this.gateway.notifyAssigned(convId, agent.id);
      return conv;
    });
  }

  async drainQueue() {
    while (true) {
      const convId = await this.redis.lpop('queue:waiting');
      if (!convId) break;
      const conv = await this.convModel.findById(convId);
      if (!conv || conv.state !== 'PENDING') continue;

      const agent = await this.pickAgent();
      if (!agent) {
        await this.redis.lpush('queue:waiting', convId);
        break;
      }

      await this.redis.incr(`agent:${agent.id}:current`);
      conv.current_agent_id = new Types.ObjectId(agent.id);
      conv.state = 'OPEN';
      await conv.save();

      await this.chatService.sendAgentIntroductionMessage(convId, agent.id);

      this.gateway.notifyAssigned(convId, agent.id);
    }
  }

  async closeConversation(convId: string) {
    const conv = await this.convModel.findById(convId);
    if (!conv) return;

    if (conv.current_agent_id && conv.state === 'OPEN') {
      await this.redis.decr(
        `agent:${conv.current_agent_id.toString()}:current`,
      );
    }

    conv.state = 'CLOSED';
    await conv.save();

    await this.drainQueue();
  }

  async decrementAgentCount(agentId: string) {
    const current = await this.redis.get(`agent:${agentId}:current`);
    if (current && parseInt(current, 10) > 0) {
      await this.redis.decr(`agent:${agentId}:current`);
    }
  }
}
