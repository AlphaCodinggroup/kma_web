import type { FlowDetailVM, FlowQuestionVM } from "./FlowQuestionsDialog";

export interface MakeDummyFlowArgs {
  title: string;
  description?: string;
  /** Por defecto 5 (corta la lista base si ponés menos). */
  questionsCount?: number;
}

/**
 * Genera un FlowDetailVM con preguntas de ejemplo
 * para probar el modal de manera puramente visual.
 */
export function makeDummyFlowDetail({
  title,
  description,
  questionsCount = 5,
}: MakeDummyFlowArgs): FlowDetailVM {
  const baseQuestions: FlowQuestionVM[] = [
    {
      id: "q1",
      text: "Are fire exits clearly marked and unobstructed?",
      type: "yes_no",
    },
    {
      id: "q2",
      text: "Are fire extinguishers present and properly maintained?",
      type: "yes_no",
    },
    {
      id: "q3",
      text: "What type of fire extinguisher system is installed?",
      type: "multiple_choice",
      options: ["Foam", "CO2", "Dry Powder", "Water"],
      visibleIf: { questionId: "Q2", equals: "yes" },
    },
    {
      id: "q4",
      text: "Is the emergency lighting system functional?",
      type: "yes_no",
    },
    {
      id: "q5",
      text: "Additional notes",
      type: "text_input",
    },
  ];

  return {
    title,
    description,
    questions: baseQuestions.slice(0, Math.max(1, questionsCount)),
  };
}

/** Útil para storybooks/demos rápidas */
export const DUMMY_FLOW_DETAIL: FlowDetailVM = makeDummyFlowDetail({
  title: "Fire Safety Audit Flow",
  description: "Comprehensive fire safety inspection checklist",
  questionsCount: 5,
});
