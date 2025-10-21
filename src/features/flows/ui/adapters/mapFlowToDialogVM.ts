import type { Flow } from "@entities/flow/model";
import type { FlowDetailVM, FlowQuestionVM } from "../FlowQuestionsDialog";

/**
 * Mapea un Flow de dominio al ViewModel esperado por FlowQuestionsDialog.
 * - Por defecto incluye solo pasos de tipo "Question" (Yes/No) y "Select" (Multiple Choice).
 */
export function mapFlowToDialogVM(
  flow: Flow,
  opts?: { includeForms?: boolean }
): FlowDetailVM {
  const includeForms = opts?.includeForms ?? false;

  const questions: FlowQuestionVM[] = [];
  for (const step of flow.steps) {
    if (step.type === "Question") {
      questions.push({
        id: step.id,
        text: step.text,
        type: "yes_no",
      });
    } else if (step.type === "Select") {
      const label = step.title ?? step.text ?? "Select an option";
      questions.push({
        id: step.id,
        text: label,
        type: "multiple_choice",
        options: step.options.map((o) => o.label),
      });
    } else if (includeForms && step.type === "Form") {
      questions.push({
        id: step.id,
        text: step.title,
        type: "text_input",
      });
    }
    // type "End": no se muestra
  }

  return {
    title: flow.title,
    description: flow.description ?? "",
    questions,
  };
}
