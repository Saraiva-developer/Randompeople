export const PROFILE_TYPE_OPTIONS = ["service_pro", "shop", "food", "lodging", "creator"];

export const PROFILE_CATEGORY_OPTIONS = {
  service_pro: ["Estetica", "Bem-estar", "Saude", "Treino", "Consultoria", "Eventos"],
  shop: ["Eletronica", "Moda", "Beleza", "Suplementos", "Casa e Decoracao", "Tecnologia"],
  food: ["Restaurante", "Bar", "Cafe", "Pastelaria", "Brunch", "Petiscos"],
  lodging: ["Alojamento", "Hotel", "Hostel", "Casa de Ferias", "Quarto", "Rural"],
  creator: ["Fotografia", "Video", "Design", "Musica", "Arte", "Conteudo"],
};

export const SERVICE_TYPE_META = [
  { id: "general", label: "Geral", extra1: "Detalhe 1", extra2: "Detalhe 2" },
  { id: "beauty", label: "Beleza", extra1: "Area", extra2: "Material" },
  { id: "wellness", label: "Bem-estar", extra1: "Tipo de sessao", extra2: "Objetivo" },
  { id: "fitness", label: "Treino", extra1: "Nivel", extra2: "Objetivo" },
  { id: "consulting", label: "Consultoria", extra1: "Especialidade", extra2: "Formato" },
];

export const HOME_FILTERS = [
  { id: "destaques", label: "Destaques" },
  { id: "novidades", label: "Novidades" },
  { id: "promocoes", label: "Promocoes" },
  { id: "perto", label: "Perto de mim" },
];

export const HOME_FILTER_LABELS = HOME_FILTERS.reduce((acc, f) => {
  acc[f.id] = f.label;
  return acc;
}, {});

export const EXPLORE_DISCOVERY_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "perto", label: "Perto de mim" },
  { key: "promocoes", label: "Promocoes" },
  { key: "novidades", label: "Novidades" },
  { key: "verif", label: "Verificados" },
];

export const EXPLORE_SORT_OPTIONS = [
  { key: "relevance", label: "Relevancia" },
  { key: "recent", label: "Recentes" },
  { key: "rating", label: "Rating" },
  { key: "near", label: "Perto" },
];

export const CATEGORY_TAXONOMY = [
  {
    key: "servicos_profissionais",
    label: "Servicos Profissionais",
    keywords: ["servico", "servicos", "consultoria", "tecnico", "assistencia", "profissional", "freelancer"],
  },
  {
    key: "saude_bem_estar",
    label: "Saude e Bem-Estar",
    keywords: ["saude", "bem estar", "terapia", "fisioterapia", "massagem", "psicologia", "nutricao", "nutricionista"],
  },
  {
    key: "desporto_fitness",
    label: "Desporto e Fitness",
    keywords: ["fitness", "ginasio", "treino", "personal trainer", "pt", "musculacao", "crossfit", "yoga", "pilates"],
  },
  {
    key: "beleza_estetica",
    label: "Beleza e Estetica",
    keywords: ["beleza", "estetica", "maquilhagem", "maquiagem", "cabelo", "barbeiro", "barbearia", "manicure", "pedicure"],
  },
  {
    key: "restaurante_bar",
    label: "Restaurante e Bar",
    keywords: ["restaurante", "bar", "petiscos", "comida", "menu", "cozinha", "drink", "cocktail"],
  },
  { key: "night_club", label: "Night Club", keywords: ["discoteca", "club", "night", "festa", "dj", "after"] },
  {
    key: "alojamento_turismo",
    label: "Alojamento e Turismo",
    keywords: ["alojamento", "hotel", "hostel", "casa", "quarto", "reserva", "turismo"],
  },
  { key: "moda_roupa", label: "Moda e Roupa", keywords: ["moda", "roupa", "vestuario", "tenis", "sapatilhas", "outfit"] },
  {
    key: "eletronica_tecnologia",
    label: "Eletronica e Tecnologia",
    keywords: ["eletronica", "tecnologia", "telemovel", "smartphone", "portatil", "gaming", "audio", "informatica"],
  },
  {
    key: "suplementos_nutricao",
    label: "Suplementos e Nutricao",
    keywords: ["suplementos", "proteina", "whey", "creatina", "pre treino", "nutricao desportiva"],
  },
  { key: "casa_decoracao", label: "Casa e Decoracao", keywords: ["casa", "decoracao", "interior", "mobilia", "velas"] },
  { key: "automovel_mobilidade", label: "Automovel e Mobilidade", keywords: ["automovel", "carro", "moto", "oficina", "mobilidade"] },
  {
    key: "educacao_formacao",
    label: "Educacao e Formacao",
    keywords: ["educacao", "formacao", "curso", "workshop", "aulas", "explicacoes", "mentoria"],
  },
  { key: "arte_cultura", label: "Arte e Cultura", keywords: ["arte", "cultura", "fotografia", "musica", "pintura", "teatro", "design"] },
  {
    key: "eventos_experiencias",
    label: "Eventos e Experiencias",
    keywords: ["evento", "experiencia", "casamento", "aniversario", "corporativo"],
  },
  { key: "negocios_empresas", label: "Negocios e Empresas", keywords: ["empresa", "negocio", "agencia", "b2b", "servicos empresariais"] },
  {
    key: "criador_portefolio",
    label: "Criador e Portefolio",
    keywords: ["criador", "creator", "portfolio", "portefolio", "conteudo", "influencer", "ugc", "social media"],
  },
];
