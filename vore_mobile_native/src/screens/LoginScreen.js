import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from '../styles/appStyles';

export default function LoginScreen({ loading, error, onSubmit, onBack, onRegisterPress }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.authWrap}>
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>Entrar</Text>
        <Text style={styles.authSub}>Usa a conta da tua app para continuar.</Text>
        {!!error && <Text style={styles.authError}>{error}</Text>}

        <Text style={styles.formLabel}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholder="email@exemplo.com"
        />

        <Text style={styles.formLabel}>Palavra-passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="********"
        />

        <Pressable
          style={styles.authPrimaryBtn}
          onPress={() => onSubmit(email.trim(), password)}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'A entrar...' : 'Entrar'}</Text>
        </Pressable>
        {(typeof onRegisterPress === 'function' || typeof onBack === 'function') && (
          <View style={styles.authActionsRow}>
            {typeof onRegisterPress === 'function' && (
              <Pressable style={styles.authGhostBtn} onPress={onRegisterPress}>
                <Text style={styles.authGhostBtnText}>Criar conta</Text>
              </Pressable>
            )}
            {typeof onBack === 'function' && (
              <Pressable style={styles.authGhostBtn} onPress={onBack}>
                <Text style={styles.authGhostBtnText}>Voltar</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
