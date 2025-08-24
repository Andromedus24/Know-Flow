import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { 
  getUserPlans, 
  createLearningSession, 
  updateProgress,
  APIErrorHandler,
  APIResponseHandler 
} from "../../config/api";
import {
  BookOpen,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Brain,
  Calendar,
  Star,
  Plus,
  Search,
  Filter,
  SortAsc,
  Eye,
  Edit,
  Trash2,
  Share2,
  Download,
  Bookmark,
  Lightbulb,
  Zap,
  Award,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { LearningPlan, Lesson, Concept, StudySession } from "../../types";

interface StudyPlanProps {}

export default function StudyPlan({}: StudyPlanProps) {
  const { userData } = useAuth();
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<LearningPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<LearningPlan | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);

  // Load user plans on component mount
  useEffect(() => {
    if (userData?.uid) {
      loadUserPlans();
    }
  }, [userData?.uid]);

  // Filter and sort plans when filters change
  useEffect(() => {
    filterAndSortPlans();
  }, [plans, searchTerm, statusFilter, difficultyFilter, sortBy, sortOrder]);

  const loadUserPlans = async () => {
    if (!userData?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getUserPlans(userData.uid, {
        limit: 50,
        offset: 0,
      });

      if (APIResponseHandler.isSuccess(response)) {
        setPlans(response.data.plans || []);
      } else {
        throw new Error(response.error?.error || 'Failed to load plans');
      }
    } catch (err) {
      const errorMessage = APIErrorHandler.handle(err);
      setError(errorMessage);
      console.error('Failed to load plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortPlans = () => {
    let filtered = [...plans];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(plan =>
        plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.concepts.some(concept => concept.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(plan => plan.status === statusFilter);
    }

    // Apply difficulty filter
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(plan => plan.difficulty === difficultyFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "progress":
          aValue = a.progress;
          bValue = b.progress;
          break;
        case "difficulty":
          aValue = getDifficultyWeight(a.difficulty);
          bValue = getDifficultyWeight(b.difficulty);
          break;
        case "estimatedDuration":
          aValue = a.estimatedDuration;
          bValue = b.estimatedDuration;
          break;
        case "createdAt":
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPlans(filtered);
  };

  const getDifficultyWeight = (difficulty: string): number => {
    switch (difficulty) {
      case "beginner": return 1;
      case "intermediate": return 2;
      case "advanced": return 3;
      default: return 1;
    }
  };

  const startLearningSession = async (plan: LearningPlan, lesson?: Lesson) => {
    if (!userData?.uid) return;

    const sessionData = {
      planId: plan.id,
      startTime: new Date(),
      concepts: lesson ? [lesson.id] : plan.concepts,
    };

    try {
      const response = await createLearningSession(userData.uid, sessionData);
      if (APIResponseHandler.isSuccess(response)) {
        setActiveSession(response.data);
        setSelectedPlan(plan);
        if (lesson) {
          setCurrentLesson(lesson);
        }
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const completeLesson = async (lesson: Lesson) => {
    if (!userData?.uid || !selectedPlan) return;

    try {
      await updateProgress(userData.uid, {
        conceptId: lesson.id,
        masteryLevel: 100,
        completed: true,
        timeSpent: lesson.timeSpent || 0,
      });

      // Update local state
      setPlans(prevPlans => 
        prevPlans.map(plan => 
          plan.id === selectedPlan.id 
            ? {
                ...plan,
                lessons: plan.lessons.map(l => 
                  l.id === lesson.id 
                    ? { ...l, completed: true, masteryLevel: 100 }
                    : l
                ),
                progress: calculatePlanProgress(plan.lessons)
              }
            : plan
        )
      );

      setCurrentLesson(null);
    } catch (err) {
      console.error('Failed to complete lesson:', err);
    }
  };

  const calculatePlanProgress = (lessons: Lesson[]): number => {
    if (lessons.length === 0) return 0;
    const completedLessons = lessons.filter(l => l.completed).length;
    return Math.round((completedLessons / lessons.length) * 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-yellow-100 text-yellow-800";
      case "advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return "from-green-500 to-emerald-500";
    if (progress >= 60) return "from-blue-500 to-cyan-500";
    if (progress >= 40) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kn-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-kn-text">
            Study Plans
          </h1>
          <p className="text-kn-text-secondary mt-2">
            Manage and track your personalized learning journeys
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-kn-text-secondary w-4 h-4" />
              <input
                type="text"
                placeholder="Search plans, concepts, or lessons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 w-full"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="createdAt">Created Date</option>
              <option value="title">Title</option>
              <option value="progress">Progress</option>
              <option value="difficulty">Difficulty</option>
              <option value="estimatedDuration">Duration</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="btn-secondary px-3"
            >
              <SortAsc className={`w-4 h-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={`card cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
              selectedPlan?.id === plan.id ? "ring-2 ring-kn-primary" : ""
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            {/* Plan Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-display font-bold text-kn-text text-lg mb-2">
                  {plan.title}
                </h3>
                <p className="text-kn-text-secondary text-sm line-clamp-2">
                  {plan.description}
                </p>
              </div>
              <div className="flex gap-1">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Bookmark className="w-4 h-4 text-kn-text-secondary" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Share2 className="w-4 h-4 text-kn-text-secondary" />
                </button>
              </div>
            </div>

            {/* Plan Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-kn-text-secondary">Progress</span>
                <span className="font-medium text-kn-text">{plan.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-gradient-to-r ${getProgressColor(plan.progress)} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${plan.progress}%` }}
                />
              </div>
            </div>

            {/* Plan Details */}
            <div className="flex items-center justify-between text-sm text-kn-text-secondary mb-4">
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{plan.lessons.length} lessons</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{plan.estimatedDuration} min</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                {plan.status}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(plan.difficulty)}`}>
                {plan.difficulty}
              </span>
              {plan.aiGenerated && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  AI Generated
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startLearningSession(plan);
                }}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {plan.progress === 0 ? "Start" : "Continue"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // View plan details
                }}
                className="btn-secondary px-3"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPlans.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-kn-text-secondary mx-auto mb-4" />
          <h3 className="text-xl font-medium text-kn-text mb-2">
            No study plans found
          </h3>
          <p className="text-kn-text-secondary mb-6">
            {searchTerm || statusFilter !== "all" || difficultyFilter !== "all"
              ? "Try adjusting your filters or search terms"
              : "Create your first learning plan to get started"}
          </p>
          {!searchTerm && statusFilter === "all" && difficultyFilter === "all" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Your First Plan
            </button>
          )}
        </div>
      )}

      {/* Selected Plan Details */}
      {selectedPlan && (
        <div className="card bg-gradient-to-r from-kn-primary/5 to-kn-secondary/5 border-kn-primary/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-kn-text mb-2">
                {selectedPlan.title}
              </h2>
              <p className="text-kn-text-secondary">
                {selectedPlan.description}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary">
                <Edit className="w-4 h-4" />
              </button>
              <button className="btn-secondary">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Plan Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-kn-primary mb-1">
                {selectedPlan.lessons.length}
              </div>
              <div className="text-sm text-kn-text-secondary">Total Lessons</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-kn-success mb-1">
                {selectedPlan.lessons.filter(l => l.completed).length}
              </div>
              <div className="text-sm text-kn-text-secondary">Completed</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-kn-accent mb-1">
                {selectedPlan.estimatedDuration}
              </div>
              <div className="text-sm text-kn-text-secondary">Minutes</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-kn-secondary mb-1">
                {selectedPlan.progress}%
              </div>
              <div className="text-sm text-kn-text-secondary">Progress</div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-kn-text mb-4">Lessons</h3>
            {selectedPlan.lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className={`p-4 rounded-lg border transition-all ${
                  lesson.completed
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-200 hover:border-kn-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-kn-primary/10 flex items-center justify-center text-sm font-medium text-kn-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-kn-text mb-1">
                        {lesson.title}
                      </h4>
                      <p className="text-sm text-kn-text-secondary line-clamp-2">
                        {lesson.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-kn-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lesson.estimatedTime} min
                        </span>
                        <span className={`px-2 py-1 rounded-full ${getDifficultyColor(lesson.difficulty)}`}>
                          {lesson.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lesson.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <button
                        onClick={() => startLearningSession(selectedPlan, lesson)}
                        className="btn-primary px-3 py-1 text-sm"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-kn-text mb-4">
              Create New Study Plan
            </h3>
            <p className="text-kn-text-secondary mb-4">
              Describe what you want to learn and AI will create a personalized plan for you.
            </p>
            <textarea
              placeholder="e.g., I want to learn Python programming for data science..."
              className="input-field w-full h-24 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button className="btn-primary flex-1">
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
