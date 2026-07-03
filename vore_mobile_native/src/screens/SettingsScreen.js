import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

export default function SettingsScreen({ user, onLogout, isGuest, onLoginPress, isProfessional = true }) {
  const accountType = String(user?.account_type || (isProfessional ? 'professional' : 'common')).toLowerCase();
  const isCommon = !isGuest && (accountType === 'common' || isProfessional === false);
  const accountTypeText = isGuest ? 'Modo convidado' : isCommon ? 'Conta Pessoal' : 'Conta Profissional';

  const [notifNewVisits, setNotifNewVisits] = useState(true);
  const [notifShares, setNotifShares] = useState(true);
  const [notifPromos, setNotifPromos] = useState(true);
  const [profileActive, setProfileActive] = useState(true);

  const businessName = useMemo(() => String(user?.name || 'Perfil profissional').trim(), [user?.name]);

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
            <SettingsRow label={businessName} hint="Nome do negócio/perfil" />
            <SettingsRow label={String(user?.email || '')} hint="Email de acesso" />
            <SettingsRow label="Alterar palavra-passe" />
          </SettingsSection>

          <SettingsSection title="Perfil profissional">
            <SettingsRow label="Tipo de perfil" hint="Serviços, loja, restaurante, alojamento, criador" />
            <SettingsRow label="Categoria principal" hint="Define como o perfil aparece no Discover" />
            <SettingsRow label="Localização" hint="Cidade e país" />
            <SettingsRow label="Links e redes" hint="Instagram, website, WhatsApp, etc." />
            <ToggleRow label="Perfil ativo" value={profileActive} onToggle={() => setProfileActive((prev) => !prev)} />
          </SettingsSection>

          <SettingsSection title="Gestão de conteúdo">
            <SettingsRow label="Abas ativas" hint="Mostrar/ocultar abas do perfil" />
            <SettingsRow label="Ordem das abas" hint="Reorganizar a navegação do perfil" />
            <SettingsRow label="Visibilidade de itens" hint="Ativar/desativar produtos, serviços e menu" />
          </SettingsSection>

          <SettingsSection title="Promoções">
            <SettingsRow label="Promoções ativas" hint="Gerir campanhas e preços promocionais" />
            <SettingsRow label="Duração das promoções" hint="Datas e validade" />
          </SettingsSection>

          <SettingsSection title="Notificações">
            <ToggleRow label="Novas visitas ao perfil" value={notifNewVisits} onToggle={() => setNotifNewVisits((prev) => !prev)} />
            <ToggleRow label="Novas partilhas do perfil" value={notifShares} onToggle={() => setNotifShares((prev) => !prev)} />
            <ToggleRow label="Alertas de promoções" value={notifPromos} onToggle={() => setNotifPromos((prev) => !prev)} />
          </SettingsSection>

          <SettingsSection title="App">
            <SettingsRow label="Idioma" hint="Português" />
            <SettingsRow label="Tema" hint="Claro" />
            <SettingsRow label="Limpar cache" />
          </SettingsSection>

          <SettingsSection title="Suporte e legal">
            <SettingsRow label="Ajuda" />
            <SettingsRow label="Contacto" />
            <SettingsRow label="Termos e privacidade" />
          </SettingsSection>
        </>
      ) : (
        <SettingsSection title="Conta">
          <SettingsRow label="Conta pessoal" hint="Versão pessoal será definida a seguir" />
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
