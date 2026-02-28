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
    question: "Quel prophète a été avalé par un grand poisson selon les textes sacrés ?",
    options: ["Moïse", "Jonas", "Élie", "Daniel"],
    correctIndex: 1,
    explanation: "Jonas (Yunus) a été avalé par un grand poisson après avoir fui sa mission divine. Il a prié Dieu depuis le ventre du poisson et a été libéré.",
    category: "Prophètes",
  },
  {
    id: 2,
    question: "Combien de jours Dieu a-t-Il mis pour créer les cieux et la terre selon les traditions abrahamiques ?",
    options: ["5 jours", "6 jours", "7 jours", "10 jours"],
    correctIndex: 1,
    explanation: "Selon les traditions abrahamiques, Dieu a créé les cieux et la terre en six jours.",
    category: "Création",
  },
  {
    id: 3,
    question: "Quel est le premier des Dix Commandements ?",
    options: ["Tu ne tueras point", "Tu ne voleras point", "Tu n'auras pas d'autres dieux devant moi", "Honore ton père et ta mère"],
    correctIndex: 2,
    explanation: "Le premier commandement établit le monothéisme : « Tu n'auras pas d'autres dieux devant moi ».",
    category: "Commandements",
  },
  {
    id: 4,
    question: "Dans quelle ville est né Jésus selon la tradition chrétienne ?",
    options: ["Nazareth", "Jérusalem", "Bethléem", "Galilée"],
    correctIndex: 2,
    explanation: "Selon les Évangiles, Jésus est né à Bethléem, en Judée.",
    category: "Histoire sacrée",
  },
  {
    id: 5,
    question: "Quel est le livre saint de l'Islam ?",
    options: ["La Torah", "La Bible", "Le Coran", "Les Psaumes"],
    correctIndex: 2,
    explanation: "Le Coran est le livre saint de l'Islam, révélé au prophète Muhammad par l'ange Gabriel.",
    category: "Textes sacrés",
  },
];
