"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/lang-context";
import { t, type Lang } from "@/lib/i18n";
import { GraduationCap, Phone, Mail } from "lucide-react";

type LoginMethod = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const [method, setMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const langs: Lang[] = ["EN", "BM", "CN"];

  async function handleSendOtp() {
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "send" }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        if (data.code) setOtp(data.code); // dev only
      } else {
        setError(data.error ?? "Failed to send OTP");
      }
    });
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
      }
    });
  }

  async function handlePhoneVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "verify", code: otp }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/");
      } else {
        setError(data.error ?? "Invalid OTP");
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-400 mb-4">
            <GraduationCap className="h-8 w-8 text-blue-900" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t(lang, "appName")}</h1>
          <p className="text-blue-200 mt-1 text-sm">{t(lang, "tagline")}</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t(lang, "login")}</CardTitle>
              {/* Language selector */}
              <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
                {langs.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 font-medium transition-colors ${
                      lang === l
                        ? "bg-blue-700 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <CardDescription>
              {method === "email"
                ? t(lang, "loginWithEmail")
                : t(lang, "loginWithPhone")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Method toggle */}
            <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
              <button
                onClick={() => setMethod("email")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  method === "email"
                    ? "bg-white shadow text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Mail className="h-4 w-4" />
                {t(lang, "email")}
              </button>
              <button
                onClick={() => setMethod("phone")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  method === "phone"
                    ? "bg-white shadow text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Phone className="h-4 w-4" />
                {t(lang, "phone")}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            {/* Email form */}
            {method === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t(lang, "email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tuitioncentral.my"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t(lang, "password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? t(lang, "loading") : t(lang, "login")}
                </Button>
              </form>
            )}

            {/* Phone OTP form */}
            {method === "phone" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t(lang, "phone")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+601X-XXXXXXX"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOtp}
                      disabled={isPending || !phone}
                      className="shrink-0"
                    >
                      {t(lang, "sendOtp")}
                    </Button>
                  </div>
                </div>

                {otpSent && (
                  <form onSubmit={handlePhoneVerify} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="otp">OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        required
                      />
                      <p className="text-xs text-green-600">{t(lang, "otpSent")}</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? t(lang, "loading") : t(lang, "verifyOtp")}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">or</span>
              </div>
            </div>

            {/* Google */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => signIn("google", { callbackUrl: "/" })}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t(lang, "loginWithGoogle")}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-blue-200 text-xs mt-6">
          © 2024 Tuition Central. All rights reserved.
        </p>
      </div>
    </div>
  );
}
