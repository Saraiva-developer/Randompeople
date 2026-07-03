const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const img = {
  studio: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
  massage: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
  facial: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80",
  sneakers: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
  restaurant: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
  food: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  room: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
  creator: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  event: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
};

function baseTabs(extraTabs) {
  return [
    { id: "sobre", type: "sobre", label: "Sobre", enabled: true },
    ...extraTabs,
    { id: "galeria", type: "galeria", label: "Galeria", enabled: true },
    { id: "agenda", type: "agenda", label: "Agenda", enabled: true },
    { id: "horario", type: "horario", label: "Horario", enabled: true },
    { id: "locais", type: "locais", label: "Localizacao", enabled: true },
    { id: "parcerias", type: "parcerias", label: "Parcerias", enabled: true },
  ];
}

function commonData(profile) {
  return {
    name: profile.name,
    type: profile.type,
    category: profile.category,
    role: profile.category,
    location: profile.location,
    rating: profile.rating,
    avatar: profile.avatar,
    cover: profile.cover || profile.avatar,
    aboutSummary: profile.summary,
    about: profile.about,
    badge: profile.badge || "",
    verified: Boolean(profile.verified),
    links: [
      { type: "instagram", url: "https://instagram.com/vore.demo", label: "Instagram" },
      { type: "whatsapp", url: "https://wa.me/351910000000", label: "WhatsApp" },
      { type: "website", url: "https://vore.pt", label: "Website" },
    ],
    social: {
      instagram: "https://instagram.com/vore.demo",
      whatsapp: "https://wa.me/351910000000",
      website: "https://vore.pt",
    },
    gallery: {
      photos: [profile.avatar, img.event, img.food].filter(Boolean),
      videos: [],
    },
    schedule: {
      seg: "09:00 - 18:00",
      ter: "09:00 - 18:00",
      qua: "09:00 - 18:00",
      qui: "09:00 - 18:00",
      sex: "09:00 - 19:00",
      sab: "10:00 - 14:00",
      dom: "Fechado",
    },
    agenda: {
      slots: [
        { name: "Manha", day: "Hoje", weekday: "Segunda", time: "09:30", enabled: true },
        { name: "Tarde", day: "Amanha", weekday: "Terca", time: "15:00", enabled: true },
      ],
    },
    partners: [
      { name: "Vore Partner", description: "Parceiro recomendado", image: img.creator, link: "https://vore.pt", enabled: true },
    ],
    locations: [
      { title: profile.name, address: `${profile.location}, Portugal`, note: "Local principal", link: "https://maps.google.com", enabled: true },
    ],
  };
}

const demoProfiles = [
  {
    email: "demo.creative@vore.local",
    name: "Creative Studio LX",
    slug: "demo-creative-studio-lx",
    type: "service_pro",
    category: "Estetica",
    location: "Lisboa",
    rating: "4.8",
    avatar: img.studio,
    summary: "Estudio criativo com servicos de beleza, bem-estar e imagem.",
    about: "<p>Estudio criativo completo para cuidar da imagem, bem-estar e presenca digital.</p><p>Este perfil demo tem servicos com categorias, promocao, imagem, galeria, agenda, links e parcerias para testar o editor.</p>",
    data: {
      tabs: baseTabs([{ id: "servicos", type: "servicos", label: "Servicos", enabled: true }, { id: "portfolio", type: "portfolio", label: "Portfolio", enabled: true }]),
      servicesSections: [
        {
          id: "promocoes",
          label: "Promocoes",
          enabled: true,
          items: [
            {
              name: "Massagem Relaxante",
              imageUrl: img.massage,
              images: [img.massage],
              time: "60",
              serviceType: "Bem-estar",
              serviceTypeLabel: "Bem-estar",
              price: "50",
              promoEnabled: "yes",
              promoOldPrice: "50",
              promoNowPrice: "30",
              shortDescription: "Massagem completa para aliviar tensao e recuperar energia.",
              description: "Uma sessao pensada para abrandar, soltar tensoes e sair com uma sensacao clara de leveza.",
              note: "Ideal para fim de dia",
              extraFields: [
                { label: "Inclui", value: "Oleos aromaticos e ambiente privado" },
                { label: "Recomendado", value: "Para stress e cansaco muscular" },
              ],
              enabled: true,
            },
            {
              name: "Limpeza Facial Glow",
              imageUrl: img.facial,
              images: [img.facial],
              time: "45",
              serviceType: "Beleza",
              serviceTypeLabel: "Beleza",
              price: "38",
              shortDescription: "Limpeza facial leve com acabamento luminoso.",
              description: "Tratamento de rosto para preparar a pele e devolver frescura sem uma rotina complicada.",
              extraFields: [{ label: "Pele", value: "Todos os tipos" }],
              enabled: true,
            },
          ],
        },
        {
          id: "consultoria",
          label: "Consultoria",
          enabled: true,
          items: [
            {
              name: "Diagnostico de imagem",
              time: "30",
              quoteOnly: "yes",
              serviceType: "Consultoria",
              serviceTypeLabel: "Consultoria",
              shortDescription: "Sessao curta para perceber estilo, objetivos e proximos passos.",
              description: "Mapeamos necessidades, referencias e uma direcao visual simples para a tua presenca.",
              enabled: true,
            },
          ],
        },
      ],
      portfolioSections: [
        {
          id: "trabalhos",
          label: "Trabalhos",
          enabled: true,
          items: [
            { name: "Campanha visual primavera", imageUrl: img.studio, description: "Direcao criativa, fotografia e conteudo para redes.", link: "https://vore.pt", enabled: true },
          ],
        },
      ],
    },
  },
  {
    email: "demo.sneaker@vore.local",
    name: "Sneaker Point",
    slug: "demo-sneaker-point",
    type: "shop",
    category: "Loja de Tenis",
    location: "Porto",
    rating: "4.6",
    avatar: img.sneakers,
    summary: "Sneakers, streetwear e campanhas semanais.",
    about: "<p>Loja demo para testar produtos, campanhas, galeria e filtros de descoberta.</p>",
    data: {
      tabs: baseTabs([{ id: "produtos", type: "produtos", label: "Produtos", enabled: true }, { id: "campanhas", type: "campanhas", label: "Campanhas", enabled: true }]),
      productsSections: [
        {
          id: "destaques",
          label: "Destaques",
          enabled: true,
          items: [
            { name: "Alpha X Pro 256GB", imageUrl: img.sneakers, images: [img.sneakers], price: "129", stock: "in", promoEnabled: "yes", promoOldPrice: "149", promoNowPrice: "119", description: "Modelo leve para uso diario.", enabled: true },
            { name: "Urban Low White", imageUrl: img.sneakers, images: [img.sneakers], price: "89", stock: "in", description: "Classico branco com sola confortavel.", enabled: true },
          ],
        },
      ],
      campaignSections: [
        { id: "campanha", label: "Campanha", enabled: true, items: [{ name: "Semana Sneaker", mediaUrl: img.sneakers, mediaType: "image", description: "Promocoes ate domingo.", ctaLabel: "Ver campanha", ctaLink: "https://vore.pt", enabled: true }] },
      ],
    },
  },
  {
    email: "demo.midnight@vore.local",
    name: "Midnight Room",
    slug: "demo-midnight-room",
    type: "food",
    category: "Restaurante / Bar",
    location: "Setubal",
    rating: "4.5",
    avatar: img.restaurant,
    summary: "Bar e restaurante com menu, promocoes e horario.",
    about: "<p>Perfil demo de restaurante para testar menu, categorias, precos e modal de detalhes.</p>",
    data: {
      tabs: baseTabs([{ id: "menu", type: "menu", label: "Menu", enabled: true }]),
      menuSections: [
        {
          id: "promocoes",
          label: "Promocoes",
          enabled: true,
          items: [
            { name: "Crocante da Casa", imageUrl: img.food, images: [img.food], price: "7.50", promoEnabled: "yes", promoOldPrice: "7.50", promoNowPrice: "5.90", description: "Entrada crocante com molho da casa.", enabled: true },
          ],
        },
        {
          id: "bebidas",
          label: "Bebidas",
          enabled: true,
          items: [
            { name: "Cocktail Midnight", imageUrl: img.restaurant, images: [img.restaurant], price: "8", description: "Cocktail fresco com citrinos.", enabled: true },
          ],
        },
      ],
    },
  },
  {
    email: "demo.vista@vore.local",
    name: "Alojamento Vista",
    slug: "demo-alojamento-vista",
    type: "lodging",
    category: "Alojamento Local",
    location: "Geres",
    rating: "4.7",
    avatar: img.hotel,
    summary: "Casas e quartos para escapadas perto da natureza.",
    about: "<p>Alojamento demo para testar casas, quartos, disponibilidade e galeria.</p>",
    data: {
      tabs: baseTabs([{ id: "casas", type: "casas", label: "Casas", enabled: true }, { id: "quartos", type: "quartos", label: "Quartos", enabled: true }]),
      housesSections: [
        { id: "casa-rio", label: "Casa Rio", enabled: true, items: [{ name: "Casa Rio", imageUrl: img.hotel, images: [img.hotel], priceNight: "120", capacity: "4", beds: "2", bathrooms: "1", availability: "Disponivel", description: "Casa equipada com vista para a montanha.", amenities: ["Wi-Fi", "Cozinha", "Estacionamento"], enabled: true }] },
      ],
      roomsSections: [
        { id: "suite-luz", label: "Suite Luz", enabled: true, items: [{ name: "Suite Luz", imageUrl: img.room, images: [img.room], priceNight: "70", capacity: "2", beds: "1", bathrooms: "1", availability: "Disponivel", description: "Suite luminosa para duas pessoas.", enabled: true }] },
      ],
    },
  },
  {
    email: "demo.pedro@vore.local",
    name: "Pedro Soundcraft",
    slug: "demo-pedro-soundcraft",
    type: "creator",
    category: "Produtor Musical",
    location: "Braga",
    rating: "4.9",
    avatar: img.creator,
    summary: "Criador e produtor musical para marcas, artistas e eventos.",
    about: "<p>Perfil demo de criador para testar portfolio, servicos, agenda e links sociais.</p>",
    data: {
      tabs: baseTabs([{ id: "portfolio", type: "portfolio", label: "Portfolio", enabled: true }, { id: "servicos", type: "servicos", label: "Servicos", enabled: true }]),
      portfolioSections: [
        { id: "audio", label: "Audio", enabled: true, items: [{ name: "Identidade sonora", imageUrl: img.creator, description: "Pacote de som para campanha digital.", link: "https://vore.pt", enabled: true }] },
      ],
      servicesSections: [
        { id: "producao", label: "Producao", enabled: true, items: [{ name: "Beat personalizado", imageUrl: img.creator, images: [img.creator], time: "90", serviceType: "Audio", serviceTypeLabel: "Audio", price: "80", shortDescription: "Beat original com revisao incluida.", description: "Criacao de base instrumental alinhada com a identidade do projeto.", enabled: true }] },
      ],
    },
  },
];

function mergeProfileData(profile) {
  return {
    ...commonData(profile),
    ...(profile.data || {}),
  };
}

async function ensureDemoUser(profile) {
  const { data: existingUser, error: lookupError } = await supabase
    .from("users")
    .select("id,email")
    .eq("email", profile.email)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingUser) return existingUser.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: profile.email,
    password: "VoreDemo123!",
    email_confirm: true,
    user_metadata: {
      name: profile.name,
      account_type: "professional",
    },
  });

  if (error && !/already|registered|exists/i.test(error.message || "")) {
    throw error;
  }

  if (data && data.user) {
    await supabase.from("users").upsert({
      id: data.user.id,
      email: profile.email,
      name: profile.name,
      account_type: "professional",
    });
    return data.user.id;
  }

  const { data: createdUser, error: reloadError } = await supabase
    .from("users")
    .select("id,email")
    .eq("email", profile.email)
    .maybeSingle();

  if (reloadError || !createdUser) throw reloadError || new Error(`Could not resolve user ${profile.email}`);
  return createdUser.id;
}

async function seedProfile(profile) {
  const userId = await ensureDemoUser(profile);
  const data = mergeProfileData(profile);
  const payload = {
    user_id: userId,
    slug: profile.slug,
    name: profile.name,
    type: profile.type,
    bio: profile.summary,
    location: profile.location,
    avatar_url: profile.avatar,
    cover_url: profile.cover || profile.avatar,
    is_published: true,
    data,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "slug" });

  if (error) throw error;
  return profile.slug;
}

async function main() {
  console.log("Seeding Vore demo profiles...");
  const slugs = [];
  for (const profile of demoProfiles) {
    const slug = await seedProfile(profile);
    slugs.push(slug);
    console.log(`- ${profile.name}: ${slug}`);
  }
  console.log(`Done. Seeded ${slugs.length} demo profiles.`);
}

main().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
