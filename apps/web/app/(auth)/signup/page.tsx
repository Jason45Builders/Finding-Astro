"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../../../lib/auth";

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Full Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuth((state) => state.signup);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await signup(values.email, values.password, values.fullName);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to register account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-black text-primary mb-3">
            Finding Astro
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">Create your Account</h2>
          <p className="text-slate-500 mt-1 text-sm">Join the network to help stray animals in Chennai</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              {...register("fullName")}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.fullName ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-slate-300 focus:ring-primary focus:border-primary"
              } focus:outline-none focus:ring-2`}
              placeholder="e.g. Anand Kumar"
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              {...register("email")}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.email ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-slate-300 focus:ring-primary focus:border-primary"
              } focus:outline-none focus:ring-2`}
              placeholder="e.g. anand@example.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              {...register("password")}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.password ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-slate-300 focus:ring-primary focus:border-primary"
              } focus:outline-none focus:ring-2`}
              placeholder="Min. 8 characters"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
            <input
              type="password"
              {...register("confirmPassword")}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.confirmPassword ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-slate-300 focus:ring-primary focus:border-primary"
              } focus:outline-none focus:ring-2`}
              placeholder="Re-enter password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
