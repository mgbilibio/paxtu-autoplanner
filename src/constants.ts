import { ScoutBranch } from "./types";

export const BRANCHES = [
  {
    id: ScoutBranch.LOBINHO,
    label: "Ramo Lobinho",
    age: "6,5 a 10 anos",
    desc: "Fantasia, socialização e descobertas (Mowgli e a Jângal).",
    color: "bg-blue-500"
  },
  {
    id: ScoutBranch.ESCOTEIRO,
    label: "Ramo Escoteiro",
    age: "11 a 14 anos",
    desc: "Aventura, autonomia e sistema de patrulhas.",
    color: "bg-green-600"
  },
  {
    id: ScoutBranch.SENIOR,
    label: "Ramo Sênior",
    age: "15 a 17 anos",
    desc: "Desafio, identidade e superação de limites.",
    color: "bg-red-900"
  },
  {
    id: ScoutBranch.PIONEIRO,
    label: "Ramo Pioneiro",
    age: "18 a 21 anos",
    desc: "Serviço, projeto de vida e inserção comunitária.",
    color: "bg-red-600"
  }
];

export const EDUCATIONAL_AREAS_DESC = {
  Físico: "Desenvolvimento do corpo e saúde.",
  Intelectual: "Aquisição de conhecimentos e habilidades.",
  Caráter: "Formação de valores e ética.",
  Afetivo: "Gestão das emoções e sentimentos.",
  Social: "Convivência e cooperação.",
  Espiritual: "Busca do sentido da vida."
};

export const SPECIALTY_AXES_DESC = {
  "Saúde e Bem-Estar": "Cuidados físicos, mentais e segurança.",
  "Meio Ambiente": "Sustentabilidade, natureza e conservação.",
  "Paz e Desenvolvimento": "Cidadania, cultura e serviço comunitário.",
  "Habilidades para a Vida": "Conhecimentos técnicos, profissionais e práticos."
};