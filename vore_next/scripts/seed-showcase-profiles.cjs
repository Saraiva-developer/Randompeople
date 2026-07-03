const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = process.cwd();

function loadEnvFile(fileName) {
  const envPath = path.join(ROOT, fileName);
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const apply = process.argv.includes("--apply");
const prune = process.argv.includes("--prune");
const onlySlugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const onlySlug = onlySlugArg ? onlySlugArg.split("=").slice(1).join("=") : null;

const SHOWCASE_BY_TYPE = {
  food: ["pizza-roma-lx", "casa-do-bairro", "sushi-fusion-lx"],
  service_pro: ["relax-massage-lx", "fit-coach-lx", "beauty-clinic-lx"],
  shop: ["green-market", "urban-style-store", "tech-store-lx"],
  lodging: ["alfama-guest", "stay-lx-loft", "boutique-hotel-lx"],
  creator: ["photography-pro-lx", "ana-social-media", "branding-lx"],
};

const SHOWCASE_SLUGS = Object.values(SHOWCASE_BY_TYPE).flat();
const targetSlugs = onlySlug ? [onlySlug] : SHOWCASE_SLUGS;

const IMG = {
  pizza:
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=85",
  restaurant:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
  salad:
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=85",
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85",
  brunch:
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=85",
  wine:
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85",
  dessert:
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=85",
  sushi:
    "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=1200&q=85",
  ramen:
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=85",
  seafood:
    "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1200&q=85",
  massage:
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85",
  spa:
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=85",
  therapy:
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=85",
  gym:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85",
  training:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=85",
  runner:
    "https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=1200&q=85",
  clinic:
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85",
  facial:
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=85",
  nails:
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=85",
  market:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85",
  fruit:
    "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=85",
  pantry:
    "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=1200&q=85",
  fashion:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=85",
  sneakers:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85",
  atelier:
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85",
  techStore:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
  laptop:
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85",
  headphones:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85",
  guestHouse:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
  apartment:
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85",
  villa:
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
  bedroom:
    "https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=85",
  living:
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
  boutiqueHotel:
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85",
  hotelLobby:
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85",
  hotelBreakfast:
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=85",
  photoStudio:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85",
  camera:
    "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=1200&q=85",
  brandDesk:
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
  contentDesk:
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=85",
  social:
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=85",
  branding:
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=85",
  moodboard:
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85",
  strategy:
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85",
};

const TAB_LABELS = {
  sobre: "Sobre",
  menu: "Menu",
  servicos: "Servicos",
  produtos: "Produtos",
  campanhas: "Campanhas",
  portfolio: "Portfolio",
  galeria: "Galeria",
  casas: "Casas",
  quartos: "Quartos",
  horario: "Horario",
  agenda: "Agenda",
  localizacao: "Localizacao",
  parcerias: "Parcerias",
};

function tabs(ids) {
  return ids.map((id) => ({
    id,
    type: id,
    label: TAB_LABELS[id] || id,
    enabled: true,
  }));
}

function section(id, label, items) {
  return {
    id,
    label,
    name: label,
    enabled: true,
    items,
  };
}

function price(value, suffix = "") {
  return suffix ? `${value} ${suffix}` : `${value}`;
}

function catalogItem(name, description, imageUrl, overrides = {}) {
  const images = overrides.images || (imageUrl ? [imageUrl] : []);
  return {
    id: overrides.id || slugify(name),
    name,
    title: name,
    description,
    shortDescription: overrides.shortDescription || description,
    imageUrl,
    images,
    price: overrides.price || "",
    quoteOnly: Boolean(overrides.quoteOnly),
    promoEnabled: Boolean(overrides.promoEnabled),
    promoOldPrice: overrides.promoOldPrice || "",
    promoNowPrice: overrides.promoNowPrice || "",
    time: overrides.time || "",
    serviceType: overrides.serviceType || "",
    serviceTypeLabel: overrides.serviceTypeLabel || overrides.serviceType || "",
    note: overrides.note || "",
    extraFields: overrides.extraFields || [],
    amenities: overrides.amenities || [],
    houseRules: overrides.houseRules || "",
    capacity: overrides.capacity || "",
    beds: overrides.beds || "",
    bathrooms: overrides.bathrooms || "",
    availability: overrides.availability || "",
    checkIn: overrides.checkIn || "",
    checkOut: overrides.checkOut || "",
    priceNight: overrides.priceNight || "",
    url: overrides.url || "",
    enabled: true,
  };
}

function extra(name, value, description = "") {
  return { name, label: name, value, description };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function schedule(closedSunday = false) {
  const base = [
    { day: "Segunda", open: "09:00", close: "18:00", closed: false },
    { day: "Terca", open: "09:00", close: "18:00", closed: false },
    { day: "Quarta", open: "09:00", close: "18:00", closed: false },
    { day: "Quinta", open: "09:00", close: "18:00", closed: false },
    { day: "Sexta", open: "09:00", close: "19:00", closed: false },
    { day: "Sabado", open: "10:00", close: "14:00", closed: false },
    { day: "Domingo", open: "12:00", close: "16:00", closed: closedSunday },
  ];
  return base;
}

function agenda(kind = "normal") {
  if (kind === "food") {
    return {
      title: "Reservas",
      intro: "Reserva mesa ou confirma disponibilidade pelo contacto do perfil.",
      slots: [
        { day: "Hoje", label: "Jantar", times: ["19:30", "21:00"] },
        { day: "Amanha", label: "Almoco", times: ["12:30", "14:00"] },
      ],
    };
  }

  return {
    title: "Agenda",
    intro: "Usa o contacto do perfil para confirmar disponibilidade.",
    slots: [
      { day: "Hoje", label: "Manha", times: ["09:30", "11:00"] },
      { day: "Amanha", label: "Tarde", times: ["15:00", "17:30"] },
    ],
  };
}

function links(site, instagram = "https://instagram.com/vore", whatsapp = "https://wa.me/351910000000") {
  return [
    { type: "instagram", icon: "instagram", label: "Instagram", url: instagram },
    { type: "whatsapp", icon: "whatsapp", label: "WhatsApp", url: whatsapp },
    { type: "website", icon: "website", label: "Website", url: site },
  ];
}

function gallery(photos) {
  return {
    photos,
    videos: [],
  };
}

function galleryViews(photos) {
  return photos.map((src, index) => ({
    id: `view-${index + 1}`,
    src,
    type: "photo",
    title: `Imagem ${index + 1}`,
  }));
}

function locations(name, address) {
  return [
    {
      id: "main-location",
      title: name,
      address,
      city: "Lisboa",
      country: "Portugal",
      mapUrl: "https://maps.google.com/?q=Lisboa",
    },
  ];
}

function partners(category) {
  return [
    { id: "local", name: "Comercio local", description: `Parcerias locais ligadas a ${category}.` },
    { id: "vore", name: "Vore", description: "Perfil preparado para testar navegacao real por abas." },
  ];
}

function baseData(profile, overrides) {
  const current = profile.data && typeof profile.data === "object" ? profile.data : {};
  const photos = overrides.galleryPhotos || [overrides.cover, overrides.avatar].filter(Boolean);

  return {
    ...current,
    name: profile.name,
    type: overrides.type || profile.type,
    category: overrides.category,
    role: overrides.category,
    location: overrides.location || profile.location || "Lisboa",
    rating: overrides.rating || current.rating || "4.7",
    avatar: overrides.avatar || current.avatar || profile.avatar_url || photos[0] || "",
    cover: overrides.cover || current.cover || profile.cover_url || photos[0] || "",
    aboutSummary: overrides.aboutSummary,
    about: overrides.about,
    tabs: overrides.tabs,
    links: overrides.links || links(`https://vore.local/${profile.slug}`),
    social: overrides.social || overrides.links || links(`https://vore.local/${profile.slug}`),
    gallery: gallery(photos),
    galleryViews: galleryViews(photos),
    schedule: overrides.schedule || schedule(),
    agenda: overrides.agenda || agenda(),
    locations: overrides.locations || locations(profile.name, overrides.location || "Lisboa"),
    partners: overrides.partners || partners(overrides.category),
    contentCategories: overrides.contentCategories || [],
    __showcaseSeed: {
      version: 1,
      updatedAt: new Date().toISOString(),
    },
  };
}

function foodPizza(profile) {
  const photos = [IMG.pizza, IMG.restaurant, IMG.salad, IMG.burger, IMG.wine, IMG.dessert];
  const data = baseData(profile, {
    category: "Restaurante / Bar",
    location: "Lisboa - Alvalade",
    rating: "4.5",
    avatar: IMG.pizza,
    cover: IMG.restaurant,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "menu", "galeria", "horario", "localizacao", "agenda"]),
    agenda: agenda("food"),
    schedule: [
      { day: "Segunda", open: "12:00", close: "15:00", closed: false },
      { day: "Terca", open: "12:00", close: "23:00", closed: false },
      { day: "Quarta", open: "12:00", close: "23:00", closed: false },
      { day: "Quinta", open: "12:00", close: "23:00", closed: false },
      { day: "Sexta", open: "12:00", close: "00:00", closed: false },
      { day: "Sabado", open: "12:30", close: "00:00", closed: false },
      { day: "Domingo", open: "12:30", close: "22:00", closed: false },
    ],
    aboutSummary: "Pizzaria de bairro com forno quente, massas leves, pratos de conforto e carta pensada para partilhar.",
    about:
      "Pizza Roma LX junta comida simples, ambiente cuidado e atendimento proximo em Lisboa - Alvalade.\n\nA casa trabalha massas de fermentacao lenta, entradas para dividir, pizzas de assinatura, massas, sobremesas e bebidas frescas para almoco, jantar ou takeaway.\n\nEste perfil tem menu completo, promocoes, galeria, horarios e reserva para testar uma experiencia real de restaurante na Vore.",
    contentCategories: ["pizza", "jantar", "familia", "takeaway"],
  });

  data.menuSections = [
    section("promocoes", "Promocoes", [
      catalogItem("Menu do dia", "Prato, bebida e cafe para uma pausa completa.", IMG.salad, {
        price: price("12.5", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("15", "EUR"),
        promoNowPrice: price("12.5", "EUR"),
        serviceType: "Almoco",
        time: "30 min",
      }),
      catalogItem("Pizza + bebida", "Pizza media com bebida fresca para almoco rapido.", IMG.pizza, {
        price: price("13.9", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("16", "EUR"),
        promoNowPrice: price("13.9", "EUR"),
        serviceType: "Takeaway",
      }),
      catalogItem("Jantar para dois", "Duas pizzas, uma entrada e duas bebidas.", IMG.restaurant, {
        price: price("29", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("34", "EUR"),
        promoNowPrice: price("29", "EUR"),
      }),
    ]),
    section("entradas", "Entradas", [
      catalogItem("Focaccia da casa", "Focaccia quente, azeite aromatizado e alecrim.", IMG.restaurant, {
        price: price("4.9", "EUR"),
      }),
      catalogItem("Burrata com tomate", "Burrata cremosa, tomate cherry e pesto.", IMG.salad, {
        price: price("8.5", "EUR"),
      }),
      catalogItem("Bruschetta classica", "Pao tostado, tomate, alho, manjericao e azeite.", IMG.brunch, {
        price: price("5.8", "EUR"),
      }),
      catalogItem("Tiras de frango", "Frango crocante com molho de alho e lima.", IMG.burger, {
        price: price("6.9", "EUR"),
      }),
    ]),
    section("pizzas", "Pizzas", [
      catalogItem("Roma especial", "Mozzarella, frango, cebola roxa, ananas e ervas frescas.", IMG.pizza, {
        price: price("16", "EUR"),
        serviceType: "Pizza",
        extraFields: [extra("Tamanho", "Grande"), extra("Massa", "Fermentacao lenta")],
      }),
      catalogItem("Margherita", "Tomate, mozzarella, manjericao fresco e azeite.", IMG.pizza, {
        price: price("10.5", "EUR"),
        serviceType: "Pizza",
      }),
      catalogItem("Diavola", "Tomate, mozzarella, salame picante e oregano.", IMG.pizza, {
        price: price("13.5", "EUR"),
        serviceType: "Pizza picante",
      }),
      catalogItem("Quatro queijos", "Mozzarella, gorgonzola, parmesao e queijo da ilha.", IMG.pizza, {
        price: price("14", "EUR"),
        serviceType: "Pizza",
      }),
      catalogItem("Vegetariana", "Legumes grelhados, mozzarella e pesto verde.", IMG.salad, {
        price: price("13", "EUR"),
        serviceType: "Pizza vegetariana",
      }),
      catalogItem("Prosciutto e rucula", "Presunto, rucula, lascas de parmesao e tomate.", IMG.pizza, {
        price: price("15.5", "EUR"),
        serviceType: "Pizza",
      }),
    ]),
    section("massas", "Massas e pratos", [
      catalogItem("Pasta pomodoro", "Massa fresca com tomate, alho, manjericao e parmesao.", IMG.restaurant, {
        price: price("11.5", "EUR"),
        serviceType: "Massa",
      }),
      catalogItem("Carbonara cremosa", "Massa com ovo, pancetta, queijo e pimenta preta.", IMG.brunch, {
        price: price("13.5", "EUR"),
        serviceType: "Massa",
      }),
      catalogItem("Lasanha do forno", "Lasanha de carne gratinada, servida com salada simples.", IMG.restaurant, {
        price: price("14.5", "EUR"),
        serviceType: "Forno",
      }),
      catalogItem("Burger artesanal", "Burger com queijo, molho da casa, salada e batata rustica.", IMG.burger, {
        price: price("11", "EUR"),
        serviceType: "Prato rapido",
      }),
    ]),
    section("sobremesas", "Sobremesas", [
      catalogItem("Tiramisu", "Tiramisu classico com cafe e mascarpone.", IMG.dessert, {
        price: price("5.2", "EUR"),
      }),
      catalogItem("Panna cotta", "Panna cotta com frutos vermelhos.", IMG.dessert, {
        price: price("4.9", "EUR"),
      }),
      catalogItem("Pizza doce", "Massa fina com creme de chocolate e morangos.", IMG.dessert, {
        price: price("7.5", "EUR"),
      }),
    ]),
    section("bebidas", "Bebidas", [
      catalogItem("Vinho da casa", "Copo de vinho selecionado para acompanhar pizzas.", IMG.wine, {
        price: price("4.5", "EUR"),
      }),
      catalogItem("Limonada fresca", "Limonada com hortela e gelo.", IMG.brunch, {
        price: price("3.2", "EUR"),
      }),
      catalogItem("Spritz Roma", "Cocktail leve com citrinos e espumante.", IMG.wine, {
        price: price("7", "EUR"),
      }),
      catalogItem("Cerveja artesanal", "Cerveja local em garrafa.", IMG.restaurant, {
        price: price("4.2", "EUR"),
      }),
      catalogItem("Sumo natural", "Sumo natural preparado no momento.", IMG.salad, {
        price: price("3.8", "EUR"),
      }),
    ]),
  ];
  data.campaignSections = data.menuSections.slice(0, 1);
  data.campaignsSections = data.campaignSections;
  return data;
}

function foodCasa(profile) {
  const photos = [IMG.restaurant, IMG.brunch, IMG.dessert, IMG.wine, IMG.salad];
  const data = baseData(profile, {
    category: "Restaurante familiar",
    location: "Lisboa - Campo de Ourique",
    rating: "4.6",
    avatar: IMG.restaurant,
    cover: IMG.brunch,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "menu", "galeria", "horario", "localizacao", "agenda"]),
    agenda: agenda("food"),
    aboutSummary: "Restaurante familiar para almocos tranquilos, petiscos e jantares de grupo.",
    about:
      "Casa do Bairro e um restaurante de proximidade com pratos portugueses, petiscos e sobremesas feitas para partilhar.\n\nA proposta e simples: comida honesta, horarios claros, reservas faceis e um menu organizado por momentos do dia.\n\nO perfil ajuda a perceber como um restaurante com varias categorias, campanhas e galeria pode viver dentro da Vore.",
    contentCategories: ["restaurante", "petiscos", "familia", "lisboa"],
  });

  data.menuSections = [
    section("almoco", "Almoco", [
      catalogItem("Prato do dia", "Receita diaria com bebida incluida.", IMG.salad, {
        price: price("10.5", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("12", "EUR"),
        promoNowPrice: price("10.5", "EUR"),
      }),
      catalogItem("Bowl fresca", "Base de legumes, grao, ovo e molho da casa.", IMG.brunch, {
        price: price("9.8", "EUR"),
      }),
    ]),
    section("petiscos", "Petiscos", [
      catalogItem("Tabua da casa", "Queijos, enchidos, pao e compotas.", IMG.wine, {
        price: price("14", "EUR"),
      }),
      catalogItem("Doce do dia", "Sobremesa caseira preparada diariamente.", IMG.dessert, {
        price: price("4.5", "EUR"),
      }),
    ]),
  ];
  data.campaignSections = [data.menuSections[0]];
  data.campaignsSections = data.campaignSections;
  return data;
}

function foodSushi(profile) {
  const photos = [IMG.sushi, IMG.ramen, IMG.seafood, IMG.restaurant, IMG.wine];
  const data = baseData(profile, {
    category: "Restaurante japones",
    location: "Lisboa - Avenidas Novas",
    rating: "4.7",
    avatar: IMG.sushi,
    cover: IMG.sushi,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "menu", "galeria", "horario", "localizacao", "agenda"]),
    agenda: agenda("food"),
    schedule: [
      { day: "Segunda", open: "12:00", close: "15:00", closed: false },
      { day: "Terca", open: "12:00", close: "23:00", closed: false },
      { day: "Quarta", open: "12:00", close: "23:00", closed: false },
      { day: "Quinta", open: "12:00", close: "23:00", closed: false },
      { day: "Sexta", open: "12:00", close: "00:00", closed: false },
      { day: "Sabado", open: "12:30", close: "00:00", closed: false },
      { day: "Domingo", open: "18:30", close: "22:30", closed: false },
    ],
    aboutSummary: "Sushi bar contemporaneo com combinados, ramen, entradas e opcoes para partilhar.",
    about:
      "Sushi Fusion LX mistura cozinha japonesa, combinados frescos e pratos quentes para almoco, jantar ou take-away.\n\nA carta esta organizada por combinados, pratos quentes, entradas e bebidas para ser facil escolher sem perder detalhe.\n\nEste perfil ajuda a testar menus com muitas categorias, promocoes, imagens fortes e reservas.",
    contentCategories: ["sushi", "japones", "takeaway", "jantar"],
  });

  data.menuSections = [
    section("promocoes", "Promocoes", [
      catalogItem("Combinado almoco", "16 pecas com sopa miso e bebida.", IMG.sushi, {
        price: price("14.9", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("18", "EUR"),
        promoNowPrice: price("14.9", "EUR"),
      }),
      catalogItem("Menu casal", "40 pecas, duas bebidas e entrada quente.", IMG.seafood, {
        price: price("39", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("46", "EUR"),
        promoNowPrice: price("39", "EUR"),
      }),
    ]),
    section("entradas", "Entradas", [
      catalogItem("Gyozas", "Gyozas de frango com molho ponzu.", IMG.ramen, {
        price: price("5.9", "EUR"),
      }),
      catalogItem("Tempura de camarao", "Camarao crocante com molho agridoce.", IMG.seafood, {
        price: price("8.5", "EUR"),
      }),
      catalogItem("Sopa miso", "Miso, tofu, algas e cebolinho.", IMG.ramen, {
        price: price("3.5", "EUR"),
      }),
    ]),
    section("combinados", "Combinados", [
      catalogItem("Fusion 24", "Selecao de sushi, sashimi e rolls especiais.", IMG.sushi, {
        price: price("24", "EUR"),
        serviceType: "24 pecas",
      }),
      catalogItem("Sashimi selection", "Fatias frescas de salmao, atum e peixe branco.", IMG.seafood, {
        price: price("18", "EUR"),
        serviceType: "Sashimi",
      }),
      catalogItem("Veggie rolls", "Rolls vegetarianos com abacate, manga e pepino.", IMG.sushi, {
        price: price("12.5", "EUR"),
        serviceType: "Vegetariano",
      }),
    ]),
    section("quentes", "Pratos quentes", [
      catalogItem("Ramen da casa", "Caldo quente com noodles, ovo e legumes.", IMG.ramen, {
        price: price("12", "EUR"),
      }),
      catalogItem("Yakissoba", "Noodles salteados com legumes e frango.", IMG.ramen, {
        price: price("11.5", "EUR"),
      }),
    ]),
    section("bebidas", "Bebidas", [
      catalogItem("Sake copo", "Sake leve para acompanhar sushi.", IMG.wine, {
        price: price("5", "EUR"),
      }),
      catalogItem("Cha frio", "Cha frio de jasmim.", IMG.restaurant, {
        price: price("3", "EUR"),
      }),
    ]),
  ];
  data.campaignSections = [data.menuSections[0]];
  data.campaignsSections = data.campaignSections;
  return data;
}

function serviceMassage(profile) {
  const photos = [IMG.massage, IMG.spa, IMG.therapy];
  const data = baseData(profile, {
    category: "Bem-estar",
    location: "Lisboa - Saldanha",
    rating: "4.8",
    avatar: IMG.massage,
    cover: IMG.spa,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "servicos", "galeria", "horario", "localizacao", "agenda"]),
    aboutSummary: "Massagens terapeuticas e relaxamento com consulta inicial e acompanhamento cuidado.",
    about:
      "Relax Massage LX trabalha recuperacao, relaxamento e bem-estar com sessoes ajustadas a cada pessoa.\n\nO atendimento comeca por perceber rotina, tensao acumulada e objetivos. Depois a sessao combina tecnicas de pressao, mobilidade leve e descanso.\n\nEste perfil mostra servicos com duracao, preco, detalhes, galeria e agenda para simular uma pagina profissional completa.",
    contentCategories: ["massagem", "relaxamento", "bem-estar", "terapia"],
  });

  data.servicesSections = [
    section("massagens", "Massagens", [
      catalogItem("Massagem relaxante", "Sessao para aliviar tensao e recuperar energia.", IMG.massage, {
        price: price("45", "EUR"),
        time: "60",
        serviceType: "Relaxamento",
        serviceTypeLabel: "Relaxamento",
        note: "Ideal para stress, descanso e rotina intensa.",
        extraFields: [
          extra("Pressao", "Media"),
          extra("Zona", "Corpo inteiro"),
          extra("Preparacao", "Chegar 10 minutos antes"),
        ],
      }),
      catalogItem("Massagem terapeutica", "Trabalho localizado para costas, ombros e cervical.", IMG.therapy, {
        price: price("55", "EUR"),
        time: "75",
        serviceType: "Terapeutica",
        quoteOnly: false,
        extraFields: [
          extra("Foco", "Costas e ombros"),
          extra("Seguimento", "Plano recomendado em 3 sessoes"),
        ],
      }),
    ]),
    section("packs", "Packs", [
      catalogItem("Pack mensal", "Quatro sessoes para manter consistencia no cuidado.", IMG.spa, {
        price: price("160", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("180", "EUR"),
        promoNowPrice: price("160", "EUR"),
        time: "4 x 60",
        serviceType: "Mensal",
      }),
    ]),
  ];
  return data;
}

function serviceCoach(profile) {
  const photos = [IMG.gym, IMG.training, IMG.runner];
  const data = baseData(profile, {
    category: "Treino personalizado",
    location: "Lisboa - Parque das Nacoes",
    rating: "4.9",
    avatar: IMG.training,
    cover: IMG.gym,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "servicos", "galeria", "agenda", "localizacao", "parcerias"]),
    aboutSummary: "Planos de treino presenciais e online para ganhar consistencia sem complicar.",
    about:
      "Fit Coach LX acompanha pessoas que querem voltar a treinar, ganhar forca ou preparar uma rotina mais saudavel.\n\nO trabalho combina avaliacao inicial, plano semanal, progresso mensuravel e ajustes simples para caber na vida real.\n\nO perfil mostra servicos, packs, agenda, parcerias e conteudo visual para testar uma experiencia de profissional de fitness.",
    contentCategories: ["treino", "fitness", "online", "saude"],
  });

  data.servicesSections = [
    section("treino", "Treino", [
      catalogItem("Sessao individual", "Treino presencial com plano adaptado ao objetivo.", IMG.training, {
        price: price("35", "EUR"),
        time: "60",
        serviceType: "Presencial",
        extraFields: [extra("Objetivo", "Forca e mobilidade"), extra("Nivel", "Todos")],
      }),
      catalogItem("Plano online", "Plano mensal com check-ins e ajustes semanais.", IMG.runner, {
        price: price("90", "EUR"),
        time: "Mensal",
        serviceType: "Online",
        quoteOnly: false,
      }),
    ]),
    section("packs", "Packs", [
      catalogItem("Pack 8 sessoes", "Oito treinos acompanhados para criar ritmo.", IMG.gym, {
        price: price("240", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("280", "EUR"),
        promoNowPrice: price("240", "EUR"),
      }),
    ]),
  ];
  data.partners = [
    { id: "nutrition", name: "Nutrition LX", description: "Planos alimentares para complementar treino." },
    { id: "physio", name: "Physio Lisboa", description: "Acompanhamento de prevencao e recuperacao." },
  ];
  return data;
}

function serviceBeauty(profile) {
  const photos = [IMG.clinic, IMG.facial, IMG.nails, IMG.spa];
  const data = baseData(profile, {
    category: "Estetica",
    location: "Lisboa - Marques",
    rating: "4.8",
    avatar: IMG.clinic,
    cover: IMG.facial,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "servicos", "galeria", "horario", "localizacao", "agenda"]),
    aboutSummary: "Clinica de estetica com tratamentos faciais, corpo e cuidados de rotina.",
    about:
      "Beauty Clinic LX combina tratamentos de estetica, cuidados faciais e acompanhamento personalizado.\n\nO objetivo e tornar simples perceber cada servico: duracao, preco, beneficios, preparacao e cuidados depois da sessao.\n\nEste perfil serve para testar uma categoria de servicos com varios blocos, packs, detalhes e agenda.",
    contentCategories: ["estetica", "facial", "corpo", "beleza"],
  });

  data.servicesSections = [
    section("faciais", "Faciais", [
      catalogItem("Limpeza de pele", "Limpeza profunda com hidratacao e mascara final.", IMG.facial, {
        price: price("48", "EUR"),
        time: "60",
        serviceType: "Facial",
        extraFields: [
          extra("Indicado para", "Pele baça ou com impurezas"),
          extra("Inclui", "Extracao, mascara e hidratacao"),
        ],
      }),
      catalogItem("Glow express", "Tratamento rapido para devolver luminosidade.", IMG.clinic, {
        price: price("32", "EUR"),
        time: "35",
        serviceType: "Express",
      }),
      catalogItem("Anti-age cuidado", "Sessao focada em firmeza, hidratacao e textura.", IMG.spa, {
        price: price("62", "EUR"),
        time: "75",
        serviceType: "Anti-age",
      }),
    ]),
    section("corpo", "Corpo", [
      catalogItem("Drenagem linfatica", "Massagem tecnica para leveza e circulacao.", IMG.massage, {
        price: price("45", "EUR"),
        time: "50",
        serviceType: "Corpo",
      }),
      catalogItem("Pack corpo", "Quatro sessoes de tratamento corporal acompanhado.", IMG.spa, {
        price: price("160", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("180", "EUR"),
        promoNowPrice: price("160", "EUR"),
        time: "4 x 50",
      }),
    ]),
    section("maos", "Maos e detalhes", [
      catalogItem("Manicure gel", "Manicure com acabamento gel e cuidado de cuticulas.", IMG.nails, {
        price: price("24", "EUR"),
        time: "50",
        serviceType: "Unhas",
      }),
    ]),
  ];
  return data;
}

function shopMarket(profile) {
  const photos = [IMG.market, IMG.fruit, IMG.pantry];
  const data = baseData(profile, {
    category: "Mercearia biologica",
    location: "Lisboa - Arroios",
    rating: "4.8",
    avatar: IMG.market,
    cover: IMG.fruit,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "produtos", "campanhas", "galeria", "horario", "localizacao"]),
    aboutSummary: "Mercearia de bairro com frescos, cabazes semanais e produtos locais.",
    about:
      "Green Market trabalha legumes, fruta, mercearia seca e produtos de produtores locais.\n\nO foco e facilitar compras do dia a dia com cabazes, promocoes semanais e uma selecao curta mas bem escolhida.\n\nEste perfil e bom para testar produtos, campanhas, preco, galeria e categorias de loja.",
    contentCategories: ["mercearia", "biologico", "cabazes", "produtos locais"],
  });

  data.productsSections = [
    section("frescos", "Frescos", [
      catalogItem("Cabaz semanal", "Legumes e fruta para uma semana equilibrada.", IMG.fruit, {
        price: price("22", "EUR"),
        serviceType: "Cabaz",
        extraFields: [extra("Origem", "Produtores locais"), extra("Entrega", "Recolha em loja")],
      }),
      catalogItem("Sopa pronta", "Base de legumes pronta a aquecer.", IMG.market, {
        price: price("4.8", "EUR"),
      }),
    ]),
    section("mercearia", "Mercearia", [
      catalogItem("Granola artesanal", "Granola com aveia, mel e frutos secos.", IMG.pantry, {
        price: price("6.5", "EUR"),
      }),
      catalogItem("Azeite selecionado", "Azeite virgem extra de pequena producao.", IMG.market, {
        price: price("9.9", "EUR"),
      }),
    ]),
  ];
  data.campaignSections = [
    section("campanhas", "Campanhas", [
      catalogItem("Cabaz familia", "Cabaz reforcado para quatro pessoas.", IMG.fruit, {
        price: price("32", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("38", "EUR"),
        promoNowPrice: price("32", "EUR"),
      }),
    ]),
  ];
  data.campaignsSections = data.campaignSections;
  return data;
}

function shopFashion(profile) {
  const photos = [IMG.fashion, IMG.sneakers, IMG.atelier];
  const data = baseData(profile, {
    category: "Moda urbana",
    location: "Lisboa - Chiado",
    rating: "4.7",
    avatar: IMG.sneakers,
    cover: IMG.fashion,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "produtos", "campanhas", "galeria", "horario", "localizacao"]),
    aboutSummary: "Loja urbana com pecas essenciais, sneakers e edicoes limitadas.",
    about:
      "Urban Style Store junta roupa casual, sneakers e acessorios para quem procura um visual limpo e atual.\n\nA loja organiza colecoes por drops, campanhas e produtos em destaque para facilitar descoberta e compra.\n\nEste perfil ajuda a testar loja com produtos, promocoes, preco, imagens e layout de grelha.",
    contentCategories: ["moda", "sneakers", "streetwear", "acessorios"],
  });

  data.productsSections = [
    section("destaques", "Destaques", [
      catalogItem("Sneaker branco", "Modelo versatil para usar todos os dias.", IMG.sneakers, {
        price: price("89", "EUR"),
        extraFields: [extra("Tamanhos", "39-44"), extra("Stock", "Limitado")],
      }),
      catalogItem("Casaco leve", "Casaco de meia estacao com corte regular.", IMG.fashion, {
        price: price("64", "EUR"),
      }),
    ]),
    section("acessorios", "Acessorios", [
      catalogItem("Tote bag", "Saco em algodao grosso para uso diario.", IMG.atelier, {
        price: price("18", "EUR"),
      }),
    ]),
  ];
  data.campaignSections = [
    section("drops", "Drops", [
      catalogItem("Drop fim de semana", "Selecao curta com desconto temporario.", IMG.fashion, {
        promoEnabled: true,
        promoOldPrice: price("120", "EUR"),
        promoNowPrice: price("95", "EUR"),
      }),
    ]),
  ];
  data.campaignsSections = data.campaignSections;
  return data;
}

function shopTech(profile) {
  const photos = [IMG.techStore, IMG.laptop, IMG.headphones];
  const data = baseData(profile, {
    category: "Tecnologia",
    location: "Lisboa - Saldanha",
    rating: "4.6",
    avatar: IMG.techStore,
    cover: IMG.laptop,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "produtos", "campanhas", "galeria", "horario", "localizacao"]),
    aboutSummary: "Loja de tecnologia com portateis, acessorios, audio e apoio na escolha.",
    about:
      "Tech Store LX e uma loja pensada para quem quer comprar tecnologia sem ficar perdido em especificacoes.\n\nO perfil organiza produtos, campanhas, disponibilidade e pequenas notas de compra para tornar a decisao mais clara.\n\nEste caso ajuda a testar produtos com preco alto, campanhas, detalhes tecnicos e galeria.",
    contentCategories: ["tecnologia", "portateis", "audio", "acessorios"],
  });

  data.productsSections = [
    section("portateis", "Portateis", [
      catalogItem("Laptop Pro 14", "Portatil leve para trabalho, estudo e criacao.", IMG.laptop, {
        price: price("1199", "EUR"),
        extraFields: [
          extra("Memoria", "16GB RAM"),
          extra("Armazenamento", "512GB SSD"),
          extra("Garantia", "2 anos"),
        ],
      }),
      catalogItem("Laptop Air 13", "Modelo compacto para mobilidade diaria.", IMG.techStore, {
        price: price("899", "EUR"),
        extraFields: [extra("Peso", "1.2kg"), extra("Bateria", "Ate 12h")],
      }),
    ]),
    section("audio", "Audio", [
      catalogItem("Headphones noise cancel", "Auscultadores sem fios com cancelamento de ruido.", IMG.headphones, {
        price: price("149", "EUR"),
      }),
      catalogItem("Coluna compacta", "Coluna bluetooth pequena para casa ou escritorio.", IMG.techStore, {
        price: price("59", "EUR"),
      }),
    ]),
    section("acessorios", "Acessorios", [
      catalogItem("Dock USB-C", "Dock com HDMI, USB e carregamento rapido.", IMG.laptop, {
        price: price("69", "EUR"),
      }),
      catalogItem("Mochila tech", "Mochila com protecao para portatil e acessorios.", IMG.techStore, {
        price: price("49", "EUR"),
      }),
    ]),
  ];
  data.campaignSections = [
    section("campanhas", "Campanhas", [
      catalogItem("Pack escritorio", "Laptop Air, rato, teclado e suporte.", IMG.laptop, {
        price: price("999", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("1120", "EUR"),
        promoNowPrice: price("999", "EUR"),
      }),
    ]),
  ];
  data.campaignsSections = data.campaignSections;
  return data;
}

function lodgingAlfama(profile) {
  const photos = [IMG.guestHouse, IMG.apartment, IMG.villa, IMG.bedroom, IMG.living];
  const data = baseData(profile, {
    category: "Alojamento local",
    location: "Lisboa - Alfama",
    rating: "4.7",
    avatar: IMG.guestHouse,
    cover: IMG.apartment,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "casas", "quartos", "galeria", "localizacao", "horario"]),
    aboutSummary: "Alojamento em Alfama para estadias curtas, com quartos equipados e check-in simples.",
    about:
      "Alfama Guest House recebe pessoas que procuram uma estadia confortavel, bem localizada e facil de planear em Lisboa - Alfama.\n\nO perfil inclui casas, quartos, galeria, regras, comodidades, horarios e localizacao para simular uma pagina de alojamento real.\n\nA estrutura foi preenchida para testar cards com varias imagens, modal detalhado e informacao pratica sem ficar vazio.",
    contentCategories: ["alojamento", "alfama", "quartos", "estadias"],
  });

  data.housesSections = [
    section("estadias", "Estadias", [
      catalogItem("Apartamento principal", "Espaco confortavel para estadias curtas, com boa localizacao e ambiente calmo.", IMG.apartment, {
        images: [IMG.apartment, IMG.villa, IMG.guestHouse, IMG.living],
        priceNight: price("125", "EUR /noite"),
        capacity: "4 hospedes",
        beds: "2 camas",
        bathrooms: "1 casa de banho",
        availability: "Disponivel",
        checkIn: "15:00",
        checkOut: "11:00",
        amenities: ["Wi-Fi", "Cozinha", "Ar condicionado", "Toalhas", "Check-in autonomo"],
        houseRules: "Nao fumador | Sem festas | Silencio depois das 22:00",
      }),
    ]),
  ];
  data.roomsSections = [
    section("quartos", "Quartos", [
      catalogItem("Quarto duplo", "Quarto simples e bem localizado para uma estadia pratica.", IMG.bedroom, {
        images: [IMG.bedroom, IMG.living],
        priceNight: price("79", "EUR /noite"),
        capacity: "2 hospedes",
        beds: "1 cama dupla",
        bathrooms: "Partilhada",
        availability: "Disponivel",
        checkIn: "15:00",
        checkOut: "11:00",
        amenities: ["Wi-Fi", "Roupa de cama", "Secretaria"],
        houseRules: "Nao fumador | Respeitar zonas comuns",
      }),
    ]),
  ];
  return data;
}

function lodgingStay(profile) {
  const photos = [IMG.living, IMG.bedroom, IMG.apartment, IMG.villa];
  const data = baseData(profile, {
    category: "Alojamento local",
    location: "Lisboa - Baixa",
    rating: "4.8",
    avatar: IMG.living,
    cover: IMG.apartment,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "casas", "quartos", "galeria", "localizacao", "horario"]),
    aboutSummary: "Loft central para estadias de trabalho ou lazer, com cozinha e zona de descanso.",
    about:
      "Stay LX Loft foi pensado para estadias curtas no centro, com conforto, autonomia e acesso rapido a transportes.\n\nA proposta junta uma casa principal, quartos, comodidades e regras claras para reduzir duvidas antes da reserva.\n\nO perfil testa uma experiencia de alojamento com imagens fortes, preco por noite, detalhes e modal completo.",
    contentCategories: ["loft", "baixa", "alojamento", "trabalho"],
  });

  data.housesSections = [
    section("lofts", "Lofts", [
      catalogItem("Loft central", "Loft luminoso com zona de trabalho, cozinha e sala aberta.", IMG.living, {
        images: [IMG.living, IMG.apartment, IMG.bedroom],
        priceNight: price("140", "EUR /noite"),
        capacity: "3 hospedes",
        beds: "2 camas",
        bathrooms: "1 casa de banho",
        availability: "Disponivel",
        checkIn: "16:00",
        checkOut: "11:00",
        amenities: ["Wi-Fi", "Cozinha equipada", "Zona de trabalho", "Elevador"],
        houseRules: "Sem festas | Check-in autonomo | Silencio depois das 22:30",
      }),
    ]),
  ];
  data.roomsSections = [
    section("quartos", "Quartos", [
      catalogItem("Suite compacta", "Quarto privado para estadia curta no centro.", IMG.bedroom, {
        images: [IMG.bedroom, IMG.living],
        priceNight: price("86", "EUR /noite"),
        capacity: "2 hospedes",
        beds: "1 cama dupla",
        bathrooms: "Privada",
        availability: "Disponivel",
        checkIn: "16:00",
        checkOut: "11:00",
        amenities: ["Wi-Fi", "Toalhas", "Secretaria"],
      }),
    ]),
  ];
  return data;
}

function lodgingBoutique(profile) {
  const photos = [IMG.boutiqueHotel, IMG.hotelLobby, IMG.hotelBreakfast, IMG.bedroom, IMG.living];
  const data = baseData(profile, {
    category: "Hotel boutique",
    location: "Lisboa - Principe Real",
    rating: "4.7",
    avatar: IMG.boutiqueHotel,
    cover: IMG.hotelLobby,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "quartos", "galeria", "horario", "localizacao", "agenda"]),
    aboutSummary: "Hotel boutique com quartos cuidados, pequeno-almoco e rececao proxima.",
    about:
      "Boutique Hotel LX oferece estadias urbanas com quartos confortaveis, pequeno-almoco e apoio local para descobrir Lisboa.\n\nA informacao foi preparada para mostrar quartos, comodidades, regras, horarios, galeria e detalhes de reserva num perfil completo.\n\nEste perfil ajuda a testar um alojamento mais hoteleiro, diferente de guest house ou loft.",
    contentCategories: ["hotel", "boutique", "quartos", "lisboa"],
  });

  data.roomsSections = [
    section("quartos", "Quartos", [
      catalogItem("Quarto superior", "Quarto luminoso com cama queen e zona de leitura.", IMG.bedroom, {
        images: [IMG.bedroom, IMG.hotelLobby, IMG.hotelBreakfast],
        priceNight: price("118", "EUR /noite"),
        capacity: "2 hospedes",
        beds: "1 cama queen",
        bathrooms: "Privada",
        availability: "Ultimas unidades",
        checkIn: "15:00",
        checkOut: "12:00",
        amenities: ["Wi-Fi", "Pequeno-almoco", "Ar condicionado", "Rececao"],
        houseRules: "Nao fumador | Silencio depois das 23:00",
      }),
      catalogItem("Suite city view", "Suite com vista cidade, sala pequena e pequeno-almoco incluido.", IMG.living, {
        images: [IMG.living, IMG.boutiqueHotel, IMG.hotelBreakfast],
        priceNight: price("175", "EUR /noite"),
        capacity: "2 hospedes",
        beds: "1 cama king",
        bathrooms: "Privada",
        availability: "Disponivel",
        checkIn: "15:00",
        checkOut: "12:00",
        amenities: ["Wi-Fi", "Pequeno-almoco", "Vista cidade", "Minibar"],
        houseRules: "Nao fumador | Sem festas",
      }),
    ]),
  ];
  data.housesSections = [
    section("experiencias", "Experiencias", [
      catalogItem("Fim de semana boutique", "Duas noites com pequeno-almoco e late check-out.", IMG.boutiqueHotel, {
        images: [IMG.boutiqueHotel, IMG.hotelBreakfast, IMG.hotelLobby],
        priceNight: price("320", "EUR /pack"),
        capacity: "2 hospedes",
        beds: "1 quarto",
        bathrooms: "Privada",
        availability: "Mediante reserva",
        amenities: ["Pequeno-almoco", "Late check-out", "Guia local"],
      }),
    ]),
  ];
  return data;
}

function creatorPhoto(profile) {
  const photos = [IMG.photoStudio, IMG.camera, IMG.brandDesk];
  const data = baseData(profile, {
    category: "Conteudo",
    location: "Lisboa",
    rating: "4.8",
    avatar: IMG.camera,
    cover: IMG.photoStudio,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "portfolio", "servicos", "galeria", "agenda", "parcerias"]),
    aboutSummary: "Fotografia, conteudo e direcao visual para marcas, profissionais e eventos.",
    about:
      "Photography Pro LX trabalha imagem, conteudo e projetos digitais com uma abordagem organizada, visual e proxima.\n\nO perfil inclui portfolio, servicos, galeria, agenda e parcerias para testar uma experiencia completa de criador.\n\nA ideia e mostrar como trabalhos, pacotes e sessoes podem viver dentro da mesma pagina sem parecer uma lista basica.",
    contentCategories: ["fotografia", "conteudo", "marca", "eventos"],
  });

  data.portfolioSections = [
    section("projetos", "Projetos", [
      catalogItem("Projeto de marca", "Direcao visual, conteudo e organizacao da presenca digital.", IMG.brandDesk, {
        url: "https://vore.local/case/projeto-de-marca",
        extraFields: [extra("Entrega", "Galeria e guiao visual"), extra("Duracao", "2 semanas")],
      }),
      catalogItem("Conteudo para redes", "Sessao fotografica com selecao final pronta para publicar.", IMG.camera, {
        url: "https://vore.local/case/conteudo-redes",
      }),
    ]),
    section("cases", "Cases", [
      catalogItem("Campanha local", "Imagem para lancamento de uma marca local.", IMG.photoStudio, {
        url: "https://vore.local/case/campanha-local",
      }),
    ]),
  ];
  data.servicesSections = [
    section("servicos", "Servicos", [
      catalogItem("Sessao criativa", "Reuniao criativa com estrutura, referencias e plano simples de execucao.", IMG.photoStudio, {
        price: price("80", "EUR"),
        time: "90",
        serviceType: "Criacao",
      }),
      catalogItem("Pack mensal", "Acompanhamento continuo para redes ou projeto digital.", IMG.contentDesk, {
        quoteOnly: true,
        serviceType: "Conteudo",
        time: "Mensal",
      }),
    ]),
  ];
  return data;
}

function creatorSocial(profile) {
  const photos = [IMG.social, IMG.contentDesk, IMG.brandDesk, IMG.camera];
  const data = baseData(profile, {
    category: "Social media",
    location: "Lisboa",
    rating: "4.7",
    avatar: IMG.social,
    cover: IMG.contentDesk,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "portfolio", "servicos", "campanhas", "galeria", "agenda"]),
    aboutSummary: "Planeamento, calendario editorial e conteudo para marcas que querem publicar melhor.",
    about:
      "Ana Social Media ajuda marcas pequenas a organizar presenca digital com estrategia, calendario e conteudo visual.\n\nO trabalho passa por diagnostico, plano editorial, criativos simples e acompanhamento mensal sem complicar.\n\nEste perfil testa servicos de criador, campanhas, portfolio, agenda e informacao comercial com mais profundidade.",
    contentCategories: ["social media", "conteudo", "estrategia", "marketing"],
  });

  data.portfolioSections = [
    section("cases", "Cases", [
      catalogItem("Calendario editorial", "Planeamento de 30 dias com ideias, temas e objetivos.", IMG.contentDesk, {
        extraFields: [extra("Cliente", "Marca local"), extra("Entrega", "Calendario + copy")],
      }),
      catalogItem("Rebranding social", "Ajuste de tom, destaques e grelha inicial.", IMG.brandDesk, {
        extraFields: [extra("Foco", "Instagram"), extra("Prazo", "10 dias")],
      }),
    ]),
  ];
  data.servicesSections = [
    section("gestao", "Gestao", [
      catalogItem("Plano mensal", "Gestao de conteudo com calendario e reporting simples.", IMG.social, {
        price: price("220", "EUR"),
        time: "Mensal",
        serviceType: "Gestao",
      }),
      catalogItem("Sessao estrategia", "Sessao para clarificar objetivos, publico e proximos conteudos.", IMG.contentDesk, {
        price: price("75", "EUR"),
        time: "90",
        serviceType: "Consultoria",
      }),
    ]),
  ];
  data.campaignSections = [
    section("campanhas", "Campanhas", [
      catalogItem("Lancamento rapido", "Kit de posts e stories para lancar produto ou servico.", IMG.brandDesk, {
        price: price("140", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("180", "EUR"),
        promoNowPrice: price("140", "EUR"),
      }),
    ]),
  ];
  data.campaignsSections = data.campaignSections;
  return data;
}

function creatorBranding(profile) {
  const photos = [IMG.branding, IMG.moodboard, IMG.strategy, IMG.brandDesk];
  const data = baseData(profile, {
    category: "Branding",
    location: "Lisboa",
    rating: "4.8",
    avatar: IMG.branding,
    cover: IMG.moodboard,
    galleryPhotos: photos,
    tabs: tabs(["sobre", "portfolio", "servicos", "campanhas", "galeria", "agenda"]),
    aboutSummary: "Estudio de branding para marcas pequenas que precisam de clareza visual e mensagem.",
    about:
      "Branding LX ajuda negocios a transformar ideias soltas numa identidade clara, consistente e facil de aplicar.\n\nO trabalho pode incluir estrategia, naming, identidade visual, guia de marca, templates e apoio ao lancamento.\n\nEste perfil foi preparado para testar criadores com portfolio, servicos, campanhas, packs e detalhe de projeto.",
    contentCategories: ["branding", "identidade", "estrategia", "design"],
  });

  data.portfolioSections = [
    section("projetos", "Projetos", [
      catalogItem("Identidade cafe local", "Naming, logotipo, paleta, tipografia e aplicacoes basicas.", IMG.moodboard, {
        url: "https://vore.local/case/identidade-cafe",
        extraFields: [extra("Entrega", "Brand kit"), extra("Prazo", "3 semanas")],
      }),
      catalogItem("Marca pessoal", "Sistema visual e mensagem para profissional independente.", IMG.brandDesk, {
        url: "https://vore.local/case/marca-pessoal",
      }),
    ]),
    section("cases", "Cases", [
      catalogItem("Rebranding loja", "Atualizacao de marca para melhorar consistencia online e loja fisica.", IMG.branding, {
        url: "https://vore.local/case/rebranding-loja",
      }),
    ]),
  ];
  data.servicesSections = [
    section("estrategia", "Estrategia", [
      catalogItem("Sessao de diagnostico", "Sessao para clarificar publico, proposta e posicionamento.", IMG.strategy, {
        price: price("95", "EUR"),
        time: "90",
        serviceType: "Consultoria",
      }),
      catalogItem("Brand sprint", "Processo rapido para criar base visual e mensagem principal.", IMG.moodboard, {
        price: price("480", "EUR"),
        time: "1 semana",
        serviceType: "Sprint",
      }),
    ]),
    section("identidade", "Identidade visual", [
      catalogItem("Identidade completa", "Logotipo, cores, tipografia, guia e aplicacoes essenciais.", IMG.branding, {
        quoteOnly: true,
        time: "3-5 semanas",
        serviceType: "Projeto",
      }),
    ]),
  ];
  data.campaignSections = [
    section("campanhas", "Campanhas", [
      catalogItem("Kit lancamento", "Templates, capa, bio, destaques e publicacoes iniciais.", IMG.brandDesk, {
        price: price("260", "EUR"),
        promoEnabled: true,
        promoOldPrice: price("320", "EUR"),
        promoNowPrice: price("260", "EUR"),
      }),
    ]),
  ];
  data.campaignsSections = data.campaignSections;
  return data;
}

const BUILDERS = {
  "pizza-roma-lx": foodPizza,
  "casa-do-bairro": foodCasa,
  "sushi-fusion-lx": foodSushi,
  "relax-massage-lx": serviceMassage,
  "fit-coach-lx": serviceCoach,
  "beauty-clinic-lx": serviceBeauty,
  "green-market": shopMarket,
  "urban-style-store": shopFashion,
  "tech-store-lx": shopTech,
  "alfama-guest": lodgingAlfama,
  "stay-lx-loft": lodgingStay,
  "boutique-hotel-lx": lodgingBoutique,
  "photography-pro-lx": creatorPhoto,
  "ana-social-media": creatorSocial,
  "branding-lx": creatorBranding,
};

async function main() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .in("slug", targetSlugs);

  if (error) throw error;

  const bySlug = new Map((profiles || []).map((profile) => [profile.slug, profile]));
  const missing = targetSlugs.filter((slug) => !bySlug.has(slug));
  if (missing.length) {
    console.warn(`Missing profiles: ${missing.join(", ")}`);
  }

  const selected = targetSlugs
    .map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .filter((profile) => BUILDERS[profile.slug]);

  if (!selected.length) {
    console.log("No matching showcase profiles found.");
    return;
  }

  const updates = selected.map((profile) => {
    const data = BUILDERS[profile.slug](profile);
    return {
      id: profile.id,
      slug: profile.slug,
      name: profile.name,
      type: data.type || profile.type,
      bio: data.aboutSummary || profile.bio || "",
      location: data.location || profile.location || "Lisboa",
      avatar_url: data.avatar || profile.avatar_url || null,
      cover_url: data.cover || profile.cover_url || null,
      is_published: true,
      data,
    };
  });

  console.log(`Showcase seed will update ${updates.length} profile(s):`);
  updates.forEach((update) => {
    const tabCount = Array.isArray(update.data.tabs) ? update.data.tabs.length : 0;
    const galleryCount = update.data.gallery?.photos?.length || 0;
    console.log(`- ${update.name} (${update.slug}) | tabs: ${tabCount} | photos: ${galleryCount}`);
  });

  let allProfiles = null;
  if (prune && onlySlug) {
    console.warn("Ignoring --prune because --slug was provided.");
  } else if (prune) {
    const { data: allRows, error: allError } = await supabase.from("profiles").select("*");
    if (allError) throw allError;
    allProfiles = allRows || [];
    const keep = new Set(SHOWCASE_SLUGS);
    const pruneCount = allProfiles.filter((profile) => !keep.has(profile.slug) && profile.is_published).length;
    console.log(`Prune mode: ${pruneCount} published profile(s) will be unpublished, not deleted.`);
  }

  if (!apply) {
    console.log("\nDry run only. Run with --apply to write to Supabase.");
    return;
  }

  const backupDir = path.join(ROOT, "scripts", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    backupDir,
    `${prune && !onlySlug ? "showcase-prune" : "showcase-profiles"}-${stamp}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(prune && !onlySlug ? allProfiles : selected, null, 2), "utf8");
  console.log(`Backup written to ${backupPath}`);

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        type: update.type,
        bio: update.bio,
        location: update.location,
        avatar_url: update.avatar_url,
        cover_url: update.cover_url,
        is_published: update.is_published,
        data: update.data,
      })
      .eq("id", update.id);

    if (updateError) throw updateError;
    console.log(`Updated ${update.name} (${update.slug})`);
  }

  if (prune && !onlySlug) {
    const keep = new Set(SHOWCASE_SLUGS);
    const pruneIds = allProfiles
      .filter((profile) => !keep.has(profile.slug) && profile.is_published)
      .map((profile) => profile.id);

    for (let index = 0; index < pruneIds.length; index += 50) {
      const chunk = pruneIds.slice(index, index + 50);
      const { error: pruneError } = await supabase
        .from("profiles")
        .update({ is_published: false })
        .in("id", chunk);

      if (pruneError) throw pruneError;
    }

    console.log(`Unpublished ${pruneIds.length} profile(s) outside the 15 showcase profiles.`);
  }

  console.log("Showcase profiles updated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
