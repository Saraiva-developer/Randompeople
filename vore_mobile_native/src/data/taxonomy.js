function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CATEGORY_TAXONOMY = [
  { key: 'servicos_profissionais', label: 'Serviços Profissionais', keywords: ['servico', 'servicos', 'consultoria', 'tecnico', 'assistencia', 'profissional', 'freelancer'] },
  { key: 'saude_bem_estar', label: 'Saúde e Bem-Estar', keywords: ['saude', 'bem estar', 'terapia', 'fisioterapia', 'massagem', 'psicologia', 'nutricao', 'nutricionista'] },
  { key: 'desporto_fitness', label: 'Desporto e Fitness', keywords: ['fitness', 'ginasio', 'treino', 'personal trainer', 'pt', 'musculacao', 'crossfit', 'yoga', 'pilates'] },
  { key: 'beleza_estetica', label: 'Beleza e Estética', keywords: ['beleza', 'estetica', 'maquilhagem', 'maquiagem', 'cabelo', 'barbeiro', 'barbearia', 'manicure', 'pedicure'] },
  { key: 'restaurante_bar', label: 'Restaurante e Bar', keywords: ['restaurante', 'bar', 'petiscos', 'comida', 'menu', 'cozinha', 'drink', 'cocktail'] },
  { key: 'night_club', label: 'Night Club', keywords: ['discoteca', 'club', 'night', 'festa', 'dj', 'after', 'balada'] },
  { key: 'alojamento_turismo', label: 'Alojamento e Turismo', keywords: ['alojamento', 'hotel', 'hostel', 'casa', 'quarto', 'reserva', 'turismo', 'hospedagem'] },
  { key: 'moda_roupa', label: 'Moda e Roupa', keywords: ['moda', 'roupa', 'vestuario', 'tenis', 'sapatilhas', 'outfit', 'streetwear'] },
  { key: 'eletronica_tecnologia', label: 'Eletrónica e Tecnologia', keywords: ['eletronica', 'tecnologia', 'telemovel', 'smartphone', 'portatil', 'gaming', 'audio', 'informatica'] },
  { key: 'suplementos_nutricao', label: 'Suplementos e Nutrição', keywords: ['suplementos', 'proteina', 'whey', 'creatina', 'pre treino', 'nutricao desportiva'] },
  { key: 'casa_decoracao', label: 'Casa e Decoração', keywords: ['casa', 'decoracao', 'interior', 'mobilia', 'velas', 'design de interiores'] },
  { key: 'automovel_mobilidade', label: 'Automóvel e Mobilidade', keywords: ['automovel', 'carro', 'moto', 'detalhe automovel', 'oficina', 'mobilidade'] },
  { key: 'educacao_formacao', label: 'Educação e Formação', keywords: ['educacao', 'formacao', 'curso', 'workshop', 'aulas', 'explicacoes', 'mentoria'] },
  { key: 'arte_cultura', label: 'Arte e Cultura', keywords: ['arte', 'cultura', 'fotografia', 'musica', 'pintura', 'teatro', 'design'] },
  { key: 'eventos_experiencias', label: 'Eventos e Experiências', keywords: ['evento', 'experiencia', 'casamento', 'aniversario', 'corporativo', 'organizacao de eventos'] },
  { key: 'negocios_empresas', label: 'Negócios e Empresas', keywords: ['empresa', 'negocio', 'agencia', 'b2b', 'servicos empresariais', 'empreendedorismo'] },
  { key: 'criador_portefolio', label: 'Criador e Portefólio', keywords: ['criador', 'creator', 'portfolio', 'portefolio', 'conteudo', 'influencer', 'ugc', 'social media'] },
];

const TAXONOMY_INDEX = CATEGORY_TAXONOMY.map((item) => {
  const terms = [item.key, item.label, ...(Array.isArray(item.keywords) ? item.keywords : [])]
    .map((term) => normalizeText(term))
    .filter(Boolean);
  return { ...item, normalizedTerms: terms };
});

export function inferProfileCategoryKeys(profile) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const data = p.data && typeof p.data === 'object' ? p.data : {};
  const contentCategories = Array.isArray(data.contentCategories) ? data.contentCategories : [];
  const haystack = normalizeText([
    p.name,
    p.category,
    p.location,
    p.about,
    data.about,
    ...contentCategories,
  ].join(' '));

  if (!haystack) return [];

  return TAXONOMY_INDEX.filter((cat) =>
    cat.normalizedTerms.some((term) => term && haystack.includes(term))
  ).map((cat) => cat.key);
}

export function findTaxonomyKeysByQuery(query) {
  const q = normalizeText(query);
  if (!q) return [];
  return TAXONOMY_INDEX.filter((cat) =>
    cat.normalizedTerms.some((term) => term.includes(q))
  ).map((cat) => cat.key);
}

export function normalizeTaxonomyQuery(value) {
  return normalizeText(value);
}
