"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { OtpField } from "@/components/auth/otp-field";
import { useUiSession } from "@/components/site/ui-session-provider";
import {
  loginWithEmail,
  loginWithGoogle,
  sendOtp,
  signupWithEmail,
  verifyOtp,
} from "@/features/auth/api/auth-api";
import { getErrorMessage } from "@/features/auth/lib/get-error-message";
import Link from "next/link";
import { useEffect, useState } from "react";

type AuthStep = "continue" | "email";
type SignupPhase = "details" | "otp";

export function AuthModal() {
  const { authModalOpen, authModalMode, closeAuth, setUserFromAuth } =
    useUiSession();
  const [step, setStep] = useState<AuthStep>("continue");
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [signupPhase, setSignupPhase] = useState<SignupPhase>("details");
  const [otp, setOtp] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (authModalOpen) {
      setStep("continue");
      setTab(authModalMode ?? "login");
      setSignupPhase("details");
      setOtp("");
      setSignupEmail("");
      setSignupName("");
      setSignupPassword("");
      setError(null);
      setOtpSent(false);
      setLoading(false);
    }
  }, [authModalOpen, authModalMode]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await loginWithEmail(email, password);
      setUserFromAuth(response.user);
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendSignupOtp = async (
    email: string,
    name: string,
    password: string,
  ) => {
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email, "verify");
      setSignupEmail(email);
      setSignupName(name);
      setSignupPassword(password);
      setSignupPhase("otp");
      setOtpSent(true);
      setOtp("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not send verification code"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? signupName).trim();
    const email = String(formData.get("email") ?? signupEmail).trim();
    const password = String(formData.get("password") ?? signupPassword);

    if (signupPhase === "details") {
      await handleSendSignupOtp(email, name, password);
      return;
    }

    if (otp.length !== 4) {
      setError("Enter the 4-digit verification code");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(signupEmail, otp);
      const response = await signupWithEmail({
        email: signupEmail,
        password: signupPassword,
        name: signupName,
      });
      setUserFromAuth(response.user);
    } catch (err) {
      setError(getErrorMessage(err, "Sign up failed"));
    } finally {
      setLoading(false);
    }
  };

  const signupSubmitLabel =
    signupPhase === "details" ? "Send verification code" : "Create account";

  const handleGoogleSuccess = async (credential: string) => {
    setError(null);
    setLoading(true);
    const isRegister = authModalMode === "signup";

    try {
      const response = await loginWithGoogle(credential, isRegister);
      setUserFromAuth(response.user);
    } catch (err) {
      if (isRegister) {
        try {
          const response = await loginWithGoogle(credential, false);
          setUserFromAuth(response.user);
          return;
        } catch {
          // Fall through to the sign-up error message.
        }
      }
      setError(getErrorMessage(err, "Google sign-in failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`modal-backdrop${authModalOpen ? " is-open" : ""}`}
      aria-hidden={!authModalOpen}
      role="dialog"
      aria-labelledby="authModalTitle"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeAuth();
      }}
    >
      <div className="auth-modal">
        <button
          type="button"
          className="auth-modal-close"
          aria-label="Close"
          onClick={closeAuth}
        >
          <i className="ri-close-line" />
        </button>

        <div className={`auth-panel${step === "continue" ? " is-active" : ""}`}>
          <h2 id="authModalTitle">Start video chatting</h2>
          <p className="auth-modal-sub">Sign in to connect with people live.</p>
          {error && step === "continue" && (
            <p className="mb-3 text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="auth-continue-list">
            <GoogleSignInButton
              disabled={loading}
              onSuccess={handleGoogleSuccess}
              onError={(message) => setError(message)}
            />
            <button
              type="button"
              className="continue-btn continue-btn--email"
              onClick={() => setStep("email")}
            >
              <i className="ri-mail-line" aria-hidden="true" />
              Continue with Email
            </button>
          </div>
          <p className="auth-terms-note">
            By continuing, you agree to our{" "}
            <Link href="/terms-and-conditions" target="_blank">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" target="_blank">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className={`auth-panel${step === "email" ? " is-active" : ""}`}>
          <button type="button" className="hero-back" onClick={() => setStep("continue")}>
            <i className="ri-arrow-left-line" aria-hidden="true" />
            Back
          </button>
          <h2>Continue with email</h2>
          <div className="hero-email-tabs" role="tablist">
            <button
              type="button"
              className={`hero-tab${tab === "login" ? " is-active" : ""}`}
              role="tab"
              aria-selected={tab === "login"}
              onClick={() => {
                setTab("login");
                setError(null);
              }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`hero-tab${tab === "signup" ? " is-active" : ""}`}
              role="tab"
              aria-selected={tab === "signup"}
              onClick={() => {
                setTab("signup");
                setSignupPhase("details");
                setError(null);
              }}
            >
              Sign up
            </button>
          </div>

          {error && (
            <p className="mt-3 text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <form
            id="heroLoginForm"
            className={`hero-form${tab === "login" ? "" : " is-hidden"}`}
            onSubmit={handleLogin}
          >
            <div className="hero-field hero-field-icon">
              <i className="ri-mail-line" aria-hidden="true" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="hero-field hero-field-icon">
              <i className="ri-lock-password-line" aria-hidden="true" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <div className="auth-forgot-row">
              <Link href="/reset-password" className="auth-forgot" onClick={closeAuth}>
                Reset password
              </Link>
            </div>
            <button type="submit" className="btn-primary hero-submit" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <form
            id="heroSignupForm"
            className={`hero-form${tab === "signup" ? "" : " is-hidden"}`}
            onSubmit={handleSignup}
          >
            {signupPhase === "details" && (
              <>
                <div className="hero-field hero-field-icon">
                  <i className="ri-user-line" aria-hidden="true" />
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    required
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
                <div className="hero-field hero-field-icon">
                  <i className="ri-mail-line" aria-hidden="true" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
                <div className="hero-field hero-field-icon">
                  <i className="ri-lock-password-line" aria-hidden="true" />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {signupPhase === "otp" && (
              <div className="mt-4 mb-2">
                <p className="mb-3 text-center text-sm text-textMuted">
                  {otpSent
                    ? `Enter the code sent to ${signupEmail}`
                    : "Enter your verification code"}
                </p>
                <OtpField value={otp} onChange={setOtp} disabled={loading} />
                <button
                  type="button"
                  className="auth-forgot mt-3 w-full text-center"
                  disabled={loading}
                  onClick={() =>
                    handleSendSignupOtp(signupEmail, signupName, signupPassword)
                  }
                >
                  Resend code
                </button>
              </div>
            )}

            <label className="auth-terms">
              <input type="checkbox" name="terms" required disabled={loading} />
              <span>
                I agree to the{" "}
                <Link href="/terms-and-conditions" target="_blank">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy-policy" target="_blank">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <button type="submit" className="btn-primary hero-submit" disabled={loading}>
              {loading ? "Please wait…" : signupSubmitLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
