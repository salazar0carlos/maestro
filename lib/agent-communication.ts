/**
 * Agent Communication System for Maestro
 * Enables agents to send messages, share context, and coordinate work
 *
 * Message Types:
 * - task_complete: Agent finished task, shares results
 * - need_info: Agent needs information from another
 * - context_share: Agent shares useful context
 * - dependency_alert: Task has dependencies
 */

export type MessageType =
  | 'task_complete'
  | 'need_info'
  | 'context_share'
  | 'dependency_alert'
  | 'error_report'
  | 'status_update';

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: Record<string, any>;
  timestamp: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface TaskCompletePayload {
  task_id: string;
  files_changed?: string[];
  notes?: string;
  success: boolean;
}

export interface NeedInfoPayload {
  question: string;
  context?: string;
  urgency?: 'low' | 'medium' | 'high';
}

export interface ContextSharePayload {
  topic: string;
  info: any;
  tags?: string[];
}

export interface DependencyAlertPayload {
  task_id: string;
  depends_on: string[];
  reason: string;
}

const STORAGE_KEY = 'maestro:agent-messages';

/**
 * Check if we're in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all messages from storage
 */
function getMessages(): AgentMessage[] {
  if (!isBrowser()) return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save messages to storage
 */
function saveMessages(messages: AgentMessage[]): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages:', error);
  }
}

/**
 * Get all agents from storage (referenced from storage.ts)
 */
function getAllAgents(): Array<{ name: string; agent_id: string }> {
  if (!isBrowser()) return [];

  try {
    const data = localStorage.getItem('maestro:agents');
    const agents = data ? JSON.parse(data) : [];
    return agents.map((a: any) => ({
      name: a.agent_name,
      agent_id: a.agent_id
    }));
  } catch {
    return [];
  }
}

export class AgentCommunication {
  /**
   * Send message between agents
   */
  static sendMessage(
    fromAgent: string,
    toAgent: string,
    messageType: MessageType,
    payload: Record<string, any>,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): AgentMessage {
    const message: AgentMessage = {
      id: generateId(),
      from: fromAgent,
      to: toAgent,
      type: messageType,
      payload,
      timestamp: new Date().toISOString(),
      read: false,
      priority,
    };

    const messages = getMessages();
    messages.push(message);
    saveMessages(messages);

    console.log(`[AgentComm] ${fromAgent} → ${toAgent}: ${messageType}`);

    return message;
  }

  /**
   * Get messages for specific agent
   */
  static getMessagesFor(agentName: string, unreadOnly = true): AgentMessage[] {
    const messages = getMessages();
    return messages.filter(
      m => m.to === agentName && (!unreadOnly || !m.read)
    );
  }

  /**
   * Get all messages from specific agent
   */
  static getMessagesFrom(agentName: string): AgentMessage[] {
    const messages = getMessages();
    return messages.filter(m => m.from === agentName);
  }

  /**
   * Get messages between two agents
   */
  static getConversation(agent1: string, agent2: string): AgentMessage[] {
    const messages = getMessages();
    return messages.filter(
      m => (m.from === agent1 && m.to === agent2) ||
           (m.from === agent2 && m.to === agent1)
    ).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Mark message as read
   */
  static markRead(messageId: string): void {
    const messages = getMessages();
    const message = messages.find(m => m.id === messageId);

    if (message) {
      message.read = true;
      saveMessages(messages);
    }
  }

  /**
   * Mark all messages for agent as read
   */
  static markAllRead(agentName: string): void {
    const messages = getMessages();
    let updated = false;

    messages.forEach(m => {
      if (m.to === agentName && !m.read) {
        m.read = true;
        updated = true;
      }
    });

    if (updated) {
      saveMessages(messages);
    }
  }

  /**
   * Broadcast message to all agents
   */
  static broadcast(
    fromAgent: string,
    messageType: MessageType,
    payload: Record<string, any>,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): AgentMessage[] {
    const agents = getAllAgents();
    const sentMessages: AgentMessage[] = [];

    agents.forEach(agent => {
      if (agent.name !== fromAgent) {
        const message = this.sendMessage(
          fromAgent,
          agent.name,
          messageType,
          payload,
          priority
        );
        sentMessages.push(message);
      }
    });

    console.log(`[AgentComm] ${fromAgent} broadcasted ${messageType} to ${sentMessages.length} agents`);

    return sentMessages;
  }

  /**
   * Delete message
   */
  static deleteMessage(messageId: string): boolean {
    const messages = getMessages();
    const filtered = messages.filter(m => m.id !== messageId);

    if (filtered.length === messages.length) {
      return false;
    }

    saveMessages(filtered);
    return true;
  }

  /**
   * Clear all messages
   */
  static clearAllMessages(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Clear old messages (older than specified days)
   */
  static clearOldMessages(daysOld: number): number {
    const messages = getMessages();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const filtered = messages.filter(
      m => new Date(m.timestamp) > cutoffDate
    );

    const deletedCount = messages.length - filtered.length;

    if (deletedCount > 0) {
      saveMessages(filtered);
      console.log(`[AgentComm] Cleared ${deletedCount} old messages`);
    }

    return deletedCount;
  }

  /**
   * Get unread count for agent
   */
  static getUnreadCount(agentName: string): number {
    const messages = getMessages();
    return messages.filter(m => m.to === agentName && !m.read).length;
  }

  /**
   * Get messages by type
   */
  static getMessagesByType(messageType: MessageType): AgentMessage[] {
    const messages = getMessages();
    return messages.filter(m => m.type === messageType);
  }

  /**
   * Get recent messages (limit)
   */
  static getRecentMessages(limit: number = 50): AgentMessage[] {
    const messages = getMessages();
    return messages
      .sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Search messages by content
   */
  static searchMessages(query: string): AgentMessage[] {
    const messages = getMessages();
    const lowerQuery = query.toLowerCase();

    return messages.filter(m => {
      const payloadStr = JSON.stringify(m.payload).toLowerCase();
      return (
        m.type.includes(lowerQuery) ||
        m.from.toLowerCase().includes(lowerQuery) ||
        m.to.toLowerCase().includes(lowerQuery) ||
        payloadStr.includes(lowerQuery)
      );
    });
  }

  /**
   * Get message statistics
   */
  static getStats(): {
    total: number;
    unread: number;
    byType: Record<MessageType, number>;
    byAgent: Record<string, { sent: number; received: number; unread: number }>;
  } {
    const messages = getMessages();
    const byType: Record<string, number> = {};
    const byAgent: Record<string, { sent: number; received: number; unread: number }> = {};

    messages.forEach(m => {
      // Count by type
      byType[m.type] = (byType[m.type] || 0) + 1;

      // Count by agent (sent)
      if (!byAgent[m.from]) {
        byAgent[m.from] = { sent: 0, received: 0, unread: 0 };
      }
      byAgent[m.from].sent++;

      // Count by agent (received)
      if (!byAgent[m.to]) {
        byAgent[m.to] = { sent: 0, received: 0, unread: 0 };
      }
      byAgent[m.to].received++;

      if (!m.read) {
        byAgent[m.to].unread++;
      }
    });

    return {
      total: messages.length,
      unread: messages.filter(m => !m.read).length,
      byType: byType as Record<MessageType, number>,
      byAgent,
    };
  }
}

/**
 * Convenience functions for specific message types
 */

export function sendTaskComplete(
  fromAgent: string,
  toAgent: string,
  payload: TaskCompletePayload
): AgentMessage {
  return AgentCommunication.sendMessage(
    fromAgent,
    toAgent,
    'task_complete',
    payload,
    'high'
  );
}

export function sendNeedInfo(
  fromAgent: string,
  toAgent: string,
  payload: NeedInfoPayload
): AgentMessage {
  const priority = payload.urgency === 'high' ? 'high' : 'medium';
  return AgentCommunication.sendMessage(
    fromAgent,
    toAgent,
    'need_info',
    payload,
    priority
  );
}

export function sendContextShare(
  fromAgent: string,
  toAgent: string,
  payload: ContextSharePayload
): AgentMessage {
  return AgentCommunication.sendMessage(
    fromAgent,
    toAgent,
    'context_share',
    payload,
    'low'
  );
}

export function broadcastContextShare(
  fromAgent: string,
  payload: ContextSharePayload
): AgentMessage[] {
  return AgentCommunication.broadcast(
    fromAgent,
    'context_share',
    payload,
    'low'
  );
}

export function sendDependencyAlert(
  fromAgent: string,
  toAgent: string,
  payload: DependencyAlertPayload
): AgentMessage {
  return AgentCommunication.sendMessage(
    fromAgent,
    toAgent,
    'dependency_alert',
    payload,
    'high'
  );
}
