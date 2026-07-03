import type { ProfileType } from "@/types/domain";

export const profileTypeOptions: Array<{ value: ProfileType; label: string }> = [
  { value: "service_pro", label: "Servicos" },
  { value: "food", label: "Restaurante / Bar" },
  { value: "shop", label: "Loja" },
  { value: "lodging", label: "Alojamento" },
  { value: "creator", label: "Criador" }
];
