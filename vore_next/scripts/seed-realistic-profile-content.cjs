const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const apply = process.argv.includes("--apply");
const onlySlugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const onlySlug = onlySlugArg ? onlySlugArg.slice("--slug=".length).trim() : "";

const imagePools = {
  food: [
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
  ],
  service_pro: [
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
  ],
  shop: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80",
  ],
  lodging: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80",
  ],
  creator: [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80",
  ],
};

function hashText(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function euro(value) {
  return String(value);
}

function cleanType(type) {
  const value = String(type || "").trim().toLowerCase();
  if (["food", "service_pro", "shop", "lodging", "creator"].includes(value)) return value;
  return "service_pro";
}

function detectCategory(profile, type) {
  const text = [profile.name, profile.slug, profile.bio, profile.location, profile.data && profile.data.category]
    .map((entry) => String(entry || "").toLowerCase())
    .join(" ");
  if (type === "food") {
    if (/sushi|noodle/.test(text)) return "Restaurante asiatico";
    if (/cafe|coffee|brunch|pastelaria|dessert/.test(text)) return "Cafe e brunch";
    if (/bar|tapas|grill|brasa|seafood|bistro|pizza|vegan/.test(text)) return "Restaurante / Bar";
    return "Restaurante";
  }
  if (type === "shop") {
    if (/sneaker|fashion|style/.test(text)) return "Moda";
    if (/tech/.test(text)) return "Tecnologia";
    if (/decor|book|bike|pet|organic|market/.test(text)) return "Loja / Produto";
    return "Loja";
  }
  if (type === "lodging") {
    if (/hostel/.test(text)) return "Hostel";
    if (/hotel|suites/.test(text)) return "Hotel";
    if (/guest|loft|stay|river|budget|boutique/.test(text)) return "Alojamento local";
    return "Alojamento";
  }
  if (type === "creator") {
    if (/photo|video|youtube|tiktok|podcast|music/.test(text)) return "Conteudo";
    if (/design|ui|branding|web|seo|marketing|ads|copy/.test(text)) return "Criador digital";
    return "Criador";
  }
  if (/massage|physio|osteopath|acupuncture|yoga|pilates|coach|trainer|nutrition/.test(text)) return "Bem-estar";
  if (/barber|hair|beauty|nails|tattoo/.test(text)) return "Beleza";
  if (/clean|electric|moving|car|pet/.test(text)) return "Servicos";
  return "Profissional";
}

function tabsFor(type) {
  if (type === "food") return [
    ["sobre", "sobre", "Sobre"],
    ["menu", "menu", "Menu"],
    ["galeria", "galeria", "Galeria"],
    ["horario", "horario", "Horario"],
    ["locais", "locais", "Localizacao"],
    ["agenda", "agenda", "Agenda"],
  ];
  if (type === "shop") return [
    ["sobre", "sobre", "Sobre"],
    ["produtos", "produtos", "Produtos"],
    ["campanhas", "campanhas", "Campanhas"],
    ["galeria", "galeria", "Galeria"],
    ["horario", "horario", "Horario"],
    ["locais", "locais", "Localizacao"],
    ["parcerias", "parcerias", "Parcerias"],
  ];
  if (type === "lodging") return [
    ["sobre", "sobre", "Sobre"],
    ["casas", "casas", "Casas"],
    ["quartos", "quartos", "Quartos"],
    ["galeria", "galeria", "Galeria"],
    ["locais", "locais", "Localizacao"],
    ["horario", "horario", "Horario"],
  ];
  if (type === "creator") return [
    ["sobre", "sobre", "Sobre"],
    ["portfolio", "portfolio", "Portfolio"],
    ["servicos", "servicos", "Servicos"],
    ["galeria", "galeria", "Galeria"],
    ["agenda", "agenda", "Agenda"],
    ["parcerias", "parcerias", "Parcerias"],
  ];
  return [
    ["sobre", "sobre", "Sobre"],
    ["servicos", "servicos", "Servicos"],
    ["portfolio", "portfolio", "Portfolio"],
    ["galeria", "galeria", "Galeria"],
    ["agenda", "agenda", "Agenda"],
    ["horario", "horario", "Horario"],
    ["locais", "locais", "Localizacao"],
    ["parcerias", "parcerias", "Parcerias"],
  ];
}

function makeTabs(type) {
  return tabsFor(type).map(([id, tabType, label]) => ({ id, type: tabType, label, enabled: true }));
}

function makeSection(id, label, items) {
  return { id, label, enabled: true, items };
}

function makeItem(name, imageUrl, fields = {}) {
  const images = imageUrl ? [imageUrl] : [];
  return Object.assign({
    name,
    title: name,
    imageUrl,
    images,
    enabled: true,
    promoEnabled: "no",
    quoteOnly: "no",
    extraFields: [],
  }, fields);
}

function aboutFor(profile, type, category, location) {
  const name = profile.name || "Perfil Vore";
  const openings = {
    food: `${name} é um espaço em ${location} pensado para comer bem, descobrir sabores e marcar momentos simples sem complicação.`,
    service_pro: `${name} junta atendimento cuidado, experiência prática e uma forma clara de apresentar serviços em ${location}.`,
    shop: `${name} seleciona produtos com critério, novidades regulares e uma experiência de compra simples em ${location}.`,
    lodging: `${name} recebe pessoas que procuram uma estadia confortável, bem localizada e fácil de planear em ${location}.`,
    creator: `${name} trabalha conteúdo, imagem e projetos digitais com uma abordagem organizada, visual e próxima.`,
  };
  return [
    openings[type] || openings.service_pro,
    `No perfil encontras informação útil sobre ${category.toLowerCase()}, imagens, horários, localização e formas rápidas de contacto.`,
    "A Vore organiza tudo num só lugar para conseguires perceber rapidamente o ambiente, as opções disponíveis e a melhor forma de avançar.",
  ].join("\n\n");
}

function commonData(profile, type, category, seed) {
  const current = profile.data && typeof profile.data === "object" && !Array.isArray(profile.data) ? profile.data : {};
  const location = String(profile.location || current.location || pick(["Lisboa", "Setubal", "Porto", "Braga", "Cascais"], seed)).trim();
  const pool = imagePools[type] || imagePools.service_pro;
  const avatar = String(current.avatar || profile.avatar_url || pick(pool, seed, 2));
  const cover = String(current.cover || profile.cover_url || pick(pool, seed, 1));
  return Object.assign({}, current, {
    name: profile.name || current.name || "Perfil Vore",
    type,
    category,
    role: category,
    location,
    rating: String(current.rating || (4.3 + ((seed % 7) / 10)).toFixed(1)),
    avatar,
    cover,
    aboutSummary: `${category} em ${location}, com informação organizada e atualizada.`,
    about: aboutFor(Object.assign({}, profile, { location }), type, category, location),
    tabs: makeTabs(type),
    links: [
      { key: "instagram", type: "instagram", url: `https://instagram.com/${String(profile.slug || "vore").replace(/-/g, ".")}`, label: "Instagram" },
      { key: "whatsapp", type: "whatsapp", url: "https://wa.me/351910000000", label: "WhatsApp" },
      { key: "website", type: "website", url: "https://vore.pt", label: "Website" },
    ],
    gallery: {
      photos: [avatar, cover, pick(pool, seed, 3), pick(pool, seed, 4)].filter(Boolean),
      videos: [],
      reels: [],
    },
    galleryViews: {
      photos: [
        { fit: "cover", zoom: 100, posX: 50, posY: 50 },
        { fit: "cover", zoom: 100, posX: 50, posY: 50 },
        { fit: "cover", zoom: 100, posX: 50, posY: 50 },
        { fit: "cover", zoom: 100, posX: 50, posY: 50 },
      ],
      videos: [],
      reels: [],
    },
    schedule: {
      seg: "09:00 - 18:00",
      ter: "09:00 - 18:00",
      qua: "09:00 - 18:00",
      qui: "09:00 - 18:00",
      sex: "09:00 - 19:00",
      sab: "10:00 - 14:00",
      dom: type === "food" ? "12:00 - 16:00" : "Fechado",
    },
    locations: [
      { title: profile.name || "Local principal", address: `${location}, Portugal`, note: "Morada principal", link: "https://maps.google.com", enabled: true },
    ],
    agenda: {
      description: "Usa o contacto do perfil para confirmar disponibilidade.",
      reserveLink: "https://wa.me/351910000000",
      slots: [
        { name: "Manha", day: "Hoje", weekday: "Segunda", times: ["09:30", "11:00"], enabled: true },
        { name: "Tarde", day: "Amanha", weekday: "Terca", times: ["15:00", "17:30"], enabled: true },
      ],
    },
    partners: [
      { name: "Parceiro local", description: "Colaboração recomendada para complementar a experiência.", image: pick(pool, seed, 4), link: "https://vore.pt", enabled: true },
    ],
  });
}

function buildFood(profile, data, seed) {
  const pool = imagePools.food;
  data.menuSections = [
    makeSection("promocoes", "Promoções", [
      makeItem("Menu do dia", pick(pool, seed, 0), { price: euro(12.5), promoEnabled: "yes", promoOldPrice: euro(15), promoNowPrice: euro(12.5), shortDescription: "Prato, bebida e café.", description: "Uma sugestão equilibrada para almoço rápido, com ingredientes frescos e serviço atento." }),
      makeItem("Entrada da casa", pick(pool, seed, 1), { price: euro(5.9), shortDescription: "Pequena entrada para partilhar.", description: "Ideal para começar a refeição com uma opção simples e bem preparada." }),
    ]),
    makeSection("principais", "Principais", [
      makeItem("Especial da cozinha", pick(pool, seed, 2), { price: euro(16), shortDescription: "O prato mais pedido da semana.", description: "Receita de assinatura, boa apresentação e sabor consistente." }),
      makeItem("Opção leve", pick(pool, seed, 3), { price: euro(11), shortDescription: "Para uma refeição mais fresca.", description: "Uma alternativa leve com boa combinação de textura e sabor." }),
    ]),
  ];
  data.servicesSections = [];
  return data;
}

function buildServices(profile, data, seed, category) {
  const pool = imagePools.service_pro;
  data.servicesSections = [
    makeSection("destaques", "Destaques", [
      makeItem("Sessao inicial", pick(pool, seed, 0), { time: "60", serviceType: category, serviceTypeLabel: category, price: euro(45 + (seed % 4) * 5), shortDescription: "Primeira sessao para avaliar necessidades e definir proximos passos.", description: "Atendimento individual, explicacao clara do processo e recomendacoes adaptadas ao objetivo.", note: "Recomendado para primeira visita" }),
      makeItem("Acompanhamento completo", pick(pool, seed, 1), { time: "75", serviceType: category, serviceTypeLabel: category, price: euro(65 + (seed % 3) * 10), promoEnabled: "yes", promoOldPrice: euro(85), promoNowPrice: euro(70), shortDescription: "Opcao mais completa para resultados consistentes.", description: "Servico pensado para quem quer continuidade, cuidado e acompanhamento com detalhe.", extraFields: [{ label: "Inclui", value: "Plano simples e revisao final" }] }),
    ]),
    makeSection("consultoria", "Consultoria", [
      makeItem("Diagnostico rapido", "", { time: "30", serviceType: "Consultoria", serviceTypeLabel: "Consultoria", quoteOnly: "yes", shortDescription: "Conversa curta para perceber o melhor caminho.", description: "Analise inicial e recomendacao objetiva sem compromisso.", extraFields: [{ label: "Formato", value: "Online ou presencial" }] }),
    ]),
  ];
  data.portfolioSections = [
    makeSection("resultados", "Resultados", [
      makeItem("Antes e depois", pick(pool, seed, 2), { description: "Exemplo visual para testar portfolio, imagem e modal de detalhe.", link: "https://vore.pt" }),
      makeItem("Projeto acompanhado", pick(pool, seed, 3), { description: "Caso realista com explicacao curta do processo e resultado.", link: "https://vore.pt" }),
    ]),
  ];
  return data;
}

function buildShop(profile, data, seed) {
  const pool = imagePools.shop;
  data.productsSections = [
    makeSection("novidades", "Novidades", [
      makeItem("Produto em destaque", pick(pool, seed, 0), { price: euro(39.9), shortDescription: "Escolha popular da semana.", description: "Produto selecionado pela relacao entre qualidade, uso diario e apresentacao." }),
      makeItem("Edicao limitada", pick(pool, seed, 1), { price: euro(79), promoEnabled: "yes", promoOldPrice: euro(99), promoNowPrice: euro(79), shortDescription: "Disponibilidade limitada.", description: "Peca especial para testar campanhas, preco promocional e detalhe do produto." }),
    ]),
    makeSection("essenciais", "Essenciais", [
      makeItem("Pack essencial", pick(pool, seed, 2), { price: euro(24.5), shortDescription: "Boa opcao para comecar.", description: "Conjunto simples com boa utilidade e compra facil." }),
    ]),
  ];
  data.campaignsSections = [
    makeSection("campanhas", "Campanhas", [
      makeItem("Campanha da semana", pick(pool, seed, 3), { price: euro(19.9), promoEnabled: "yes", promoOldPrice: euro(29.9), promoNowPrice: euro(19.9), shortDescription: "Promocao temporaria.", description: "Campanha criada para testar destaque de preco, imagem e chamada no perfil." }),
    ]),
  ];
  return data;
}

function buildCreator(profile, data, seed) {
  const pool = imagePools.creator;
  data.portfolioSections = [
    makeSection("projetos", "Projetos", [
      makeItem("Projeto de marca", pick(pool, seed, 0), { description: "Direcao visual, conteudo e organizacao da presenca digital.", link: "https://vore.pt" }),
      makeItem("Conteudo para redes", pick(pool, seed, 1), { description: "Serie de pecas para publicacao, narrativa e crescimento de comunidade.", link: "https://vore.pt" }),
    ]),
    makeSection("cases", "Cases", [
      makeItem("Lancamento digital", pick(pool, seed, 2), { description: "Planeamento, criacao e entrega de conteudo para campanha curta.", link: "https://vore.pt" }),
    ]),
  ];
  data.servicesSections = [
    makeSection("servicos", "Servicos", [
      makeItem("Sessao criativa", pick(pool, seed, 3), { time: "90", serviceType: "Criacao", serviceTypeLabel: "Criacao", price: euro(80), shortDescription: "Sessao para alinhar conceito, mensagem e proximas entregas.", description: "Reuniao criativa com estrutura, referencias e plano simples de execucao." }),
      makeItem("Pack mensal", "", { time: "Mensal", serviceType: "Conteudo", serviceTypeLabel: "Conteudo", quoteOnly: "yes", shortDescription: "Acompanhamento continuo para redes ou projeto digital.", description: "Ideal para marcas ou profissionais que precisam de consistencia." }),
    ]),
  ];
  return data;
}

function buildLodging(profile, data, seed) {
  const pool = imagePools.lodging;
  data.housesSections = [
    makeSection("estadias", "Estadias", [
      makeItem("Apartamento principal", pick(pool, seed, 0), {
        images: [pick(pool, seed, 0), pick(pool, seed, 1), pick(pool, seed, 2)],
        priceNight: euro(95 + (seed % 5) * 10),
        capacity: "4 hospedes",
        beds: "2 camas",
        bathrooms: "1 casa de banho",
        checkIn: "15:00",
        checkOut: "11:00",
        availability: "Disponivel",
        amenities: ["Wi-Fi", "Cozinha", "Ar condicionado", "Toalhas", "Check-in autonomo"],
        houseRules: ["Nao fumador", "Sem festas", "Silencio depois das 22:00"],
        description: "Espaco confortavel para estadias curtas, com boa localizacao e ambiente calmo.",
      }),
    ]),
  ];
  data.roomsSections = [
    makeSection("quartos", "Quartos", [
      makeItem("Quarto duplo", pick(pool, seed, 3), {
        images: [pick(pool, seed, 3), pick(pool, seed, 4)],
        priceNight: euro(55 + (seed % 4) * 8),
        capacity: "2 hospedes",
        beds: "1 cama dupla",
        bathrooms: "Partilhada",
        checkIn: "15:00",
        checkOut: "11:00",
        availability: "Disponivel",
        amenities: ["Wi-Fi", "Roupa de cama", "Secretaria"],
        houseRules: ["Nao fumador", "Respeitar zonas comuns"],
        description: "Quarto simples e bem localizado para uma estadia pratica.",
      }),
    ]),
  ];
  return data;
}

function buildData(profile) {
  const type = cleanType(profile.type);
  const seed = hashText(profile.slug || profile.name || profile.id);
  const category = detectCategory(profile, type);
  let data = commonData(profile, type, category, seed);
  if (type === "food") data = buildFood(profile, data, seed);
  else if (type === "shop") data = buildShop(profile, data, seed);
  else if (type === "lodging") data = buildLodging(profile, data, seed);
  else if (type === "creator") data = buildCreator(profile, data, seed);
  else data = buildServices(profile, data, seed, category);
  data.__seededRealisticContentAt = new Date().toISOString();
  return data;
}

function backupProfiles(profiles) {
  const backupDir = path.join(process.cwd(), "scripts", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir, `profiles-realistic-content-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(profiles, null, 2), "utf8");
  return file;
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env vars.");
  }

  let query = supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (onlySlug) query = query.eq("slug", onlySlug);

  const { data: profiles, error } = await query;
  if (error) throw error;
  if (!profiles || !profiles.length) throw new Error("No profiles found.");

  const backupFile = backupProfiles(profiles);
  const updates = profiles.map((profile) => {
    const nextData = buildData(profile);
    return {
      id: profile.id,
      slug: profile.slug,
      name: profile.name,
      type: cleanType(profile.type),
      category: nextData.category,
      tabCount: nextData.tabs.length,
      nextData,
    };
  });

  console.log(`${apply ? "APPLY" : "DRY RUN"} realistic content for ${updates.length} profile(s).`);
  console.log(`Backup: ${backupFile}`);

  const grouped = updates.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
  console.log("By type:", grouped);
  console.log("Sample:");
  updates.slice(0, 10).forEach((item) => {
    console.log(`- ${item.name} (${item.slug}) -> ${item.type}, ${item.category}, ${item.tabCount} tabs`);
  });

  if (!apply) {
    console.log("Nothing written. Run with --apply to update Supabase.");
    return;
  }

  for (const item of updates) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        type: item.type,
        bio: String(item.nextData.aboutSummary || ""),
        location: String(item.nextData.location || ""),
        avatar_url: String(item.nextData.avatar || ""),
        cover_url: String(item.nextData.cover || ""),
        is_published: true,
        data: item.nextData,
      })
      .eq("id", item.id);
    if (updateError) throw new Error(`${item.slug}: ${updateError.message}`);
  }

  console.log(`Updated ${updates.length} profile(s) in Supabase.`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
