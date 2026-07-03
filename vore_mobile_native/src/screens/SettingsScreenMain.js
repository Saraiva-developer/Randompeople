import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../i18n';
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

export default function SettingsScreenMain({
  user,
  onLogout,
  isGuest,
  onLoginPress,
  isProfessional = true,
  onOpenProfessionalProfile,
  onOpenAccountCredentials,
  onOpenNotifications,
  onOpenApp,
  onOpenLanguage,
  onOpenSupportLegal,
  currentLanguage = 'pt',
}) {
  const accountType = String(user?.account_type || (isProfessional ? 'professional' : 'common')).toLowerCase();
  const isCommon = !isGuest && (accountType === 'common' || isProfessional === false);
  const accountTypeText = isGuest ? 'Modo convidado' : isCommon ? 'Conta pessoal' : 'Conta profissional';

  const [notifNewVisits, setNotifNewVisits] = useState(true);
  const [notifShares, setNotifShares] = useState(true);
  const [notifPromos, setNotifPromos] = useState(true);
  const [profileActive, setProfileActive] = useState(true);

  const businessName = useMemo(() => String(user?.name || 'Perfil profissional').trim(), [user?.name]);
  const languageLabel =
    String(currentLanguage || 'pt').toLowerCase() === 'en'
      ? 'English'
      : String(currentLanguage || 'pt').toLowerCase() === 'es'
      ? 'Español'
      : 'Português';

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
            <SettingsRow
              label="Credenciais de acesso"
              hint={String(user?.email || '')}
              onPress={onOpenAccountCredentials}
            />

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
            <SettingsRow label="Idioma" hint={languageLabel} onPress={onOpenLanguage} />
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
          <SettingsRow label="Definições da conta pessoal" hint="Abrir perfil pessoal" onPress={onOpenApp} />
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
