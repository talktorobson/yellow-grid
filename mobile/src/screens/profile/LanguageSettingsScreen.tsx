/**
 * Yellow Grid Mobile - Language Settings Screen
 * Select app display language
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
];

const LanguageSettingsScreen: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('fr');

  const handleLanguageSelect = (code: string) => {
    if (code === selectedLanguage) return;
    
    Alert.alert(
      'Change Language',
      'Changing the language will restart the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Change', 
          onPress: () => {
            setSelectedLanguage(code);
            // In production, would save to AsyncStorage and reload app
            Alert.alert('Language Changed', 'The app language has been updated.');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Language</Text>
          <Card style={styles.currentCard}>
            <Text style={styles.currentFlag}>
              {LANGUAGES.find(l => l.code === selectedLanguage)?.flag}
            </Text>
            <View style={styles.currentInfo}>
              <Text style={styles.currentName}>
                {LANGUAGES.find(l => l.code === selectedLanguage)?.nativeName}
              </Text>
              <Text style={styles.currentSubtext}>
                {LANGUAGES.find(l => l.code === selectedLanguage)?.name}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={colors.success[600]} />
          </Card>
        </View>

        {/* Available Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Languages</Text>
          <Card style={styles.languageList}>
            {LANGUAGES.map((language, index) => (
              <React.Fragment key={language.code}>
                <TouchableOpacity
                  style={styles.languageItem}
                  onPress={() => handleLanguageSelect(language.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageName}>{language.nativeName}</Text>
                    <Text style={styles.languageSubtext}>{language.name}</Text>
                  </View>
                  {selectedLanguage === language.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success[600]} />
                  )}
                </TouchableOpacity>
                {index < LANGUAGES.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </Card>
        </View>

        {/* Info */}
        <Card style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={colors.info[600]} />
          <Text style={styles.infoText}>
            Language settings affect the app interface only. Service order content and messages from customers remain in their original language.
          </Text>
        </Card>
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.success[50],
    borderWidth: 2,
    borderColor: colors.success[200],
  },
  currentFlag: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  currentInfo: {
    flex: 1,
  },
  currentName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
  },
  currentSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  languageList: {
    padding: 0,
    overflow: 'hidden',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500' as const,
    color: colors.gray[900],
  },
  languageSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: 60,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.info[50],
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.info[700],
    marginLeft: spacing.sm,
  },
});

export default LanguageSettingsScreen;
