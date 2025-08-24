import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Brain, Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { signInWithGoogle } from "../../utils/googleAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      // The user will be automatically signed in through Firebase Auth
      navigate("/");
    } catch (err) {
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-kn-primary to-kn-secondary flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-kn-lg mb-4">
            <Brain className="w-8 h-8 text-kn-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Welcome to Know-Flow
          </h1>
          <p className="text-kn-secondary text-lg">
            Your AI-powered learning companion
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-kn-xl p-8">
          <h2 className="text-2xl font-display font-bold text-kn-text mb-6 text-center">
            Sign In
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-kn-text mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-kn-text-secondary" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-kn-text mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-kn-text-secondary" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-kn-text-secondary hover:text-kn-text" />
                  ) : (
                    <Eye className="w-5 h-5 text-kn-text-secondary hover:text-kn-text" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-kn-primary bg-gray-100 border-gray-300 rounded focus:ring-kn-primary focus:ring-2"
                />
                <span className="ml-2 text-sm text-kn-text-secondary">
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-kn-primary hover:text-kn-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Google Sign In */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-kn-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-kn-text-secondary">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-kn-border rounded-lg text-kn-text hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-kn-text-secondary">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-kn-primary hover:text-kn-primary/80 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Demo Login */}
          <div className="mt-6 pt-6 border-t border-kn-border">
            <button
              onClick={() => {
                setEmail("demo@example.com");
                setPassword("demo123");
              }}
              className="w-full btn-secondary text-sm"
            >
              Use Demo Account
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-kn-secondary text-sm">
            By signing in, you agree to our{" "}
            <Link to="/terms" className="underline hover:no-underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline hover:no-underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
