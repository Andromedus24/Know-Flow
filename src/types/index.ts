export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  learningPreferences?: LearningPreferences;
  currentGoal?: LearningGoal;
  totalConceptsLearned?: number;
  createdAt?: Date;
  lastActive?: Date;
}

export interface LearningPreferences {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'adaptive';
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  topicsOfInterest: string[];
  timeAvailability: number; // minutes per day
  preferredSubjects?: string[];
  studySchedule?: StudySchedule;
}

export interface StudySchedule {
  preferredDays: string[];
  preferredTime: string;
  sessionLength: number; // minutes
  breaks: boolean;
  reminderEnabled: boolean;
}

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number; // 0-100
  milestones: Milestone[];
  concepts: string[];
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: Date;
  order: number;
}

export interface LearningPlan {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  progress: number; // 0-100
  lessons: Lesson[];
  concepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // minutes
  createdAt: Date;
  updatedAt: Date;
  lastAccessed: Date;
  sourcePrompt: string;
  aiGenerated: boolean;
  qualityScore?: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  content: string;
  externalResources: string[];
  order: number;
  estimatedTime: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  completed: boolean;
  timeSpent: number; // minutes
  masteryLevel: number; // 0-100
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relatedConcepts: string[];
  learningMaterials: LearningMaterial[];
  masteryLevel: number; // 0-100
  lastReviewed: Date;
  nextReview: Date;
  timeSpent: number; // minutes
  completed: boolean;
}

export interface LearningMaterial {
  id: string;
  title: string;
  type: 'video' | 'article' | 'exercise' | 'quiz' | 'interactive';
  url?: string;
  content: string;
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface StudySession {
  id: string;
  userId: string;
  planId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  concepts: string[];
  progress: number; // 0-100
  notes?: string;
  completed: boolean;
}

export interface Progress {
  id: string;
  userId: string;
  conceptId: string;
  masteryLevel: number; // 0-100
  timeSpent: number; // minutes
  completed: boolean;
  lastUpdated: Date;
  streak: number; // consecutive days
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  metadata?: {
    planId?: string;
    conceptId?: string;
    lessonId?: string;
    aiGenerated?: boolean;
    confidence?: number;
  };
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  timeLimit: number; // minutes
  passingScore: number; // percentage
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  concepts: string[];
  attempts: number;
  bestScore: number;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'essay';
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
}

export interface Analytics {
  userId: string;
  timeframe: string;
  totalStudyTime: number; // minutes
  averageSessionLength: number; // minutes
  totalSessions: number;
  completedPlans: number;
  completionRate: number; // 0-1
  studyStreak: number;
  topics: string[];
  learningProgress: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  performanceMetrics: {
    accuracy: number; // 0-1
    speed: number; // questions per minute
    retention: number; // 0-1
  };
  recommendations: Recommendation[];
}

export interface Recommendation {
  id: string;
  type: 'content' | 'practice' | 'review' | 'goal';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  reason: string;
  actionUrl?: string;
  estimatedTime: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface KnowledgeGraph {
  id: string;
  userId: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  lastUpdated: Date;
  version: string;
}

export interface KnowledgeNode {
  id: string;
  name: string;
  description: string;
  masteryLevel: number; // 0-100
  lastReviewed: Date;
  nextReview: Date;
  sourceLessonId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites: string[];
  relatedConcepts: string[];
  tags: string[];
}

export interface KnowledgeEdge {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationshipType: 'related_to' | 'prerequisite_for' | 'part_of' | 'builds_on';
  strength: number; // 0-1
  bidirectional: boolean;
  metadata?: Record<string, any>;
}

export interface AIGenerationRequest {
  userId: string;
  prompt: string;
  context?: Record<string, any>;
  learningStyle?: string;
  difficulty?: string;
  timeAvailability?: number;
  priorKnowledge?: string[];
  goals?: string[];
}

export interface AIGenerationResponse {
  success: boolean;
  planId?: string;
  planTitle?: string;
  description?: string;
  lessons?: Lesson[];
  estimatedDuration?: number;
  difficulty?: string;
  qualityScore?: number;
  confidence?: number;
  message?: string;
  error?: string;
  timestamp: string;
  processingTime?: number;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: 'connected' | 'disconnected';
  ai_service: 'connected' | 'disconnected';
  timestamp: string;
  version: string;
  uptime: number;
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
}

export interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeUsers: number;
  popularEndpoints: Array<{
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }>;
  errorBreakdown: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

// Utility types
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'adaptive';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type PlanStatus = 'active' | 'completed' | 'paused' | 'archived';
export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'essay';
export type MaterialType = 'video' | 'article' | 'exercise' | 'quiz' | 'interactive';
export type RecommendationType = 'content' | 'practice' | 'review' | 'goal';
export type RelationshipType = 'related_to' | 'prerequisite_for' | 'part_of' | 'builds_on';
export type Priority = 'low' | 'medium' | 'high';
export type SystemHealth = 'healthy' | 'degraded' | 'unhealthy';
export type ConnectionStatus = 'connected' | 'disconnected';

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  timestamp: string;
  requestId: string;
}

// Event types for real-time updates
export interface LearningEvent {
  type: 'plan_created' | 'lesson_completed' | 'progress_updated' | 'goal_achieved';
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'reminder' | 'achievement' | 'recommendation' | 'alert';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
}
