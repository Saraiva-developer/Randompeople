import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/appStyles';

const TYPE_OPTIONS = [
  {
    id: 'food',
    label: 'Restaurante',
    hint: 'Comida e bebidas',
    examples: ['Restaurante', 'Bar', 'Petiscos', 'Cafetaria', 'Pizzaria', 'Hamburgueria', 'Pastelaria', 'Sushi'],
  },
  {
    id: 'shop',
    label: 'Loja',
    hint: 'Produtos físicos ou digitais',
    examples: ['Roupa', 'Eletrónica', 'Suplementos', 'Cosmética', 'Calçado', 'Livraria', 'Decoração', 'Bricolage'],
  },
  {
    id: 'lodging',
    label: 'Alojamento',
    hint: 'Estadia e reservas',
    examples: ['Hotel', 'Hostel', 'Casa local', 'Apartamento', 'Quarto privado', 'Resort', 'Camping', 'Turismo rural'],
  },
  {
    id: 'creator',
    label: 'Criador',
    hint: 'Portefólio e projetos',
    examples: ['Fotógrafo', 'Videógrafo', 'Designer', 'Ilustrador', 'Influencer', 'Músico', 'Maker', 'Artista'],
  },
  {
    id: 'service_pro',
    label: 'Serviços',
    hint: 'Prestação de serviços',
    examples: ['Massagista', 'Advogado', 'Personal trainer', 'Cabeleireiro', 'Barbeiro', 'Fisioterapeuta', 'Consultor', 'Explicador'],
  },
];

function normalizeSeed(seed) {
  const raw = seed && typeof seed === 'object' ? seed : {};
  const type = String(raw.type || '').toLowerCase();
  const validType = TYPE_OPTIONS.some((item) => item.id === type) ? type : '';
  return {
    type: validType,
    category: String(raw.category || '').trim(),
  };
}

export default function ProfileTypeOnboardingScreen({ initialSeed, displayName, onApply, onSkip }) {
  const normalized = normalizeSeed(initialSeed);
  const [selectedType, setSelectedType] = useState(normalized.type || 'service_pro');

  useEffect(() => {
    const next = normalizeSeed(initialSeed);
    setSelectedType(next.type || 'service_pro');
  }, [initialSeed]);
  const effectiveType = selectedType || 'service_pro';
  const effectiveOption =
    TYPE_OPTIONS.find((item) => item.id === effectiveType) ||
    TYPE_OPTIONS.find((item) => item.id === 'service_pro');

  function handleContinue() {
    if (typeof onApply !== 'function') return;
    onApply({
      type: effectiveType,
      category: effectiveOption?.label || 'Serviços',
    });
  }

  return (
    <View style={styles.authWrap}>
      <View style={[styles.authCard, styles.typeOnboardingCard]}>
        <View style={styles.typeOnboardingTitleRow}>
          <Ionicons name="sparkles-outline" size={18} color="#0f172a" />
          <Text style={styles.authTitle}>Que perfil queres criar?</Text>
        </View>

        <Text style={styles.authSub}>
          {displayName ? `${displayName}, escolhe o tipo mais próximo do teu negócio.` : 'Escolhe o tipo mais próximo do teu negócio.'}
        </Text>

        <Text style={styles.formLabel}>O que descreve melhor o teu perfil?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeOptionsRow}
        >
          {TYPE_OPTIONS.map((option) => {
            const active = option.id === effectiveType;
            return (
              <Pressable
                key={option.id}
                style={[styles.typeOptionCard, active && styles.typeOptionCardActive]}
                onPress={() => {
                  setSelectedType(option.id);
                }}
              >
                <Text style={[styles.typeOptionTitle, active && styles.typeOptionTitleActive]}>{option.label}</Text>
                <Text style={[styles.typeOptionHint, active && styles.typeOptionHintActive]} numberOfLines={1}>
                  {option.hint}
                </Text>
                <Text style={[styles.typeOptionExamples, active && styles.typeOptionExamplesActive]} numberOfLines={5}>
                  Ex: {option.examples.join(', ')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.primaryBtn} onPress={handleContinue}>
          <Text style={styles.primaryBtnText}>Continuar</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtnWide} onPress={onSkip}>
          <Text style={styles.secondaryBtnText}>Escolher depois</Text>
        </Pressable>
      </View>
    </View>
  );
}

