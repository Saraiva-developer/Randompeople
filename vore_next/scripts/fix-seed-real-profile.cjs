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

const targetSlug = process.argv[2] || "lx-burger-house";
const demoSlugs = [
  "demo-creative-studio-lx",
  "demo-sneaker-point",
  "demo-midnight-room",
  "demo-alojamento-vista",
  "demo-pedro-soundcraft",
];

const img = {
  avatar: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
  massage: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
  facial: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80",
  studio: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
  event: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
  food: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
};

function backupProfile(profile) {
  const backupDir = path.join(process.cwd(), "scripts", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir, `profile-${profile.slug}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(profile, null, 2), "utf8");
  return file;
}

function buildEditorData(existing) {
  const current = existing && typeof existing.data === "object" && !Array.isArray(existing.data)
    ? existing.data
    : {};
  const name = String(existing.name || current.name || "Creative Studio LX");
  const category = String(current.category || current.role || existing.bio || "Estetica");
  const location = String(existing.location || current.location || "Lisboa");

  return {
    ...current,
    name,
    type: "service_pro",
    category,
    role: category,
    location,
    rating: current.rating || "4.8",
    avatar: current.avatar || existing.avatar_url || img.avatar,
    cover: current.cover || existing.cover_url || img.avatar,
    aboutSummary: current.aboutSummary || "Perfil demo carregado para testar o editor com conteudo real.",
    about: current.about || "<p>Este perfil foi preenchido com conteudo de teste para validar a dinamica do editor, preview e perfil publico.</p><p>Podes editar, remover, mudar categorias, imagens, precos, descricoes, agenda e links.</p>",
    tabs: [
      { id: "sobre", type: "sobre", label: "Sobre", enabled: true },
      { id: "servicos", type: "servicos", label: "Servicos", enabled: true },
      { id: "portfolio", type: "portfolio", label: "Portfolio", enabled: true },
      { id: "galeria", type: "galeria", label: "Galeria", enabled: true },
      { id: "agenda", type: "agenda", label: "Agenda", enabled: true },
      { id: "horario", type: "horario", label: "Horario", enabled: true },
      { id: "locais", type: "locais", label: "Localizacao", enabled: true },
      { id: "parcerias", type: "parcerias", label: "Parcerias", enabled: true },
    ],
    links: [
      { type: "instagram", url: "https://instagram.com/vore.demo", label: "Instagram" },
      { type: "whatsapp", url: "https://wa.me/351910000000", label: "WhatsApp" },
      { type: "youtube", url: "https://youtube.com", label: "YouTube" },
    ],
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
            quoteOnly: "no",
            price: "50",
            promoEnabled: "yes",
            promoOldPrice: "50",
            promoNowPrice: "30",
            shortDescription: "Massagem completa para aliviar tensao e recuperar energia.",
            description: "Uma sessao pensada para abrandar, soltar tensoes e sair com uma sensacao clara de leveza.",
            note: "Ideal para fim de dia",
            extraFields: [
              { label: "Inclui", value: "Oleos aromaticos e ambiente privado" },
              { label: "Recomendado", value: "Stress e cansaco muscular" },
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
            quoteOnly: "no",
            price: "38",
            promoEnabled: "no",
            shortDescription: "Limpeza facial leve com acabamento luminoso.",
            description: "Tratamento de rosto para preparar a pele e devolver frescura sem complicar a rotina.",
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
            imageUrl: "",
            images: [],
            time: "30",
            serviceType: "Consultoria",
            serviceTypeLabel: "Consultoria",
            quoteOnly: "yes",
            price: "",
            promoEnabled: "no",
            shortDescription: "Sessao curta para perceber estilo, objetivos e proximos passos.",
            description: "Mapeamos necessidades, referencias e uma direcao visual simples para a tua presenca.",
            extraFields: [{ label: "Formato", value: "Online ou presencial" }],
            enabled: true,
          },
        ],
      },
    ],
    services: [],
    portfolioSections: [
      {
        id: "trabalhos",
        label: "Trabalhos",
        enabled: true,
        items: [
          { name: "Campanha visual primavera", imageUrl: img.studio, images: [img.studio], description: "Direcao criativa, fotografia e conteudo para redes.", link: "https://vore.pt", enabled: true },
        ],
      },
    ],
    gallery: {
      photos: [current.avatar || existing.avatar_url || img.avatar, img.massage, img.facial, img.event].filter(Boolean),
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
    agenda: {
      description: "Marca uma sessao diretamente pelo contacto do perfil.",
      reserveLink: "https://wa.me/351910000000",
      slots: [
        { name: "Manha", day: "Hoje", weekday: "Segunda", times: ["09:30", "11:00"], enabled: true },
        { name: "Tarde", day: "Amanha", weekday: "Terca", times: ["15:00", "17:30"], enabled: true },
      ],
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
    partners: [
      { name: "Vore Partner", description: "Parceiro recomendado para testar cards.", image: img.studio, link: "https://vore.pt", enabled: true },
    ],
    locations: [
      { title: name, address: `${location}, Portugal`, note: "Local principal", link: "https://maps.google.com", enabled: true },
    ],
  };
}

async function main() {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", targetSlug)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error(`Profile not found: ${targetSlug}`);

  const backupFile = backupProfile(profile);
  const nextData = buildEditorData(profile);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      type: "service_pro",
      bio: String(nextData.aboutSummary || ""),
      location: String(nextData.location || ""),
      avatar_url: String(nextData.avatar || ""),
      cover_url: String(nextData.cover || ""),
      is_published: true,
      data: nextData,
    })
    .eq("id", profile.id);
  if (updateError) throw updateError;

  const { error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .in("slug", demoSlugs);
  if (deleteError) throw deleteError;

  console.log(`Seeded real profile: ${profile.name} (${profile.slug})`);
  console.log(`Backup: ${backupFile}`);
  console.log(`Removed wrong demo profiles: ${demoSlugs.length}`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
