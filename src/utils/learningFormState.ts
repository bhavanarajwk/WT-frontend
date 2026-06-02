export type TrainingFormState = {
  name: string;
  category: string;
  type: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
};

export type SessionFormState = {
  session_date: string;
  start_time: string;
  end_time: string;
  mode: string;
  venue: string;
  meeting_link: string;
};

export type MaterialFormState = {
  title: string;
  visibility: "" | "EMPLOYEE" | "HR_ONLY";
};

export type AssessmentFormState = {
  name: string;
  description: string;
  weight_percent: string;
};

export function createEmptyTrainingForm(): TrainingFormState {
  return {
    name: "",
    category: "",
    type: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "",
  };
}

export function createEmptySessionForm(): SessionFormState {
  return {
    session_date: "",
    start_time: "",
    end_time: "",
    mode: "",
    venue: "",
    meeting_link: "",
  };
}

export function createEmptyMaterialForm(): MaterialFormState {
  return {
    title: "",
    visibility: "",
  };
}

export function createEmptyAssessmentForm(): AssessmentFormState {
  return {
    name: "",
    description: "",
    weight_percent: "",
  };
}
