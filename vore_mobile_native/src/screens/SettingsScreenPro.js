import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from '../styles/appStyles';

const PROFILE_TYPES = [
  { key: 'service_pro', label: 'Servicos' },
  { key: 'shop', label: 'Loja' },
  { key: 'food', label: 'Restaurante' },
  { key: 'lodging', label: 'Alojamento' },
  { key: 'creator', label: 'Criador' },
];

const APP_LANGUAGES = [
  { key: 'pt-PT', label: 'Portugues' },
  { key: 'en', label: 'English' },
];

const APP_THEMES = [
  { key: 'claro', label: 'Claro' },
  { key: 'escuro', label: 'Escuro' },
];

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

function Section({ title, children }) {
  return (
    <View style={styles.settingsSection}>
      <Text style={styles.settingsSectionTitle}>{title}</Text>
      <View style={styles.settingsCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreenPro({
  user,
  onLogout,
  isGuest,
  onLoginPress,
  isProfessional = true,
  professionalSettings,
  saving = false,
  saveError = '',
  onSaveProfessionalSettings,
}) {
  const accountType = String(user?.account_type || (isProfessional ? 'professional' : 'common')).toLowerCase();
  const isCommon = !isGuest && (accountType === 'common' || isProfessional === false);
  const accountTypeText = isGuest ? 'Modo convidado' : isCommon ? 'Conta Pessoal' : 'Conta Profissional';

  const [form, setForm] = useState({
    accountName: '',
    accountEmail: '',
    profileType: 'service_pro',
    category: '',
    location: '',
    instagram: '',
    website: '',
    whatsapp: '',
    manageTabsEnabled: true,
    manageOrderEnabled: true,
    manageVisibilityEnabled: true,
    promoEnabled: false,
    promoDuration: '7 dias',
    notifVisits: true,
    notifShares: true,
    notifPromos: true,
    appLanguage: 'pt-PT',
    appTheme: 'claro',
  });

  useEffect(() => {
    if (!professionalSettings || typeof professionalSettings !== 'object') return;
    setForm((prev) => ({ ...prev, ...professionalSettings }));
  }, [professionalSettings]);

  const hasChanges = useMemo(() => {
    if (!professionalSettings || typeof professionalSettings !== 'object') return true;
    return JSON.stringify(form) !== JSON.stringify({ ...form, ...professionalSettings });
  }, [form, professionalSettings]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (typeof onSaveProfessionalSettings !== 'function') return;
    await onSaveProfessionalSettings(form);
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
          <Section title="Conta">
            <Text style={styles.formLabel}>Nome do negócio/perfil</Text>
            <TextInput
              value={String(form.accountName || '')}
              onChangeText={(value) => setField('accountName', value)}
              placeholder="Nome"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Text style={styles.formLabel}>Email de acesso</Text>
            <TextInput
              value={String(form.accountEmail || '')}
              onChangeText={(value) => setField('accountEmail', value)}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Text style={styles.formHint}>Alterar palavra-passe fica para a próxima fase.</Text>
          </Section>

          <Section title="Perfil profissional">
            <Text style={styles.formLabel}>Tipo de perfil</Text>
            <View style={styles.chipsWrap}>
              {PROFILE_TYPES.map((item) => {
                const active = form.profileType === item.key;
                return (
                  <Pressable
                    key={`stype-${item.key}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setField('profileType', item.key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.formLabel}>Categoria principal</Text>
            <TextInput
              value={String(form.category || '')}
              onChangeText={(value) => setField('category', value)}
              placeholder="Categoria"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.formLabel}>Localização</Text>
            <TextInput
              value={String(form.location || '')}
              onChangeText={(value) => setField('location', value)}
              placeholder="Cidade e pais"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.formLabel}>Instagram</Text>
            <TextInput
              value={String(form.instagram || '')}
              onChangeText={(value) => setField('instagram', value)}
              placeholder="@username"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.formLabel}>Website</Text>
            <TextInput
              value={String(form.website || '')}
              onChangeText={(value) => setField('website', value)}
              placeholder="https://..."
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.formLabel}>WhatsApp</Text>
            <TextInput
              value={String(form.whatsapp || '')}
              onChangeText={(value) => setField('whatsapp', value)}
              placeholder="+351..."
              keyboardType="phone-pad"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </Section>

            <Section title="Gestão de conteúdo">
            <ToggleRow
              label="Abas ativas"
              value={!!form.manageTabsEnabled}
              onToggle={() => setField('manageTabsEnabled', !form.manageTabsEnabled)}
            />
            <ToggleRow
              label="Ordem das abas"
              value={!!form.manageOrderEnabled}
              onToggle={() => setField('manageOrderEnabled', !form.manageOrderEnabled)}
            />
            <ToggleRow
              label="Visibilidade de itens"
              value={!!form.manageVisibilityEnabled}
              onToggle={() => setField('manageVisibilityEnabled', !form.manageVisibilityEnabled)}
            />
          </Section>

           <Section title="Promoções">
            <ToggleRow
               label="Promoções ativas"
              value={!!form.promoEnabled}
              onToggle={() => setField('promoEnabled', !form.promoEnabled)}
            />
            <Text style={styles.formLabel}>Duração das promoções</Text>
            <TextInput
              value={String(form.promoDuration || '')}
              onChangeText={(value) => setField('promoDuration', value)}
              placeholder="Ex: 7 dias"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </Section>

           <Section title="Notificações">
            <ToggleRow
              label="Novas visitas ao perfil"
              value={!!form.notifVisits}
              onToggle={() => setField('notifVisits', !form.notifVisits)}
            />
            <ToggleRow
              label="Novas partilhas do perfil"
              value={!!form.notifShares}
              onToggle={() => setField('notifShares', !form.notifShares)}
            />
            <ToggleRow
               label="Alertas de promoções"
              value={!!form.notifPromos}
              onToggle={() => setField('notifPromos', !form.notifPromos)}
            />
          </Section>

          <Section title="App">
            <Text style={styles.formLabel}>Idioma</Text>
            <View style={styles.chipsWrap}>
              {APP_LANGUAGES.map((item) => {
                const active = form.appLanguage === item.key;
                return (
                  <Pressable
                    key={`lang-${item.key}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setField('appLanguage', item.key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.formLabel}>Tema</Text>
            <View style={styles.chipsWrap}>
              {APP_THEMES.map((item) => {
                const active = form.appTheme === item.key;
                return (
                  <Pressable
                    key={`theme-${item.key}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setField('appTheme', item.key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Suporte e legal">
            <Text style={styles.formHint}>Ajuda, contacto e termos ficam ligados na próxima fase.</Text>
          </Section>

          {!!saveError && <Text style={styles.authError}>{saveError}</Text>}

          <Pressable
            style={[styles.primaryBtnWide, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryBtnText}>{saving ? 'A guardar...' : 'Guardar alteracoes'}</Text>
          </Pressable>

          {!hasChanges && <Text style={styles.formHint}>Sem alteracoes por guardar.</Text>}
        </>
      ) : (
        <Section title="Conta pessoal">
          <Text style={styles.formHint}>Vamos definir a versao pessoal a seguir.</Text>
        </Section>
      )}

      {!isGuest && (
        <Pressable style={styles.primaryBtn} onPress={onLogout}>
          <Text style={styles.primaryBtnText}>Terminar sessao</Text>
        </Pressable>
      )}
    </View>
  );
}
