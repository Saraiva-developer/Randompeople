import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from '../styles/appStyles';

export default function RegisterScreen({ loading, error, onSubmit, onBack, onLoginPress }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('professional');

  return (
    <View style={styles.authWrap}>
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>Registar</Text>
        <Text style={styles.authSub}>Cria a tua conta para publicar e editar perfil.</Text>
        {!!error && <Text style={styles.authError}>{error}</Text>}

        <Text style={styles.formLabel}>Tipo de conta</Text>
        <View style={styles.formChipsWrap}>
          <Pressable
            style={[styles.formChip, accountType === 'professional' && styles.formChipActive]}
            onPress={() => setAccountType('professional')}
          >
            <Text style={[styles.formChipText, accountType === 'professional' && styles.formChipTextActive]}>
              Profissional
            </Text>
          </Pressable>
          <Pressable
            style={[styles.formChip, accountType === 'common' && styles.formChipActive]}
            onPress={() => setAccountType('common')}
          >
            <Text style={[styles.formChipText, accountType === 'common' && styles.formChipTextActive]}>
              Conta Pessoal
            </Text>
          </Pressable>
        </View>
        <Text style={styles.formHint}>
          {accountType === 'professional'
            ? 'Cria e gere um perfil público do teu negócio.'
            : 'Explora perfis, guarda favoritos e usa a app como utilizador.'}
        </Text>

        <Text style={styles.formLabel}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="O teu nome"
        />

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
          placeholder="Mínimo 6 caracteres"
        />

        <Pressable
          style={styles.authPrimaryBtn}
          onPress={() => onSubmit(name.trim(), email.trim(), password, accountType)}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'A registar...' : 'Criar conta'}</Text>
        </Pressable>
        {(typeof onLoginPress === 'function' || typeof onBack === 'function') && (
          <View style={styles.authActionsRow}>
            {typeof onLoginPress === 'function' && (
              <Pressable style={styles.authGhostBtn} onPress={onLoginPress}>
                <Text style={styles.authGhostBtnText}>Já tenho conta</Text>
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
