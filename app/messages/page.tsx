'use client';

import { useState, useEffect } from 'react';
import { AgentMessage, MessageType, MessagePriority } from '@/lib/types';
import {
  getMessages,
  markMessageRead,
  deleteMessage,
  getMessageStats,
} from '@/lib/storage';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  Mail,
  MailOpen,
  Trash2,
  Filter,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Users,
  Zap
} from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<AgentMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterSender, setFilterSender] = useState<string>('all');
  const [filterReceiver, setFilterReceiver] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadMessages();

    // Real-time updates every 5 seconds
    const interval = setInterval(loadMessages, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [messages, filterSender, filterReceiver, filterType, filterPriority, filterRead, searchQuery]);

  const loadMessages = () => {
    const allMessages = getMessages();
    setMessages(allMessages);
    setStats(getMessageStats());
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...messages];

    // Filter by sender
    if (filterSender !== 'all') {
      filtered = filtered.filter(m => m.from_agent_id === filterSender);
    }

    // Filter by receiver
    if (filterReceiver !== 'all') {
      filtered = filtered.filter(m => m.to_agent_id === filterReceiver);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.message_type === filterType);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(m => m.priority === filterPriority);
    }

    // Filter by read status
    if (filterRead === 'read') {
      filtered = filtered.filter(m => m.read);
    } else if (filterRead === 'unread') {
      filtered = filtered.filter(m => !m.read);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.subject.toLowerCase().includes(query) ||
        m.content.toLowerCase().includes(query) ||
        m.from_agent_name.toLowerCase().includes(query) ||
        m.to_agent_name.toLowerCase().includes(query)
      );
    }

    setFilteredMessages(filtered);
  };

  const handleMarkAsRead = (messageId: string) => {
    markMessageRead(messageId);
    loadMessages();
  };

  const handleDelete = (messageId: string) => {
    if (confirm('Delete this message?')) {
      deleteMessage(messageId);
      setSelectedMessage(null);
      loadMessages();
    }
  };

  const handleSelectMessage = (message: AgentMessage) => {
    setSelectedMessage(message);
    if (!message.read) {
      handleMarkAsRead(message.message_id);
    }
  };

  const getMessageTypeIcon = (type: MessageType) => {
    switch (type) {
      case 'task_assignment':
        return <Zap size={16} className="text-blue-400" />;
      case 'task_complete':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'request_help':
        return <AlertCircle size={16} className="text-orange-400" />;
      case 'status_update':
        return <Info size={16} className="text-blue-400" />;
      case 'error_report':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'coordination':
        return <Users size={16} className="text-purple-400" />;
      case 'info':
        return <MessageSquare size={16} className="text-slate-400" />;
    }
  };

  const getMessageTypeLabel = (type: MessageType) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getPriorityColor = (priority: MessagePriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-900 text-red-200 border-red-700';
      case 'high':
        return 'bg-orange-900 text-orange-200 border-orange-700';
      case 'normal':
        return 'bg-blue-900 text-blue-200 border-blue-700';
      case 'low':
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const uniqueAgents = Array.from(
    new Set([
      ...messages.map(m => m.from_agent_id),
      ...messages.map(m => m.to_agent_id),
    ])
  ).sort();

  const agentNames: Record<string, string> = {};
  messages.forEach(m => {
    agentNames[m.from_agent_id] = m.from_agent_name;
    agentNames[m.to_agent_id] = m.to_agent_name;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Agent Messages</h1>
            <p className="text-slate-400 mt-1">
              {messages.length} total message{messages.length !== 1 ? 's' : ''}
              {stats && stats.unread > 0 && (
                <span className="ml-2 text-orange-400">({stats.unread} unread)</span>
              )}
            </p>
          </div>
          <Button
            onClick={loadMessages}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="text-center">
              <p className="text-sm text-slate-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-slate-400 mb-1">Unread</p>
              <p className="text-2xl font-bold text-orange-400">{stats.unread}</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-slate-400 mb-1">Urgent</p>
              <p className="text-2xl font-bold text-red-400">{stats.byPriority.urgent}</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-slate-400 mb-1">Errors</p>
              <p className="text-2xl font-bold text-red-400">{stats.byType.error_report}</p>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-slate-400" />
            <h3 className="font-bold text-slate-50">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Sender
              </label>
              <select
                value={filterSender}
                onChange={(e) => setFilterSender(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Senders</option>
                {uniqueAgents.map(agentId => (
                  <option key={agentId} value={agentId}>
                    {agentNames[agentId] || agentId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Receiver
              </label>
              <select
                value={filterReceiver}
                onChange={(e) => setFilterReceiver(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Receivers</option>
                {uniqueAgents.map(agentId => (
                  <option key={agentId} value={agentId}>
                    {agentNames[agentId] || agentId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="task_assignment">Task Assignment</option>
                <option value="task_complete">Task Complete</option>
                <option value="request_help">Request Help</option>
                <option value="status_update">Status Update</option>
                <option value="error_report">Error Report</option>
                <option value="coordination">Coordination</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Status
              </label>
              <select
                value={filterRead}
                onChange={(e) => setFilterRead(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-slate-50 mb-2">No messages found</h3>
          <p className="text-slate-400">
            {messages.length === 0
              ? 'No agent messages yet'
              : 'Try adjusting your filters'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message List */}
          <div className="space-y-3">
            <h2 className="font-bold text-slate-50 mb-4">
              Messages ({filteredMessages.length})
            </h2>
            {filteredMessages.map((message) => (
              <Card
                key={message.message_id}
                className={`cursor-pointer transition ${
                  selectedMessage?.message_id === message.message_id
                    ? 'ring-2 ring-blue-500'
                    : 'hover:border-slate-600'
                } ${!message.read ? 'bg-slate-800/80' : ''}`}
                onClick={() => handleSelectMessage(message)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {message.read ? (
                      <MailOpen size={20} className="text-slate-500" />
                    ) : (
                      <Mail size={20} className="text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getMessageTypeIcon(message.message_type)}
                        <span className="text-xs text-slate-400">
                          {getMessageTypeLabel(message.message_type)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(
                            message.priority
                          )}`}
                        >
                          {message.priority.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="font-medium text-slate-50 mb-1 line-clamp-1">
                      {message.subject}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <span className="font-medium text-blue-400">
                        {message.from_agent_name}
                      </span>
                      <span>→</span>
                      <span className="font-medium text-green-400">
                        {message.to_agent_name}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {message.content}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Message Detail */}
          <div>
            <h2 className="font-bold text-slate-50 mb-4">Message Detail</h2>
            {selectedMessage ? (
              <Card>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getMessageTypeIcon(selectedMessage.message_type)}
                      <span className="text-sm font-medium text-slate-300">
                        {getMessageTypeLabel(selectedMessage.message_type)}
                      </span>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(selectedMessage.message_id)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-slate-50 mb-2">
                      {selectedMessage.subject}
                    </h3>
                    <div
                      className={`inline-block px-3 py-1 rounded border text-xs font-medium ${getPriorityColor(
                        selectedMessage.priority
                      )}`}
                    >
                      Priority: {selectedMessage.priority.toUpperCase()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-700">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">From</p>
                      <p className="text-sm font-medium text-blue-400">
                        {selectedMessage.from_agent_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedMessage.from_agent_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">To</p>
                      <p className="text-sm font-medium text-green-400">
                        {selectedMessage.to_agent_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedMessage.to_agent_id}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-2">Message</p>
                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">
                        {selectedMessage.content}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>
                        Sent: {new Date(selectedMessage.created_at).toLocaleString()}
                      </span>
                      {selectedMessage.read_at && (
                        <span>
                          Read: {new Date(selectedMessage.read_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedMessage.metadata && Object.keys(selectedMessage.metadata).length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Metadata</p>
                      <pre className="bg-slate-900 rounded-lg p-3 border border-slate-700 text-xs text-slate-400 overflow-auto">
                        {JSON.stringify(selectedMessage.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <MessageSquare size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Select a message to view details</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
