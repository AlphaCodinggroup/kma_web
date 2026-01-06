# Frontend Navigation Guide

Esta guía explica cómo implementar la navegación de flows en la aplicación frontend con el nuevo patrón unificado de condiciones.

---

## Tipos de Steps

### 1. Question
Pregunta YES/NO que dirige a diferentes pasos

```json
{
  "id": "AR-Q01",
  " type": "Question",
  "text": "Is the surface stable?",
  "yes_next": "AR-Q02",
  "no_next": "AR-F01",
  "barrier_id": "AR-B01"
}
```

### 2. Select
Múltiples opciones, cada una va a un paso diferente

```json
{
  "id": "AR-F03",
  "type": "Select",
  "text": "Select mitigation:",
  "options": [
    {"label": "Build a ramp", "next": "AR-F05", "barrier_id": "AR-B03"},
    {"label": "Regrade route", "next": "AR-F04", "barrier_id": "AR-B04"}
  ]
}
```

### 3. Form
Captura datos y va al siguiente paso

```json
{
  "id": "AR-F01",
  "type": "Form",
  "title": "Surface Condition",
  "next": "AR-Q02",
  "fields": [...]
}
```

### 4. End
Termina el flow

```json
{
  "id": "END",
  "type": "End"
}
```

> **Nota sobre `metadata`**: Los steps pueden tener un campo `metadata` (ej: `shared_quantity`) pero este **NO se usa en el frontend**. Es solo para el backend (enrichment processor) para saber cómo aplicar datos compartidos. El frontend solo debe guardar las respuestas del usuario en orden.

---

## Navegación Condicional (Nuevo Patrón Unificado)

### ConditionalYesNext

Este patrón **reemplaza** `check_previous_nos` (deprecated) y soporta tanto Questions como Selects.

```json
{
  "id": "AR-Q05",
  "type": "Question",
  "text": "Is the cross slope less than 2%?",
  "yes_next": "AR-Q06",
  "no_next": "AR-F06",
  "conditional_yes_next": {
    "conditions": [
      {"step_id": "SI-Q02", "answer": "NO"},
      {"step_id": "AR-F03", "selected_option": "Regrade the accessible route"}
    ],
    "next": "AR-QUANTITY-01",
    "match_any": false
  }
}
```

### Tipos de Condiciones

#### 1. Question Condition (respuesta YES/NO)

```json
{
  "step_id": "SI-Q02",
  "answer": "NO"
}
```

#### 2. Select Condition (opción seleccionada)

```json
{
  "step_id": "AR-F03",
  "selected_option": "Regrade the accessible route"
}
```

### Lógica: match_any

- **`match_any: false`** (default) → **AND**: Todas las condiciones deben cumplirse
- **`match_any: true`** → **OR**: Al menos una condición debe cumplirse

### ConditionalNoNext (NUEVO)

Similar a `conditional_yes_next`, pero se evalúa cuando la respuesta es **NO**.

```json
{
  "id": "CR-B15B",
  "type": "Question",
  "text": "Is this curb ramp located at a crossing?",
  "yes_next": "CR-B15C",
  "no_next": "END",
  "conditional_no_next": {
    "conditions": [
      {"step_id": "CR-B03", "answer": "NO"},
      {"step_id": "CR-B04", "answer": "NO"},
      {"step_id": "CR-B05", "answer": "NO"}
    ],
    "next": "CR-QUANTITY-01",
    "match_any": true
  }
}
```

**Lógica**: 
- Si responde **NO** y **alguna** condición se cumple → va a `CR-QUANTITY-01`
- Si responde **NO** y **ninguna** condición se cumple → va a `END`
- Si responde **YES** → va a `CR-B15C` (ignora las condiciones)

**Caso de uso**: Capturar barreras previas antes de terminar el flujo prematuramente.

---

## Implementación Frontend

### Función de Evaluación Unificada

```typescript
interface Condition {
  step_id: string;
  answer?: "YES" | "NO";           // Para Questions
  selected_option?: string;         // Para Selects
}

interface ConditionalYesNext {
  conditions: Condition[];
  next: string;
  match_any?: boolean;  // Default: false (AND logic)
}

interface Step {
  id: string;
  type: "Question" | "Select" | "Form" | "End";
  yes_next?: string;
  no_next?: string;
  next?: string;
  conditional_yes_next?: ConditionalYesNext;
  conditional_no_next?: ConditionalYesNext;  // NUEVO
  check_previous_nos?: string[];  // Deprecated
  // ... otros campos
}

function getNextStep(currentStep: Step, answer: any, userHistory: UserHistoryEntry[]): string {
  // Form y End - navegación simple
  if (currentStep.type === "Form") {
    return currentStep.next;
  }
  
  if (currentStep.type === "End") {
    return null;
  }
  
  // Select - encontrar la opción seleccionada
  if (currentStep.type === "Select") {
    const selectedOption = currentStep.options.find(opt => opt.label === answer);
    return selectedOption.next;
  }
  
  // Question - evaluación condicional
  if (currentStep.type === "Question") {
    // Respuesta NO → evaluar conditional_no_next
    if (answer === "NO") {
      if (currentStep.conditional_no_next) {
        const conditionsMet = evaluateConditions(
          currentStep.conditional_no_next, 
          userHistory
        );
        
        if (conditionsMet) {
          return currentStep.conditional_no_next.next;
        }
      }
      
      return currentStep.no_next;
    }
    
    // Respuesta YES → evaluar conditional_yes_next
    if (answer === "YES" && currentStep.conditional_yes_next) {
      const conditionsMet = evaluateConditions(
        currentStep.conditional_yes_next, 
        userHistory
      );
      
      if (conditionsMet) {
        return currentStep.conditional_yes_next.next;
      }
    }
    
    // Respuesta YES sin condiciones cumplidas → yes_next
    return currentStep.yes_next;
  }
}

function evaluateConditions(
  conditionalYesNext: ConditionalYesNext,
  userHistory: UserHistoryEntry[]
): boolean {
  const { conditions, match_any = false } = conditionalYesNext;
  
  const evaluator = match_any ? 'some' : 'every';
  
  return conditions[evaluator](condition => {
    const step = userHistory.find(h => h.stepId === condition.step_id);
    if (!step) return false;
    
    // Verificar Question (answer)
    if (condition.answer !== undefined) {
      return step.stepType === "Question" && step.answer === condition.answer;
    }
    
    // Verificar Select (selected_option)
    if (condition.selected_option !== undefined) {
      return step.stepType === "Select" && step.selectedOption === condition.selected_option;
    }
    
    return false;
  });
}
```

---

## Ejemplos Completos

### Ejemplo 1: Condición de Select (AND Logic)

**Flujo**: Si seleccionó "Regrade route" Y respondió YES → va a quantity

```json
{
  "id": "AR-Q05",
  "conditional_yes_next": {
    "conditions": [
      {"step_id": "AR-F03", "selected_option": "Regrade the accessible route"}
    ],
    "next": "AR-QUANTITY-01"
  }
}
```

```javascript
// User History:
[
  { stepId: "AR-F03", stepType: "Select", selectedOption: "Regrade the accessible route" },
  { stepId: "AR-Q05", stepType: "Question", answer: "YES" }
]

// Evaluación:
evaluateConditions(...) // → true
// Resultado: AR-QUANTITY-01
```

### Ejemplo 2: Múltiples Questions (OR Logic)

**Flujo**: Si respondió NO en CUALQUIER pregunta anterior → va a form corrección

```json
{
  "id": "SI-Q08",
  "conditional_yes_next": {
    "conditions": [
      {"step_id": "SI-Q02", "answer": "NO"},
      {"step_id": "SI-Q03", "answer": "NO"},
      {"step_id": "SI-Q04", "answer": "NO"}
    ],
    "next": "SI-F02",
    "match_any": true
  }
}
```

```javascript
// User History:
[
  { stepId: "SI-Q02", stepType: "Question", answer: "YES" },
  { stepId: "SI-Q03", stepType: "Question", answer: "NO" },  // ← Esta es NO
  { stepId: "SI-Q04", stepType: "Question", answer: "YES" },
  { stepId: "SI-Q08", stepType: "Question", answer: "YES" }
]

// Evaluación (match_any: true → OR):
evaluateConditions(...) // → true (porque SI-Q03 fue NO)
// Resultado: SI-F02
```

### Ejemplo 3: Condición Mixta (Questions + Selects, AND Logic)

```json
{
  "conditional_yes_next": {
    "conditions": [
      {"step_id": "AR-Q01", "answer": "NO"},
      {"step_id": "AR-F03", "selected_option": "Build a ramp"}
    ],
    "next": "AR-SPECIAL",
    "match_any": false
  }
}
```

**Lógica**: Ambas condiciones deben cumplirse (AND)

---

## Estructura User History

```typescript
interface UserHistoryEntry {
  stepId: string;
  stepType: "Question" | "Select" | "Form";
  answer?: "YES" | "NO";               // Para Questions
  selectedOption?: string;             // Para Selects (label de la opción)
  formData?: Record<string, any>;      // Para Forms
  barrierId?: string;
  timestamp: Date;
}
```

---

## Deprecated: check_previous_nos

> ⚠️ **DEPRECATED**: `check_previous_nos` está obsoleto. Use `conditional_yes_next` en su lugar.

**Antiguo patrón** (NO usar):
```json
{
  "check_previous_nos": ["SI-Q02", "SI-Q03"],
  "yes_next": "NEXT",
  "no_next": "FORM"
}
```

**Nuevo patrón** (usar en su lugar):
```json
{
  "conditional_yes_next": {
    "conditions": [
      {"step_id": "SI-Q02", "answer": "NO"},
      {"step_id": "SI-Q03", "answer": "NO"}
    ],
    "next": "FORM",
    "match_any": true
  },
  "yes_next": "NEXT"
}
```

### Manejo de Compatibilidad (Temporal)

Si el backend todavía soporta `check_previous_nos`, puede manejarlo así:

```typescript
function getNextStep_Legacy(currentStep: Step, answer: any, userHistory: UserHistoryEntry[]): string {
  if (currentStep.type === "Question" && answer === "YES") {
    // Soporte legacy para check_previous_nos
    if (currentStep.check_previous_nos) {
      const anyPreviousNo = currentStep.check_previous_nos.some(stepId => {
        const step = userHistory.find(h => h.stepId === stepId);
        return step && step.stepType === "Question" && step.answer === "NO";
      });
      
      return anyPreviousNo ? currentStep.no_next : currentStep.yes_next;
    }
    
    // Nuevo patrón conditional_yes_next
    if (currentStep.conditional_yes_next) {
      return evaluateConditions(currentStep.conditional_yes_next, userHistory)
        ? currentStep.conditional_yes_next.next
        : currentStep.yes_next;
    }
  }
  
  // ... resto de la lógica
}
```

---

## Testing

### Test 1: AND Logic (todas las condiciones)

```javascript
test('should evaluate AND logic correctly', () => {
  const conditional = {
    conditions: [
      { step_id: "Q1", answer: "NO" },
      { step_id: "Q2", answer: "NO" }
    ],
    next: "FORM",
    match_any: false
  };
  
  const history = [
    { stepId: "Q1", stepType: "Question", answer: "NO" },
    { stepId: "Q2", stepType: "Question", answer: "YES" }  // NO cumple
  ];
  
  expect(evaluateConditions(conditional, history)).toBe(false);
});
```

### Test 2: OR Logic (alguna condición)

```javascript
test('should evaluate OR logic correctly', () => {
  const conditional = {
    conditions: [
      { step_id: "Q1", answer: "NO" },
      { step_id: "Q2", answer: "NO" }
    ],
    next: "FORM",
    match_any: true
  };
  
  const history = [
    { stepId: "Q1", stepType: "Question", answer: "NO" },  // Cumple
    { stepId: "Q2", stepType: "Question", answer: "YES" }
  ];
  
  expect(evaluateConditions(conditional, history)).toBe(true);
});
```

### Test 3: Condición Mixta

```javascript
test('should evaluate mixed conditions', () => {
  const conditional = {
    conditions: [
      { step_id: "Q1", answer: "NO" },
      { step_id: "SEL1", selected_option: "Option A" }
    ],
    next: "FORM",
    match_any: false
  };
  
  const history = [
    { stepId: "Q1", stepType: "Question", answer: "NO" },
    { stepId: "SEL1", stepType: "Select", selectedOption: "Option A" }
  ];
  
  expect(evaluateConditions(conditional, history)).toBe(true);
});
```

---

## Diagrama de Flujo

```
┌─────────────────────┐
│  Usuario completa   │
│      Question       │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │  Respuesta? │
    └──┬─────────┬┘
       NO      YES
       │        │
       ▼        ▼
  ¿conditional_no_next?  ¿conditional_yes_next?
   ├─────────┬─────────┐  ├─────────┬─────────┐
  NO        YES         NO        YES       
   │         │           │         │
   │    Evaluar cond.    │    Evaluar cond.
   │         │           │         │
   │    ┌────┴────┐      │    ┌────┴────┐
   │    ▼         ▼      │    ▼         ▼
   │ Cumplidas  NO      │ Cumplidas  NO
   │    │      cumpl.   │    │      cumpl.
   │    │        │      │    │        │
   ▼    ▼        ▼      ▼    ▼        ▼
no_next  cond.  no_next  yes_next  cond.  yes_next
         next                       next
```

---

## Referencias

- [accessible_route.json](../docs/accessible_route.json) - Ejemplo con `conditional_yes_next` (Select condition)
- [designation_signage.json](../docs/designation_signage.json) - Ejemplo con `conditional_yes_next` (Question conditions)
- [curb_ramps.json](../docs/curb_ramps.json) - Ejemplo con `conditional_yes_next` y `conditional_no_next` (navegación compleja)
- [Backend README](../README.md) - Documentación del backend
