export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

export const sampleQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "Qui a construit l'arche sur l'ordre de Dieu pour survivre au déluge ?",
    options: ["Abraham", "Moïse", "Noé", "David"],
    correctIndex: 2,
    explanation: "Dieu a ordonné à Noé de construire une arche pour sauver sa famille et les animaux du déluge (Genèse 6-9).",
    category: "Ancien Testament",
  },
  {
    id: 2,
    question: "Combien d'apôtres Jésus a-t-il choisis ?",
    options: ["7", "10", "12", "15"],
    correctIndex: 2,
    explanation: "Jésus a choisi 12 apôtres pour être ses disciples les plus proches (Matthieu 10:1-4).",
    category: "Nouveau Testament",
  },
  {
    id: 3,
    question: "Quel est le premier livre de la Bible ?",
    options: ["Exode", "Genèse", "Lévitique", "Nombres"],
    correctIndex: 1,
    explanation: "La Genèse est le premier livre de la Bible, racontant la création du monde et l'histoire des patriarches.",
    category: "Textes bibliques",
  },
  {
    id: 4,
    question: "Qui a tué le géant Goliath ?",
    options: ["Saül", "Jonathan", "David", "Samson"],
    correctIndex: 2,
    explanation: "Le jeune berger David a vaincu le géant Goliath avec une fronde et une pierre (1 Samuel 17).",
    category: "Ancien Testament",
  },
  {
    id: 5,
    question: "Dans quelle ville est né Jésus-Christ ?",
    options: ["Nazareth", "Jérusalem", "Bethléem", "Capernaüm"],
    correctIndex: 2,
    explanation: "Jésus est né à Bethléem selon les Évangiles de Matthieu et Luc (Matthieu 2:1, Luc 2:4-7).",
    category: "Vie de Jésus",
  },
];
