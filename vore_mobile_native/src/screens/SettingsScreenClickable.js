import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/appStyles';

function SettingsSection({ title, children }) {
  return (
    <View style={styles.settingsSection}>
      <Text style={styles.settingsSectionTitle}>{title}</Text>
      <View style={styles.settingsCard}>{children}</View>
    </View>
  );
}

function SettingsRow({ icon = 'chevron-forward', label, hint = '', onPress }) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsRowMain}>
        <Text style={styles.settingsRowLabel}>{label}</Text>
        {!!hint && <Text style={styles.settingsRowHint}>{hint}</Text>}
      </View>
      <Ionicons name={icon} size={16} color="#64748b" />
    </Pressable>
  );
}

function ToggleRow({ label, value, onToggle }) {
  return (
    <Pressable style={styles.settingsRow} onPress={onToggle}>
      <Text style={styles.settingsRowLabel}>{label}</Text>
      <View style={[styles.settingsToggle, value && styles.settingsToggleOn]}>
        <View style={[styles.settingsToggleDot, value && styles.settingsToggleDotOn]} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreenClickable({
  user,
  onLogout,
  isGuest,
  onLoginPress,
  isProfessional = true,
  onOpenAccount,
  onOpenProfessionalProfile,
  onOpenNotifications,
  onOpenApp,
  onOpenSupportLegal,
  onUpdateAccount,
}) {
  const accountType = String(user?.account_type || (isProfessional ? 'professional' : 'common')).toLowerCase();
  const isCommon = !isGuest && (accountType === 'common' || isProfessional === false);
  const accountTypeText = isGuest ? 'Modo convidado' : isCommon ? 'Conta pessoal' : 'Conta profissional';

  const [notifNewVisits, setNotifNewVisits] = useState(true);
  const [notifShares, setNotifShares] = useState(true);
  const [notifPromos, setNotifPromos] = useState(true);
  const [profileActive, setProfileActive] = useState(true);
  const [accountEmail, setAccountEmail] = useState(String(user?.email || ''));
  const [accountPassword, setAccountPassword] = useState('');

  const businessName = useMemo(() => String(user?.name || 'Perfil profissional').trim(), [user?.name]);

  useEffect(() => {
    setAccountEmail(String(user?.email || ''));
  }, [user?.email]);

  async function handleSaveAccount() {
    if (typeof onUpdateAccount !== 'function') return;
    await onUpdateAccount({
      email: String(accountEmail || '').trim(),
      password: String(accountPassword || ''),
    });
    setAccountPassword('');
  }

  return (
    <View>
      <View style={styles.panel}>
        <Text style={styles.profileName}>Definições</Text>
        <Text style={styles.profileMeta}>{isGuest ? 'Modo convidado' : user?.email || ''}</Text>
        <Text style={styles.formHint}>{accountTypeText}</Text>
      </View>

      {isGuest ? (
        <Pressable style={styles.primaryBtn} onPress={onLoginPress}>
          <Text style={styles.primaryBtnText}>Entrar</Text>
        </Pressable>
      ) : !isCommon ? (
        <>
          <SettingsSection title="Conta">
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.settingsRowLabel}>{businessName}</Text>
                <Text style={styles.settingsRowHint}>Nome do negócio/perfil</Text>
              </View>
            </View>
            <Text style={styles.formLabel}>Email de acesso</Text>
            <TextInput
              value={accountEmail}
              onChangeText={setAccountEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Text style={styles.formLabel}>Nova palavra-passe</Text>
            <TextInput
              value={accountPassword}
              onChangeText={setAccountPassword}
              placeholder="Nova palavra-passe"
              secureTextEntry
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Pressable style={styles.secondaryBtnWide} onPress={handleSaveAccount}>
              <Text style={styles.secondaryBtnText}>Guardar conta</Text>
            </Pressable>
            <SettingsRow label="Editar perfil" hint="Abrir edição completa do perfil" onPress={onOpenProfessionalProfile} />
            <ToggleRow label="Perfil ativo" value={profileActive} onToggle={() => setProfileActive((prev) => !prev)} />
          </SettingsSection>

          <SettingsSection title="Notificações">
            <ToggleRow label="Novas visitas ao perfil" value={notifNewVisits} onToggle={() => setNotifNewVisits((prev) => !prev)} />
            <ToggleRow label="Novas partilhas do perfil" value={notifShares} onToggle={() => setNotifShares((prev) => !prev)} />
            <ToggleRow label="Alertas de promoções" value={notifPromos} onToggle={() => setNotifPromos((prev) => !prev)} />
            <SettingsRow label="Abrir notificações" hint="Ver tudo" onPress={onOpenNotifications} />
          </SettingsSection>

          <SettingsSection title="App">
            <SettingsRow label="Idioma" hint="Português" onPress={onOpenApp} />
            <SettingsRow label="Tema" hint="Claro" onPress={onOpenApp} />
            <SettingsRow label="Limpar cache" onPress={onOpenApp} />
          </SettingsSection>

          <SettingsSection title="Suporte e legal">
            <SettingsRow label="Ajuda" onPress={onOpenSupportLegal} />
            <SettingsRow label="Contacto" onPress={onOpenSupportLegal} />
            <SettingsRow label="Termos e privacidade" onPress={onOpenSupportLegal} />
          </SettingsSection>
        </>
      ) : (
        <SettingsSection title="Conta pessoal">
          <SettingsRow label="Definições da conta pessoal" hint="Abrir perfil pessoal" onPress={onOpenAccount} />
        </SettingsSection>
      )}

      {!isGuest && (
        <Pressable style={styles.primaryBtn} onPress={onLogout}>
          <Text style={styles.primaryBtnText}>Terminar sessão</Text>
        </Pressable>
      )}
    </View>
  );
}
