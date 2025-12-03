/**
 * Yellow Grid Mobile - Chat Screen
 * 4-party conversation: Customer, Operator, WorkTeam, Provider Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { chatService } from '../../services/chat.service';
import { useChatStore } from '../../store/chat.store';
import { useAuthStore } from '../../store/auth.store';
import type {
  ChatMessage,
  ParticipantType,
} from '../../types/chat.types';

interface RouteParams {
  orderId: string;
  orderNumber?: string;
}

const PARTICIPANT_COLORS: Record<ParticipantType, string> = {
  CUSTOMER: colors.info[500],
  OPERATOR: colors.primary[600],
  WORK_TEAM: colors.success[600],
  PROVIDER_MANAGER: colors.warning[600],
  SYSTEM: colors.gray[500],
};

const PARTICIPANT_LABELS: Record<ParticipantType, string> = {
  CUSTOMER: 'Customer',
  OPERATOR: 'Control Tower',
  WORK_TEAM: 'Work Team',
  PROVIDER_MANAGER: 'Provider',
  SYSTEM: 'System',
};

// Helper to get message status icon
const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
  if (status === 'READ') return 'checkmark-done';
  if (status === 'DELIVERED') return 'checkmark-done-outline';
  return 'checkmark';
};

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId, orderNumber } = route.params as RouteParams;
  const flatListRef = useRef<FlatList>(null);

  const { user } = useAuthStore();
  const {
    activeConversation,
    messages,
    isLoading,
    isSending,
    setActiveConversation,
    setMessages,
    addMessage,
    setLoading,
    setSending,
    setError,
    markConversationRead,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Load conversation
  useEffect(() => {
    loadConversation();
    return () => {
      setActiveConversation(null);
    };
  }, [orderId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const conversation = await chatService.getOrCreateConversation(orderId);
      setActiveConversation(conversation);
      
      // Reverse messages for chronological display (oldest first)
      if (conversation.messages) {
        setMessages([...conversation.messages].reverse());
      }

      // Mark as read if there are unread messages
      if (conversation.unreadCount > 0 && conversation.messages?.length) {
        const lastMessage = conversation.messages[0];
        await chatService.markAsRead(conversation.id, lastMessage.id);
        markConversationRead(conversation.id);
      }

      setHasMore(conversation.messages?.length === 50);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || !activeConversation || messages.length === 0) {
      return;
    }

    setLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const response = await chatService.getMessages(activeConversation.id, {
        cursor: oldestMessage.id,
        take: 50,
        sortOrder: 'desc',
      });

      if (response.data.length > 0) {
        const olderMessages = [...response.data].reverse();
        setMessages([...olderMessages, ...messages]);
      }
      setHasMore(response.meta.hasMore);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeConversation || isSending) {
      return;
    }

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newMessage = await chatService.sendMessage(activeConversation.id, {
        content: messageText,
      });
      addMessage(newMessage);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setInputText(messageText); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const getParticipantInfo = (participantId: string) => {
    if (!activeConversation) return null;
    return activeConversation.participants.find((p) => p.id === participantId);
  };

  const isOwnMessage = (message: ChatMessage) => {
    const participant = getParticipantInfo(message.participantId);
    return participant?.userId === user?.id;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const shouldShowDateHeader = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].createdAt).toDateString();
    const prevDate = new Date(messages[index - 1].createdAt).toDateString();
    return currentDate !== prevDate;
  };

  const renderDateHeader = (dateString: string) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{formatDate(dateString)}</Text>
    </View>
  );

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwn = isOwnMessage(item);
    const participant = getParticipantInfo(item.participantId);
    const participantType = participant?.participantType || 'SYSTEM';
    const participantColor = PARTICIPANT_COLORS[participantType];

    return (
      <>
        {shouldShowDateHeader(index) && renderDateHeader(item.createdAt)}
        <View
          style={[
            styles.messageContainer,
            isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
          ]}
        >
          {!isOwn && (
            <View style={styles.messageHeader}>
              <View
                style={[
                  styles.participantBadge,
                  { backgroundColor: participantColor + '20' },
                ]}
              >
                <Text style={[styles.participantLabel, { color: participantColor }]}>
                  {PARTICIPANT_LABELS[participantType]}
                </Text>
              </View>
              <Text style={styles.senderName}>{participant?.displayName}</Text>
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwn ? styles.ownBubble : styles.otherBubble,
              item.isDeleted && styles.deletedBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText,
                item.isDeleted && styles.deletedText,
              ]}
            >
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isOwn ? styles.ownTime : styles.otherTime,
                ]}
              >
                {formatTime(item.createdAt)}
                {item.isEdited && ' (edited)'}
              </Text>
              {isOwn && (
                <Ionicons
                  name={getStatusIcon(item.status)}
                  size={14}
                  color={item.status === 'READ' ? colors.info[500] : colors.white + '80'}
                  style={styles.statusIcon}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  const renderParticipants = () => {
    if (!activeConversation) return null;

    return (
      <View style={styles.participantsBar}>
        {activeConversation.participants
          .filter((p) => p.isActive)
          .map((p) => (
            <View
              key={p.id}
              style={[
                styles.participantChip,
                { backgroundColor: PARTICIPANT_COLORS[p.participantType] + '20' },
              ]}
            >
              <View
                style={[
                  styles.participantDot,
                  { backgroundColor: PARTICIPANT_COLORS[p.participantType] },
                ]}
              />
              <Text
                style={[
                  styles.participantChipText,
                  { color: PARTICIPANT_COLORS[p.participantType] },
                ]}
                numberOfLines={1}
              >
                {p.displayName}
              </Text>
            </View>
          ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.gray[900]} />
          </TouchableOpacity>
          <Text style={styles.title}>Chat</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.gray[900]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Chat</Text>
          {orderNumber && (
            <Text style={styles.subtitle}>#{orderNumber}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Participants */}
      {renderParticipants()}

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.gray[400]} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start the conversation with the customer, operator, or provider.
              </Text>
            </View>
          }
          onContentSizeChange={() => {
            if (messages.length > 0 && !loadingMore) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={24} color={colors.gray[500]} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.gray[400]}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={5000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  moreButton: {
    padding: spacing.xs,
  },
  placeholder: {
    width: 32,
  },
  participantsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.xs,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  participantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  participantChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    maxWidth: 100,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.gray[500],
  },
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing['2xl'] * 1.5,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[600],
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateHeaderText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  messageContainer: {
    marginBottom: spacing.sm,
    maxWidth: '85%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  participantBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  participantLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  senderName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  ownBubble: {
    backgroundColor: colors.primary[600],
    borderBottomRightRadius: spacing.xs,
  },
  otherBubble: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  deletedBubble: {
    opacity: 0.6,
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
  },
  ownMessageText: {
    color: colors.white,
  },
  otherMessageText: {
    color: colors.gray[900],
  },
  deletedText: {
    fontStyle: 'italic',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  messageTime: {
    fontSize: typography.fontSize.xs,
  },
  ownTime: {
    color: colors.white + '80',
  },
  otherTime: {
    color: colors.gray[400],
  },
  statusIcon: {
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  attachButton: {
    padding: spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    marginHorizontal: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
});

export default ChatScreen;
