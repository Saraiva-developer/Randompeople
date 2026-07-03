import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { t } from '../i18n';
import { styles } from '../styles/appStyles';

const LANGUAGE_OPTIONS = [
  { key: 'pt', label: 'Português' },
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Español' },
];

export default function SettingsLanguageScreen({ currentLanguage = 'pt', onSetAppLanguage, uiLanguage = 'pt' }) {
  const L = String(uiLanguage || 'pt').toLowerCase();
  const [selected, setSelected] = useState(String(currentLanguage || 'pt').toLowerCase());

  useEffect(() => {
    setSelected(String(currentLanguage || 'pt').toLowerCase());
  }, [currentLanguage]);

  function handleSave() {
    if (typeof onSetAppLanguage === 'function') {
      onSetAppLanguage(selected);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.section}>{t(L, 'lang_subtitle')}</Text>
      <View style={styles.chipsWrap}>
        {LANGUAGE_OPTIONS.map((item) => {
          const active = selected === item.key;
          return (
            <Pressable
              key={`lang-${item.key}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelected(item.key)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable style={styles.primaryBtnWide} onPress={handleSave}>
        <Text style={styles.primaryBtnText}>{t(L, 'save')}</Text>
      </Pressable>
    </View>
  );
}
