/**
 * Yellow Grid Mobile - Help & FAQ Screen
 * Frequently asked questions and help topics
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: '1',
    category: 'Getting Started',
    question: 'How do I accept a service order?',
    answer: 'When you receive a new service order, tap on it to view the details. Review the job information, customer location, and scheduled time. If everything looks good, tap the "Accept" button at the bottom of the screen. You will receive a confirmation once the order is assigned to you.',
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'How do I update my availability?',
    answer: 'Go to Profile > Availability Settings. Here you can set your working days, preferred shifts (morning, afternoon, evening), and maximum jobs per day. These settings help the system match you with appropriate service orders.',
  },
  {
    id: '3',
    category: 'Orders',
    question: 'What if I cannot complete a job on the scheduled date?',
    answer: 'If you need to reschedule, open the service order and tap "Request Reschedule". Select a new date and provide a reason. The customer and operator will be notified. Note: Frequent rescheduling may affect your performance rating.',
  },
  {
    id: '4',
    category: 'Orders',
    question: 'How do I mark a job as complete?',
    answer: 'After finishing the work, open the service order and tap "Complete Job". You may be asked to take photos of the completed work and get customer signature. Once submitted, the order status will change to "Completed" and you\'ll receive payment according to your contract terms.',
  },
  {
    id: '5',
    category: 'Orders',
    question: 'What do the different order statuses mean?',
    answer: 'PENDING: Waiting for acceptance\nASSIGNED: Accepted, scheduled for future date\nIN_PROGRESS: Work has started\nCOMPLETED: Job finished successfully\nCANCELLED: Order was cancelled\nON_HOLD: Temporarily paused (e.g., waiting for parts)',
  },
  {
    id: '6',
    category: 'Communication',
    question: 'How do I contact the customer?',
    answer: 'Open the service order and tap the "Chat" tab or the message icon. You can send text messages, photos, or files directly to the customer. All communication is logged for transparency. You can also tap the phone icon to call the customer directly.',
  },
  {
    id: '7',
    category: 'Communication',
    question: 'Who can see the chat messages?',
    answer: 'Chat messages in a service order are visible to you, the customer, the operator (back-office), and your provider manager. This 4-party communication ensures everyone stays informed and issues can be resolved quickly.',
  },
  {
    id: '8',
    category: 'Account',
    question: 'How do I change my password?',
    answer: 'Go to Profile > Change Password. Enter your current password and then your new password twice. Your new password must be at least 8 characters with at least one uppercase letter and one number.',
  },
  {
    id: '9',
    category: 'Account',
    question: 'How do I update my certifications?',
    answer: 'Certifications are managed by your provider administrator. Contact them to add new certifications or update expired ones. You can view your current certifications in Profile > Certifications.',
  },
  {
    id: '10',
    category: 'Technical',
    question: 'Why am I not receiving notifications?',
    answer: 'Check that notifications are enabled in Profile > Notification Settings. Also verify that your phone\'s system settings allow notifications for the Yellow Grid app. If issues persist, try logging out and back in, or contact support.',
  },
];

const HelpFaqScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFaqs = FAQ_ITEMS.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(filteredFaqs.map(f => f.category))];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.gray[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help topics..."
            placeholderTextColor={colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('ContactSupport')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primary[100] }]}>
              <Ionicons name="chatbubbles" size={24} color={colors.primary[600]} />
            </View>
            <Text style={styles.quickActionText}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('TermsPrivacy')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.gray[100] }]}>
              <Ionicons name="document-text" size={24} color={colors.gray[600]} />
            </View>
            <Text style={styles.quickActionText}>Terms & Privacy</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Categories */}
        {categories.map((category) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            <Card style={styles.faqList}>
              {filteredFaqs
                .filter(faq => faq.category === category)
                .map((faq, index, arr) => (
                  <React.Fragment key={faq.id}>
                    <TouchableOpacity
                      style={styles.faqItem}
                      onPress={() => toggleExpand(faq.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.faqHeader}>
                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                        <Ionicons
                          name={expandedId === faq.id ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={colors.gray[400]}
                        />
                      </View>
                      {expandedId === faq.id && (
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      )}
                    </TouchableOpacity>
                    {index < arr.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
            </Card>
          </View>
        ))}

        {filteredFaqs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>
              Try different keywords or contact support for help.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500' as const,
    color: colors.gray[700],
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  faqList: {
    padding: 0,
    overflow: 'hidden',
  },
  faqItem: {
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '500' as const,
    color: colors.gray[900],
    marginRight: spacing.md,
  },
  faqAnswer: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    lineHeight: 22,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default HelpFaqScreen;
