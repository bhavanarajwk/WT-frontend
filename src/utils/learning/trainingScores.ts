export type TrainingAssessmentMeta = {
  id: string;
  name: string;
  weightPercent: number;
  marksPublishedAt: string | null;
};

export type TrainingScoresHrSnapshot = {
  trainingId: string;
  assessments: TrainingAssessmentMeta[];
  participants: ParticipantTrainingScore[];
};

export type MyTrainingMarks = {
  trainingId: string;
  trainingName: string;
  finalScorePercent: number | null;
  allAssessmentsPublished: boolean;
  assessments: Array<{
    assessmentId: string;
    name: string;
    weightPercent: number;
    score: number;
    marksPublishedAt: string | null;
  }>;
};

export type ParticipantTrainingScore = {
  userId: string;
  email: string;
  name: string;
  scoresJson: Record<string, number>;
  finalScorePercent: number | null;
  isCompleted: boolean;
};

function parseScoresJson(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(value);
    if (Number.isFinite(n)) out[String(key)] = n;
  }
  return out;
}

function normalizeAssessmentMetaRows(input: unknown): TrainingAssessmentMeta[] {
  const rows = Array.isArray(input) ? input : [];
  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      const id = String(record.assessment_id ?? record.assessmentId ?? record.id ?? "").trim();
      if (!id) return null;
      const weight = Number(record.weight_percent ?? record.weightPercent ?? 0);
      const published = String(
        record.marks_published_at ?? record.marksPublishedAt ?? ""
      ).trim();
      return {
        id,
        name: String(record.name ?? `Assessment ${id}`).trim(),
        weightPercent: Number.isFinite(weight) ? weight : 0,
        marksPublishedAt: published || null,
      };
    })
    .filter((r): r is TrainingAssessmentMeta => Boolean(r));
}

export function normalizeTrainingScoresHrSnapshot(input: unknown): TrainingScoresHrSnapshot | null {
  const root = (input as { data?: unknown })?.data ?? input;
  if (!root || typeof root !== "object") return null;
  const record = root as Record<string, unknown>;
  const trainingId = String(record.training_id ?? record.trainingId ?? "").trim();
  if (!trainingId) return null;
  return {
    trainingId,
    assessments: normalizeAssessmentMetaRows(record.assessments),
    participants: normalizeTrainingScoresList(record),
  };
}

export function normalizeMyTrainingMarks(input: unknown): MyTrainingMarks | null {
  const root = (input as { data?: unknown })?.data ?? input;
  if (!root || typeof root !== "object") return null;
  const record = root as Record<string, unknown>;
  const trainingId = String(record.training_id ?? record.trainingId ?? "").trim();
  if (!trainingId) return null;
  const finalRaw = record.final_score_percent ?? record.finalScorePercent;
  const finalNum = Number(finalRaw);
  const assessmentRows = Array.isArray(record.assessments) ? record.assessments : [];
  const assessments = assessmentRows
    .map((row) => {
      const a = row as Record<string, unknown>;
      const assessmentId = String(a.assessment_id ?? a.assessmentId ?? a.id ?? "").trim();
      if (!assessmentId) return null;
      const score = Number(a.score);
      if (!Number.isFinite(score)) return null;
      const weight = Number(a.weight_percent ?? a.weightPercent ?? 0);
      const published = String(a.marks_published_at ?? a.marksPublishedAt ?? "").trim();
      return {
        assessmentId,
        name: String(a.name ?? `Assessment ${assessmentId}`).trim(),
        weightPercent: Number.isFinite(weight) ? weight : 0,
        score,
        marksPublishedAt: published || null,
      };
    })
    .filter((r): r is MyTrainingMarks["assessments"][number] => Boolean(r));

  return {
    trainingId,
    trainingName: String(record.training_name ?? record.trainingName ?? "Training").trim(),
    finalScorePercent: Number.isFinite(finalNum) ? finalNum : null,
    allAssessmentsPublished: Boolean(
      record.all_assessments_published ?? record.allAssessmentsPublished
    ),
    assessments,
  };
}

export function normalizeTrainingScoresList(input: unknown): ParticipantTrainingScore[] {
  const root = (input as { items?: unknown })?.items ?? input;
  const rows = Array.isArray(root) ? root : [];
  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      const userId = String(record.user_id ?? record.userId ?? "").trim();
      if (!userId) return null;
      const finalRaw = record.final_score_percent ?? record.finalScorePercent;
      const finalNum = Number(finalRaw);
      return {
        userId,
        email: String(record.email ?? "").trim(),
        name: String(record.name ?? "").trim(),
        scoresJson: parseScoresJson(record.scores_json ?? record.scoresJson),
        finalScorePercent: Number.isFinite(finalNum) ? finalNum : null,
        isCompleted: Boolean(record.is_completed ?? record.isCompleted),
      };
    })
    .filter((r): r is ParticipantTrainingScore => Boolean(r));
}

export function findParticipantScoreForTrainee(
  items: ParticipantTrainingScore[],
  traineeUserId: string,
  traineeEmail?: string
): ParticipantTrainingScore | undefined {
  if (traineeUserId.startsWith("email:")) {
    const email = traineeUserId.slice("email:".length).toLowerCase();
    return items.find((i) => i.email.toLowerCase() === email);
  }
  const id = traineeUserId.trim();
  const byId = items.find((i) => i.userId === id);
  if (byId) return byId;
  const email = traineeEmail?.trim().toLowerCase();
  if (email) return items.find((i) => i.email.toLowerCase() === email);
  return undefined;
}

/** Weighted overall when every assessment has a score (mirrors backend upsert logic). */
export function computeWeightedOverallScore(
  scoresJson: Record<string, number>,
  assessments: Array<Record<string, unknown>>
): number | null {
  if (!assessments.length) return null;
  let totalWeight = 0;
  let weighted = 0;
  for (const a of assessments) {
    const id = String(a.id ?? "").trim();
    if (!id) continue;
    const weight = Number(a.weight_percent ?? a.weightPercent ?? 0);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const score = scoresJson[id];
    if (score == null || !Number.isFinite(score)) return null;
    totalWeight += weight;
    weighted += (score * weight) / 100;
  }
  if (totalWeight !== 100) return null;
  return Math.round(weighted * 100) / 100;
}

export function resolveOverallScorePercent(
  participant: ParticipantTrainingScore | undefined,
  assessments: Array<Record<string, unknown>>
): number | null {
  if (!participant) return null;
  if (participant.finalScorePercent != null) return participant.finalScorePercent;
  return computeWeightedOverallScore(participant.scoresJson, assessments);
}
