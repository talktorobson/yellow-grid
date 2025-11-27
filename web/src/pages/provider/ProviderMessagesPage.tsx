/**
 * Provider Messages Page
 * 
 * Unified messaging center for provider communication with customers,
 * operators, and system notifications.
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Search, Filter, MessageSquare, User, Send, Paperclip, 
  Image, CheckCheck, Clock, Star, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read';
  attachments?: { type: 'image' | 'file'; name: string }[];
}

interface Conversation {
  id: string;
  type: 'customer' | 'operator' | 'system';
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  jobReference?: string;
  messages: Message[];
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    type: 'customer',
    name: 'Jean Dupont',
    lastMessage: 'Merci pour le travail, tout fonctionne parfaitement!',
    lastMessageTime: '10:30',
    unreadCount: 1,
    jobReference: 'JOB-2025-001234',
    messages: [
      { id: 'm1', content: 'Bonjour, je confirme le rendez-vous pour demain à 9h', timestamp: '09:00', isOwn: false, status: 'read' },
      { id: 'm2', content: 'Parfait, je serai là. Pourriez-vous me confirmer l\'adresse exacte?', timestamp: '09:15', isOwn: true, status: 'read' },
      { id: 'm3', content: '15 Rue de la Paix, 75015 Paris. Code: 4521B', timestamp: '09:20', isOwn: false, status: 'read' },
      { id: 'm4', content: 'Merci! À demain alors', timestamp: '09:25', isOwn: true, status: 'read' },
      { id: 'm5', content: 'Merci pour le travail, tout fonctionne parfaitement!', timestamp: '10:30', isOwn: false, status: 'delivered' },
    ],
  },
  {
    id: '2',
    type: 'customer',
    name: 'Marie Martin',
    lastMessage: 'À quelle heure arrivez-vous?',
    lastMessageTime: '09:45',
    unreadCount: 2,
    jobReference: 'JOB-2025-001235',
    messages: [
      { id: 'm1', content: 'Bonjour, intervention prévue pour 14h', timestamp: '08:00', isOwn: true, status: 'read' },
      { id: 'm2', content: 'D\'accord, merci', timestamp: '08:30', isOwn: false, status: 'read' },
      { id: 'm3', content: 'À quelle heure arrivez-vous?', timestamp: '09:45', isOwn: false, status: 'delivered' },
    ],
  },
  {
    id: '3',
    type: 'operator',
    name: 'Sophie (Opérateur)',
    lastMessage: 'Nouvelle intervention urgente assignée',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    messages: [
      { id: 'm1', content: 'Bonjour, nous avons une intervention urgente pour vous', timestamp: 'Yesterday 14:00', isOwn: false, status: 'read' },
      { id: 'm2', content: 'Client: Paul Bernard - Panne électrique complète', timestamp: 'Yesterday 14:01', isOwn: false, status: 'read' },
      { id: 'm3', content: 'Je prends en charge', timestamp: 'Yesterday 14:15', isOwn: true, status: 'read' },
      { id: 'm4', content: 'Nouvelle intervention urgente assignée', timestamp: 'Yesterday 16:00', isOwn: false, status: 'read' },
    ],
  },
  {
    id: '4',
    type: 'system',
    name: 'Yellow Grid System',
    lastMessage: 'Votre paiement de €450 a été traité',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    messages: [
      { id: 'm1', content: 'Votre paiement de €450 a été traité', timestamp: 'Yesterday 18:00', isOwn: false, status: 'read' },
      { id: 'm2', content: 'Référence: PAY-2025-00456', timestamp: 'Yesterday 18:00', isOwn: false, status: 'read' },
    ],
  },
];

const getStatusIcon = (status: Message['status']) => {
  switch (status) {
    case 'sent': return <Clock className="w-3 h-3 text-gray-400" />;
    case 'delivered': return <CheckCheck className="w-3 h-3 text-gray-400" />;
    case 'read': return <CheckCheck className="w-3 h-3 text-blue-500" />;
    default: return null;
  }
};

const getConversationTypeColor = (type: Conversation['type']): string => {
  switch (type) {
    case 'customer': return 'bg-green-500';
    case 'operator': return 'bg-blue-500';
    case 'system': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

export default function ProviderMessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'operator' | 'system'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = mockConversations.filter(conv => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || conv.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // Send message logic here
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-6">
        {/* Conversations List */}
        <div className="w-80 flex-shrink-0 card flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-9 text-sm"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {(['all', 'customer', 'operator', 'system'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={clsx(
                    'px-3 py-1 text-xs rounded-full transition-colors',
                    filterType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={clsx(
                  'w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  selectedConversation?.id === conv.id && 'bg-primary-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {conv.type === 'system' ? (
                        <AlertCircle className="w-5 h-5 text-gray-500" />
                      ) : (
                        <User className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className={clsx(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                      getConversationTypeColor(conv.type)
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">{conv.name}</p>
                      <span className="text-xs text-gray-500">{conv.lastMessageTime}</span>
                    </div>
                    {conv.jobReference && (
                      <p className="text-xs text-primary-600">{conv.jobReference}</p>
                    )}
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 card flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className={clsx(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                    getConversationTypeColor(selectedConversation.type)
                  )} />
                </div>
                <div>
                  <p className="font-medium">{selectedConversation.name}</p>
                  {selectedConversation.jobReference && (
                    <p className="text-xs text-primary-600">{selectedConversation.jobReference}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation.type === 'customer' && (
                  <button className="p-2 hover:bg-gray-100 rounded-lg" title="Rate Customer">
                    <Star className="w-5 h-5 text-gray-500" />
                  </button>
                )}
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="More Options">
                  <Filter className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx(
                    'flex',
                    message.isOwn ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={clsx(
                      'max-w-[70%] rounded-lg p-3',
                      message.isOwn
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((att) => (
                          <div
                            key={att.name}
                            className={clsx(
                              'flex items-center gap-2 p-2 rounded text-xs',
                              message.isOwn ? 'bg-primary-700' : 'bg-gray-200'
                            )}
                          >
                            {att.type === 'image' ? <Image className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                            <span className="truncate">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={clsx(
                      'flex items-center justify-end gap-1 mt-1',
                      message.isOwn ? 'text-primary-200' : 'text-gray-500'
                    )}>
                      <span className="text-xs">{message.timestamp}</span>
                      {message.isOwn && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedConversation.type !== 'system' && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      rows={1}
                      className="input w-full resize-none text-sm"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="Attach File">
                      <Paperclip className="w-5 h-5 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="Send Image">
                      <Image className="w-5 h-5 text-gray-500" />
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="btn btn-primary p-2"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 card flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
