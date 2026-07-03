import { Text, View } from 'react-native';
import { styles } from '../styles/appStyles';

export default function NotificationsScreen() {
  return (
    <View style={styles.panel}>
      <Text style={styles.profileName}>Notificações</Text>
      <Text style={styles.placeholder}>Ainda sem notificações novas.</Text>
    </View>
  );
}


