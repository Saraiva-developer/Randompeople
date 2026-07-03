import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { t } from '../i18n';
import { styles } from '../styles/appStyles';

export default function SettingsAccountCredentialsScreen({ user, onUpdateAccount, saving = false, saveError = '', currentLanguage = 'pt' }) {
  const L = String(currentLanguage || 'pt').toLowerCase();
  const [email, setEmail] = useState(String(user?.email || ''));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setEmail(String(user?.email || ''));
  }, [user?.email]);

  async function handleSave() {
    if (typeof onUpdateAccount !== 'function') return;
    const trimmedEmail = String(email || '').trim();
    const current = String(currentPassword || '');
    const next = String(newPassword || '');
    const repeat = String(repeatPassword || '');
    const changingPassword = !!next || !!repeat || !!current;

    if (!trimmedEmail) {
      setLocalError('Email inválido.');
      return;
    }
    if (changingPassword) {
      if (!current) {
        setLocalError('Indica a palavra-passe atual.');
        return;
      }
      if (next.length < 8) {
        setLocalError('A nova palavra-passe deve ter pelo menos 8 caracteres.');
        return;
      }
      if (next !== repeat) {
        setLocalError('A repetição da palavra-passe não coincide.');
        return;
      }
    }

    setLocalError('');
    await onUpdateAccount({
      email: trimmedEmail,
      currentPassword: current,
      password: next,
    });
    setCurrentPassword('');
    setNewPassword('');
    setRepeatPassword('');
  }

  return (
    <View>
      <View style={styles.panel}>
        <Text style={styles.section}>{t(L, 'cred_title')}</Text>

        <Text style={styles.formLabel}>{t(L, 'cred_email')}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.formLabel}>{t(L, 'cred_password_current')}</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Palavra-passe atual"
          secureTextEntry
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.formLabel}>{t(L, 'cred_password_new')}</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nova palavra-passe"
          secureTextEntry
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.formLabel}>{t(L, 'cred_password_repeat')}</Text>
        <TextInput
          value={repeatPassword}
          onChangeText={setRepeatPassword}
          placeholder="Repetir nova palavra-passe"
          secureTextEntry
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        {!!localError && <Text style={styles.authError}>{localError}</Text>}
        {!!saveError && <Text style={styles.authError}>{saveError}</Text>}

        <Pressable style={[styles.primaryBtnWide, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryBtnText}>{saving ? t(L, 'saving') : t(L, 'save')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
