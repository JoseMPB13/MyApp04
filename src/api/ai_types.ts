export interface LessonFeedback {
  correction: string | null;
  vault_usage_detected: string | null;
  score: number;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export interface FeedbackCapsule {
  grammar: string;
  vocabulary: string;
  naturalness: string;
}

export interface LessonResponse {
  text: string;
  translation: string;
  suggested_reply_en: string;
  suggested_reply_es: string;
  feedback: LessonFeedback;
  corrections?: Correction[];
  feedbackType?: "success" | "correction" | "neutral";
  suggested_reply?: string;
  feedbackCapsule?: FeedbackCapsule;
}

export interface WordPair {
  id: string;
  word: string;
  translation: string;
  matchId: number;
  inVault?: boolean;
}

export interface CrosswordItem {
  word: string;
  clue: string;
}
