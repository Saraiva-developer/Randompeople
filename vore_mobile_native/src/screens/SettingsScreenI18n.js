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

export default function SettingsScreenI18n({
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
  const L = String(currentLanguage || 'pt').toLowerCase();
  const accountType = String(user?.account_type || (isProfessional ? 'professional' : 'common')).toLowerCase();
  const isCommon = !isGuest && (accountType === 'common' || isProfessional === false);
  const accountTypeText = isGuest
    ? t(L, 'settings_mode_guest')
    : isCommon
    ? t(L, 'settings_account_personal')
    : t(L, 'settings_account_professional');

  const [notifNewVisits, setNotifNewVisits] = useState(true);
  const [notifShares, setNotifShares] = useState(true);
  const [notifPromos, setNotifPromos] = useState(true);
  const [profileActive, setProfileActive] = useState(true);
  const [shareReceiveEnabled, setShareReceiveEnabled] = useState(true);
  const [sharePreviewEnabled, setSharePreviewEnabled] = useState(true);

  const businessName = useMemo(() => String(user?.name || 'Perfil profissional').trim(), [user?.name]);
  const languageLabel = L === 'en' ? 'English' : L === 'es' ? 'Español' : 'Português';

  return (
    <View>
      <View style={styles.panel}>
        <Text style={styles.profileName}>{t(L, 'title_settings')}</Text>
        <Text style={styles.profileMeta}>{isGuest ? t(L, 'settings_mode_guest') : user?.email || ''}</Text>
        <Text style={styles.formHint}>{accountTypeText}</Text>
      </View>

      {isGuest ? (
        <Pressable style={styles.primaryBtn} onPress={onLoginPress}>
          <Text style={styles.primaryBtnText}>{t(L, 'settings_login')}</Text>
        </Pressable>
      ) : !isCommon ? (
        <>
          <SettingsSection title={t(L, 'settings_section_account')}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.settingsRowLabel}>{businessName}</Text>
                <Text style={styles.settingsRowHint}>{t(L, 'settings_business_name_hint')}</Text>
              </View>
            </View>
            <SettingsRow label={t(L, 'settings_credentials')} hint={String(user?.email || '')} onPress={onOpenAccountCredentials} />
            <SettingsRow label={t(L, 'settings_edit_profile')} hint={t(L, 'settings_edit_profile_hint')} onPress={onOpenProfessionalProfile} />
            <ToggleRow label={t(L, 'settings_profile_active')} value={profileActive} onToggle={() => setProfileActive((prev) => !prev)} />
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_section_notifications')}>
            <ToggleRow label={t(L, 'settings_alert_visits')} value={notifNewVisits} onToggle={() => setNotifNewVisits((prev) => !prev)} />
            <ToggleRow label={t(L, 'settings_alert_shares')} value={notifShares} onToggle={() => setNotifShares((prev) => !prev)} />
            <ToggleRow label={t(L, 'settings_alert_promos')} value={notifPromos} onToggle={() => setNotifPromos((prev) => !prev)} />
            <SettingsRow label={t(L, 'settings_open_notifications')} hint={t(L, 'settings_see_all')} onPress={onOpenNotifications} />
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_section_app')}>
            <SettingsRow label={t(L, 'settings_language')} hint={languageLabel} onPress={onOpenLanguage} />
            <SettingsRow label={t(L, 'settings_theme')} hint={t(L, 'settings_theme_light')} onPress={onOpenApp} />
            <SettingsRow label={t(L, 'settings_clear_cache')} onPress={onOpenApp} />
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_section_support')}>
            <SettingsRow label={t(L, 'settings_help')} onPress={onOpenSupportLegal} />
            <SettingsRow label={t(L, 'settings_contact')} onPress={onOpenSupportLegal} />
            <SettingsRow label={t(L, 'settings_terms')} onPress={onOpenSupportLegal} />
          </SettingsSection>
        </>
      ) : (
        <>
          <SettingsSection title={t(L, 'settings_section_account')}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.settingsRowLabel}>{String(user?.name || '').trim() || t(L, 'settings_account_personal')}</Text>
                <Text style={styles.settingsRowHint}>{String(user?.email || '').trim()}</Text>
              </View>
            </View>
            <SettingsRow
              label={t(L, 'settings_credentials')}
              hint={t(L, 'settings_personal_credentials_hint')}
              onPress={onOpenAccountCredentials}
            />
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_language')}>
            <SettingsRow
              label={t(L, 'settings_language')}
              hint={languageLabel}
              onPress={onOpenLanguage}
            />
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_section_notifications')}>
            <ToggleRow
              label={t(L, 'settings_personal_notif_shares')}
              value={notifShares}
              onToggle={() => setNotifShares((prev) => !prev)}
            />
            <ToggleRow
              label={t(L, 'settings_personal_notif_new_profiles')}
              value={notifPromos}
              onToggle={() => setNotifPromos((prev) => !prev)}
            />
            <SettingsRow
              label={t(L, 'settings_open_notifications')}
              hint={t(L, 'settings_see_all')}
              onPress={onOpenNotifications}
            />
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_personal_privacy')}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.settingsRowLabel}>{t(L, 'settings_personal_privacy_private')}</Text>
                <Text style={styles.settingsRowHint}>{t(L, 'settings_personal_privacy_private_hint')}</Text>
              </View>
            </View>
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_personal_private_shares')}>
            <ToggleRow
              label={t(L, 'settings_personal_private_receive')}
              value={shareReceiveEnabled}
              onToggle={() => setShareReceiveEnabled((prev) => !prev)}
            />
            <ToggleRow
              label={t(L, 'settings_personal_private_preview')}
              value={sharePreviewEnabled}
              onToggle={() => setSharePreviewEnabled((prev) => !prev)}
            />
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_personal_support')}>
            <SettingsRow label={t(L, 'settings_help')} onPress={onOpenSupportLegal} />
            <SettingsRow label={t(L, 'settings_contact')} onPress={onOpenSupportLegal} />
          </SettingsSection>

          <SettingsSection title={t(L, 'settings_personal_terms')}>
            <SettingsRow label={t(L, 'settings_terms')} onPress={onOpenSupportLegal} />
          </SettingsSection>
        </>
      )}

      {!isGuest && (
        <Pressable style={styles.primaryBtn} onPress={onLogout}>
          <Text style={styles.primaryBtnText}>{t(L, 'settings_logout')}</Text>
        </Pressable>
      )}
    </View>
  );
}
