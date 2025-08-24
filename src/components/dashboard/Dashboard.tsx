import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { 
  generateLearningPlan, 
  getUserAnalytics, 
  APIErrorHandler,
  APIResponseHandler 
} from "../../config/api";
import {
  MessageCircle,
  Send,
  TrendingUp,
  BookOpen,
  Target,
  CheckCircle2,
  Brain,
  Clock,
  Award,
  Lightbulb,
  Loader2,
  AlertCircle,
  Sparkles,
  BarChart3,
  Calendar,
  Zap,
} from "lucide-react";
import { ChatMessage, LearningPlan } from "../../types";

interface DashboardStats {
  totalStudyTime: number;
  averageSessionLength: number;
  totalSessions: number;
  completedPlans: number;
  completionRate: number;
  studyStreak: number;
  learningProgress: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
}

export default function Dashboard() {
  const { userData } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<LearningPlan | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Load user analytics on component mount
  useEffect(() => {
    if (userData?.uid) {
      loadUserAnalytics();
    }
  }, [userData?.uid]);

  const loadUserAnalytics = async () => {
    try {
      const response = await getUserAnalytics(userData!.uid, '30d');
      if (APIResponseHandler.isSuccess(response)) {
        setStats(response.data.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !userData?.uid) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      timestamp: new Date(),
      type: "user",
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Generate learning plan using AI
      const response = await generateLearningPlan(
        userData.uid,
        chatInput,
        {
          learning_style: userData.learningPreferences?.learningStyle || 'adaptive',
          difficulty: userData.learningPreferences?.difficultyLevel || 'beginner',
          time_availability: userData.learningPreferences?.timeAvailability || 30,
        }
      );

      if (APIResponseHandler.isSuccess(response)) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `🎯 I've created a personalized learning plan for you! Here's what I've prepared:

📚 **Plan Title**: ${response.data.plan_title || 'Custom Learning Path'}
⏱️ **Estimated Duration**: ${response.data.estimatedDuration || 15} minutes
📈 **Difficulty**: ${response.data.difficulty || 'Adaptive'}

${response.data.message || 'Your AI-powered learning journey is ready to begin!'}

Would you like me to show you the detailed lesson plan or help you get started?`,
          timestamp: new Date(),
          type: "assistant",
        };

        setChatMessages((prev) => [...prev, aiMessage]);
        
        // Store the generated plan
        if (response.data.planId) {
          setCurrentPlan({
            id: response.data.planId,
            title: response.data.plan_title || 'Custom Learning Path',
            description: response.data.description || '',
            status: 'active',
            progress: 0,
            lessons: response.data.lessons || [],
            createdAt: new Date(),
            estimatedDuration: response.data.estimatedDuration || 15,
          });
        }
      } else {
        throw new Error(response.error?.error || 'Failed to generate learning plan');
      }
    } catch (err) {
      const errorMessage = APIErrorHandler.handle(err);
      setError(errorMessage);
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `I apologize, but I encountered an issue while generating your learning plan: ${errorMessage}. Please try again or rephrase your request.`,
        timestamp: new Date(),
        type: "assistant",
      };
      
      setChatMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setChatInput(prompt);
    setShowSuggestions(false);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "from-green-500 to-emerald-500";
    if (progress >= 60) return "from-blue-500 to-cyan-500";
    if (progress >= 40) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const milestones = userData?.currentGoal?.milestones || [];
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const totalConcepts = stats?.learningProgress ? 
    Object.values(stats.learningProgress).reduce((a, b) => a + b, 0) : 25;
  const masteredConcepts = stats?.learningProgress ? 
    stats.learningProgress.intermediate + stats.learningProgress.advanced : 13;

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="card bg-gradient-to-r from-kn-primary/10 to-kn-secondary/10 border-kn-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-kn-text mb-2">
              Welcome back, {userData?.displayName || 'Learner'}! 👋
            </h1>
            <p className="text-kn-text-secondary">
              Ready to continue your learning journey? Let's make today productive!
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
            <Sparkles className="w-5 h-5 text-kn-accent" />
            <span className="text-sm font-medium text-kn-text">AI Powered</span>
          </div>
        </div>
      </div>

      {/* Current Goal Card */}
      {userData?.currentGoal && (
        <div className="card bg-gradient-to-r from-kn-primary/10 to-kn-secondary/10 border-kn-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-kn-primary" />
            <div>
              <h3 className="text-lg font-display font-bold text-kn-text">
                Current Goal:
              </h3>
              <p className="text-kn-text-secondary text-sm">
                Track your learning progress
              </p>
            </div>
          </div>

          <h4 className="text-xl font-bold text-kn-text mb-4">
            {userData.currentGoal.title}
          </h4>

          {/* Milestone Progress */}
          <div className="flex gap-4 mb-6">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={`flex-1 p-4 rounded-lg text-center transition-all ${
                  milestone.completed
                    ? "bg-kn-success/10 border border-kn-success/20"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    milestone.completed
                      ? "text-kn-success"
                      : "text-kn-text-secondary"
                  }`}
                >
                  {milestone.title}
                </div>
                {milestone.completed && (
                  <CheckCircle2 className="w-5 h-5 text-kn-success mx-auto" />
                )}
              </div>
            ))}
          </div>

          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-kn-text-secondary">Overall Progress</span>
              <span className="font-medium text-kn-text">
                {userData.currentGoal.progress || 0}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`bg-gradient-to-r ${getProgressColor(userData.currentGoal.progress || 0)} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${userData.currentGoal.progress || 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-kn-text">
              Study Time
            </h3>
            <Clock className="w-5 h-5 text-kn-primary" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-kn-text mb-2">
              {stats ? `${Math.round(stats.totalStudyTime / 60)}h` : '0h'}
            </div>
            <div className="text-sm text-kn-text-secondary">This month</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-kn-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((stats?.totalStudyTime || 0) / 3000 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Concepts Mastered */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-kn-text">
              Concepts Mastered
            </h3>
            <Brain className="w-5 h-5 text-kn-primary" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-kn-text mb-2">
              {masteredConcepts}/{totalConcepts}
            </div>
            <div className="text-sm text-kn-text-secondary">
              Concepts learned
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-kn-success h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(masteredConcepts / totalConcepts) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Study Streak */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-kn-text">
              Study Streak
            </h3>
            <Award className="w-5 h-5 text-kn-primary" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-kn-text mb-2">
              {stats?.studyStreak || 0}
            </div>
            <div className="text-sm text-kn-text-secondary">Days in a row</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-kn-accent h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((stats?.studyStreak || 0) / 30 * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-kn-text">
              Completion Rate
            </h3>
            <BarChart3 className="w-5 h-5 text-kn-primary" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-kn-text mb-2">
              {stats ? Math.round(stats.completionRate * 100) : 0}%
            </div>
            <div className="text-sm text-kn-text-secondary">Plans completed</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-kn-secondary h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${stats ? stats.completionRate * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Current Learning Plan */}
      {currentPlan && (
        <div className="card bg-gradient-to-br from-kn-accent/10 to-kn-accent/20 border-kn-accent/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-kn-accent" />
              <div>
                <h3 className="text-lg font-display font-bold text-kn-text">
                  Current Learning Plan
                </h3>
                <p className="text-sm text-kn-text-secondary">
                  AI-generated personalized path
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentPlan.status)}`}>
              {currentPlan.status}
            </span>
          </div>

          <h4 className="text-xl font-bold text-kn-text mb-2">
            {currentPlan.title}
          </h4>
          <p className="text-kn-text-secondary mb-4">
            {currentPlan.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-kn-text-secondary" />
                <span className="text-sm text-kn-text-secondary">
                  {currentPlan.estimatedDuration} min
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-kn-text-secondary" />
                <span className="text-sm text-kn-text-secondary">
                  {currentPlan.lessons.length} lessons
                </span>
              </div>
            </div>
            <button className="btn-primary">
              Continue Learning
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Chat Interface */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-kn-primary to-kn-accent rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-kn-text">Nodi</h3>
            <p className="text-sm text-kn-text-secondary">
              Your AI learning assistant
            </p>
          </div>
        </div>

        {/* Quick Prompts */}
        {showSuggestions && chatMessages.length === 0 && (
          <div className="mb-6">
            <p className="text-sm text-kn-text-secondary mb-3">Try asking me about:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "I want to learn Python programming",
                "Help me understand machine learning basics",
                "Create a study plan for web development",
                "I need help with data science concepts"
              ].map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="px-3 py-2 bg-kn-surface hover:bg-kn-primary/10 text-kn-text-secondary hover:text-kn-primary text-sm rounded-lg transition-colors border border-gray-200 hover:border-kn-primary/30"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {chatMessages.length === 0 && !showSuggestions ? (
            <div className="text-center py-8 text-kn-text-secondary">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Ask me anything about your learning journey!</p>
            </div>
          ) : (
            chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.type === "user"
                      ? "bg-kn-primary text-white rounded-br-sm"
                      : "bg-kn-surface text-kn-text rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <div
                    className={`text-xs mt-1 ${
                      message.type === "user"
                        ? "text-kn-secondary"
                        : "text-kn-text-secondary"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-kn-surface p-4 rounded-lg rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-kn-primary" />
                  <span className="text-sm text-kn-text-secondary">
                    AI is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">
                    {error}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about learning..."
            className="input-field flex-1"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isLoading}
            className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
