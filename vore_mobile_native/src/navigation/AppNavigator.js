import { StatusBar } from 'expo-status-bar';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PersonalProfileScreen from '../screens/PersonalProfileScreen';
import SettingsScreen from '../screens/SettingsScreenI18n';
import SettingsAccountCredentialsScreen from '../screens/SettingsAccountCredentialsScreen';
import SettingsLanguageScreen from '../screens/SettingsLanguageScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { t } from '../i18n';
import { styles } from '../styles/appStyles';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TYPE_CATEGORY_MAP = {
  service_pro: 'Serviços',
  food: 'Restaurante',
  shop: 'Loja',
  lodging: 'Alojamento',
  creator: 'Criador',
};

function buildOwnerDraftProfile(app) {
  const rawUserName = String(app?.authUser?.name || '').trim();
  const rawUserEmail = String(app?.authUser?.email || '').trim();
  const emailName = rawUserEmail.includes('@') ? rawUserEmail.split('@')[0] : rawUserEmail;
  const baseName = rawUserName || emailName || 'Novo Perfil';
  const seedType = String(app?.draftProfileSeed?.type || 'service_pro').toLowerCase();
  const type = TYPE_CATEGORY_MAP[seedType] ? seedType : 'service_pro';
  const category = String(app?.draftProfileSeed?.category || TYPE_CATEGORY_MAP[type]).trim() || TYPE_CATEGORY_MAP[type];

  return {
    id: '__owner_draft__',
    remoteId: null,
    slug: '',
    name: baseName,
    category,
    location: 'Portugal',
    rating: '4.5',
    filter: 'destaques',
    badge: 'novo',
    about: '',
    type,
    data: {
      name: baseName,
      role: category,
      location: 'Portugal',
      about: '',
      social: {},
      gallery: {
        photos: [],
        videos: [],
        reels: [],
      },
      tabsMode: 'blueprint',
      tabs: [],
    },
  };
}

function PageScaffold({ title, children, scrollEnabled = true }) {
  const hasTitle = typeof title === 'string' && title.trim().length > 0;
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.phone}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {hasTitle && (
          <View style={styles.top}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        {scrollEnabled ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.contentNoScroll}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HomeTabRoute({ navigation, app }) {
  return (
    <PageScaffold scrollEnabled={false}>
      <HomeScreen
        currentLanguage={app?.appLanguage || 'pt'}
        feedFilter={app.feedFilter}
        onFilterChange={app.onFilterChange}
        suggested={app.suggestedProfiles}
        profiles={app.homeProfiles}
        loading={app.dataLoading}
        isGuest={app.isGuest}
        isProfessional={app.isProfessional}
        onLoginPress={app.onStartLogin}
        onRegisterPress={app.onStartRegister}
        onOpenProfile={(id) => {
          app.onOpenProfile(id);
          navigation.getParent()?.navigate('ProfileDetail');
        }}
        onToggleSaveProfile={app.onToggleSaveProfile}
        isSavedProfile={app.isSavedProfile}
      />
      {!!app.dataError && <Text style={styles.authError}>{app.dataError}</Text>}
    </PageScaffold>
  );
}

function FeedTabRoute({ navigation, app }) {
  return (
    <PageScaffold scrollEnabled={false}>
      <ExploreScreen
        currentLanguage={app?.appLanguage || 'pt'}
        profiles={app.profiles}
        loading={app.dataLoading}
        isGuest={app.isGuest}
        isProfessional={app.isProfessional}
        onLoginPress={app.onStartLogin}
        onRegisterPress={app.onStartRegister}
        onOpenProfile={(id) => {
          app.onOpenProfile(id);
          navigation.getParent()?.navigate('ProfileDetail');
        }}
        onToggleSaveProfile={app.onToggleSaveProfile}
        isSavedProfile={app.isSavedProfile}
      />
      {!!app.dataError && <Text style={styles.authError}>{app.dataError}</Text>}
    </PageScaffold>
  );
}

function NotificationsTabRoute({ app }) {
  const L = app?.appLanguage || 'pt';
  return (
    <PageScaffold title={t(L, 'title_notifications')}>
      <NotificationsScreen />
    </PageScaffold>
  );
}

function ProfileTabRoute({ navigation, app }) {
  const L = app?.appLanguage || 'pt';
  const ownerProfileOrDraft = app.ownerProfile || buildOwnerDraftProfile(app);

  return (
    <PageScaffold scrollEnabled={false}>
      {app.isGuest && (
        <View style={styles.panel}>
          <Text style={styles.placeholder}>{t(L, 'settings_mode_guest')}</Text>
          <Pressable style={styles.primaryBtn} onPress={app.onStartLogin}>
            <Text style={styles.primaryBtnText}>{t(L, 'profile_guest_login_cta')}</Text>
          </Pressable>
        </View>
      )}
      {!app.isGuest && app.isProfessional === false && (
        <PersonalProfileScreen
          user={app.authUser}
          profiles={app.profiles}
          savedProfiles={app.savedProfiles}
          recentProfiles={app.recentProfiles}
          savedMedia={app.savedMedia}
          alerts={app.personalAlerts}
          recommendations={app.recommendations}
          recommendationsSent={app.recommendationsSent}
          recommendationRequests={app.recommendationRequests}
          recommendationsLoading={app.recommendationsLoading}
          recommendationsError={app.recommendationsError}
          onToggleAlert={app.onToggleAlert}
          onRefreshRecommendations={app.onRefreshRecommendations}
          onRecommendationPermissionAction={app.onRecommendationPermissionAction}
          onRecommendationReact={app.onReactRecommendation}
          onOpenProfile={(id) => {
            app.onOpenProfile(id);
            navigation.getParent()?.navigate('ProfileDetail');
          }}
          onOpenProfileItem={(id, itemShare) => {
            app.onOpenProfile(id, { itemShare });
            navigation.getParent()?.navigate('ProfileDetail');
          }}
          onOpenExplore={() => navigation.navigate('FeedTab')}
          onToggleSaveProfile={app.onToggleSaveProfile}
          isSavedProfile={app.isSavedProfile}
          onToggleSaveMedia={app.onToggleSaveMedia}
        />
      )}
      {!app.isGuest && app.isProfessional !== false && (
        <ProfileScreen
          currentLanguage={app?.appLanguage || 'pt'}
          profile={ownerProfileOrDraft}
          loading={app.dataLoading}
          viewerUser={app.authUser}
          isGuest={app.isGuest}
          canEdit
          onEditPress={() => navigation.getParent()?.navigate('EditProfile')}
          onAddStory={app.onAddStory}
          openProfileIntent={app.profileOpenIntent}
          onConsumeProfileOpenIntent={app.onConsumeProfileOpenIntent}
        />
      )}
      {!!app.dataError && <Text style={styles.authError}>{app.dataError}</Text>}
    </PageScaffold>
  );
}

function SettingsTabRoute({ navigation, app }) {
  const L = app?.appLanguage || 'pt';
  const goEditProfile = () => navigation.getParent()?.navigate('EditProfile');
  const goAccountCredentials = () => navigation.getParent()?.navigate('SettingsAccountCredentials');
  const goLanguage = () => navigation.getParent()?.navigate('SettingsLanguage');
  const goNotifications = () => navigation.navigate('NotificationsTab');
  const goFeed = () => navigation.navigate('FeedTab');
  return (
    <PageScaffold title={t(L, 'title_settings')}>
      <SettingsScreen
        user={app.authUser}
        onLogout={app.onLogout}
        isGuest={app.isGuest}
        onLoginPress={app.onStartLogin}
        isProfessional={app.isProfessional}
        onOpenAccountCredentials={goAccountCredentials}
        onOpenProfessionalProfile={goEditProfile}
        onOpenLanguage={goLanguage}
        onOpenNotifications={goNotifications}
        onOpenApp={goFeed}
        onOpenSupportLegal={goFeed}
        onUpdateAccount={app.onUpdateAccount}
        currentLanguage={app.appLanguage}
      />
    </PageScaffold>
  );
}

function AccountCredentialsRoute({ app }) {
  const L = app?.appLanguage || 'pt';
  return (
    <PageScaffold title={t(L, 'title_account')}>
      <SettingsAccountCredentialsScreen
        user={app.authUser}
        onUpdateAccount={app.onUpdateAccount}
        saving={app.settingsSaveBusy}
        saveError={app.settingsSaveError}
        currentLanguage={L}
      />
    </PageScaffold>
  );
}

function LanguageSettingsRoute({ app }) {
  const L = app?.appLanguage || 'pt';
  return (
    <PageScaffold title={t(L, 'title_languages')}>
      <SettingsLanguageScreen
        currentLanguage={app.appLanguage}
        onSetAppLanguage={app.onSetAppLanguage}
        uiLanguage={L}
      />
    </PageScaffold>
  );
}

function MainTabs({ app }) {
  const resolveAvatarUri = (rawValue) => {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';
    if (/^data:image\//i.test(raw)) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;

    if (!raw.startsWith('/')) return '';

    const base = String(app?.apiBase || '').trim();
    if (!base) return '';
    const origin = base.replace(/\/api\/?$/i, '');
    return `${origin}${raw}`;
  };

  const renderProfileIcon = (focused, color) => (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        marginTop: 0,
        backgroundColor: focused ? '#111827' : '#d1d5db',
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {resolveAvatarUri(app?.ownerProfile?.data?.avatar) ? (
        <Image
          source={{ uri: resolveAvatarUri(app?.ownerProfile?.data?.avatar) }}
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: focused ? '#fff' : '#e5e7eb',
          }}
        />
      ) : (
        <Ionicons name="person" size={16} color={focused ? '#fff' : '#475569'} />
      )}
    </View>
  );

  const tabScreenOptions = {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarIconStyle: { marginTop: 1 },
    tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
    tabBarActiveTintColor: '#111827',
    tabBarInactiveTintColor: '#64748b',
    tabBarStyle: {
      height: 62,
      paddingBottom: 8,
      paddingTop: 6,
      borderTopColor: '#e2e8f0',
      borderTopWidth: 1,
      backgroundColor: '#fff',
    },
  };

  if (app?.isGuest) {
    return (
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen
          name="HomeTab"
          options={{
            title: t(app?.appLanguage || 'pt', 'nav_home'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
            ),
          }}
        >
          {(props) => <HomeTabRoute {...props} app={app} />}
        </Tab.Screen>
        <Tab.Screen
          name="FeedTab"
          options={{
            title: t(app?.appLanguage || 'pt', 'nav_feed'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={size} />
            ),
          }}
        >
          {(props) => <FeedTabRoute {...props} app={app} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="HomeTab"
        options={{
          title: t(app?.appLanguage || 'pt', 'nav_home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      >
        {(props) => <HomeTabRoute {...props} app={app} />}
      </Tab.Screen>
      <Tab.Screen
        name="FeedTab"
        options={{
          title: t(app?.appLanguage || 'pt', 'nav_feed'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={size} />
          ),
        }}
      >
        {(props) => <FeedTabRoute {...props} app={app} />}
      </Tab.Screen>
      <Tab.Screen
        name="ProfileTab"
        options={{
          title: t(app?.appLanguage || 'pt', 'nav_profile'),
          tabBarIcon: ({ color, focused }) => renderProfileIcon(focused, color),
        }}
      >
        {(props) => <ProfileTabRoute {...props} app={app} />}
      </Tab.Screen>
      <Tab.Screen
        name="NotificationsTab"
        options={{
          title: t(app?.appLanguage || 'pt', 'nav_notifications'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      >
        {(props) => <NotificationsTabRoute {...props} app={app} />}
      </Tab.Screen>
      <Tab.Screen
        name="SettingsTab"
        options={{
          title: t(app?.appLanguage || 'pt', 'nav_settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} color={color} size={size} />
          ),
        }}
      >
        {(props) => <SettingsTabRoute {...props} app={app} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function ProfileDetailRoute({ navigation, app }) {
  return (
    <PageScaffold scrollEnabled={false}>
      <ProfileScreen
        currentLanguage={app?.appLanguage || 'pt'}
        profile={app.selectedProfile}
        loading={app.dataLoading}
        viewerUser={app.authUser}
        isGuest={app.isGuest}
        canEdit={!!app.selectedProfile && app.selectedProfile.id === app.ownerProfileId}
        onEditPress={() => navigation.navigate('EditProfile')}
        onAddStory={app.onAddStory}
        onBackPress={() => navigation.goBack()}
        allowPrivateShare={!app.isGuest && app.isProfessional === false}
        onShareRecommendation={app.onSendRecommendation}
        recentShareUsers={app.recentShareUsers}
        onToggleSaveMedia={!app.isGuest && app.isProfessional === false ? app.onToggleSaveMedia : undefined}
        isSavedMedia={!app.isGuest && app.isProfessional === false ? app.isSavedMedia : undefined}
        openProfileIntent={app.profileOpenIntent}
        onConsumeProfileOpenIntent={app.onConsumeProfileOpenIntent}
      />
    </PageScaffold>
  );
}

function EditProfileRoute({ navigation, app }) {
  const editableProfile = app.ownerProfile || buildOwnerDraftProfile(app);

  return (
    <PageScaffold title={t(app?.appLanguage || 'pt', 'title_edit_profile')}>
      <EditProfileScreen
        currentLanguage={app?.appLanguage || 'pt'}
        profile={editableProfile}
        saving={app.saveBusy}
        error={app.saveError}
        onCancel={() => navigation.goBack()}
        onSave={async (payload) => {
          const ok = await app.onSaveProfile(payload);
          if (ok) {
            navigation.goBack();
          }
        }}
      />
    </PageScaffold>
  );
}

export default function AppNavigator({ app }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs">
          {(props) => <MainTabs {...props} app={app} />}
        </Stack.Screen>
        <Stack.Screen name="ProfileDetail">
          {(props) => <ProfileDetailRoute {...props} app={app} />}
        </Stack.Screen>
        <Stack.Screen name="EditProfile">
          {(props) => <EditProfileRoute {...props} app={app} />}
        </Stack.Screen>
        <Stack.Screen name="SettingsAccountCredentials">
          {(props) => <AccountCredentialsRoute {...props} app={app} />}
        </Stack.Screen>
        <Stack.Screen name="SettingsLanguage">
          {(props) => <LanguageSettingsRoute {...props} app={app} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}


