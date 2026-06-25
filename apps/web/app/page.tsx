"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, ShieldAlert, Award, HeartHandshake, PhoneCall } from "lucide-react";
import { api, Partner } from "../lib/api";

export default function LandingPage() {
  const [clinics, setClinics] = useState<Partner[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        // Fetch clinics around Chennai center
        const data = await api.listClinics(13.0827, 80.2707, 15);
        setClinics(data.slice(0, 4));
      } catch (err) {
        console.error("Failed to load featured clinics", err);
      } finally {
        setLoadingClinics(false);
      }
    };
    void fetchClinics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-primary tracking-tight">Finding Astro</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-emerald-800 transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-light via-white to-slate-50 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-primary mb-6">
              <ShieldAlert className="w-3.5 h-3.5" /> Civic Animal Welfare for Chennai
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Spot an Injured Animal? <br />
              <span className="text-primary">Send Immediate Help.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
              Finding Astro connects Chennai citizens who spot lost or wounded street animals with volunteer responders, vets, and local animal care organisations.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/cases/new?type=emergency"
                className="sos-pulse-button inline-flex items-center justify-center gap-2 bg-accent text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg"
              >
                <AlertCircle className="w-5 h-5" /> Report an Emergency
              </Link>
              <Link
                href="/animals"
                className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all shadow-sm"
              >
                <Eye className="w-5 h-5" /> Browse Animals
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            {/* Visual representation of Finding Astro */}
            <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-[3rem] bg-gradient-to-tr from-emerald-100 to-primary-light flex items-center justify-center shadow-inner">
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-[2.5rem] bg-white shadow-xl flex flex-col justify-center items-center p-6 text-center gap-4 border border-emerald-50">
                <HeartHandshake className="w-16 h-16 text-primary" />
                <h3 className="text-2xl font-extrabold text-slate-800">4,200+</h3>
                <p className="text-slate-500 font-medium">Chennai Animals Rescued & Sterilized</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-12 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <span className="block text-4xl font-extrabold text-primary">150+</span>
              <span className="text-sm font-semibold text-slate-500 mt-1 block">Active Responders</span>
            </div>
            <div>
              <span className="block text-4xl font-extrabold text-primary">3,800+</span>
              <span className="text-sm font-semibold text-slate-500 mt-1 block">Cases Resolved</span>
            </div>
            <div>
              <span className="block text-4xl font-extrabold text-primary">45+</span>
              <span className="text-sm font-semibold text-slate-500 mt-1 block">Partner Clinics</span>
            </div>
            <div>
              <span className="block text-4xl font-extrabold text-primary">94%</span>
              <span className="text-sm font-semibold text-slate-500 mt-1 block">Response Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">How it Works</h2>
            <p className="text-slate-600 mt-4">Three quick steps to save an animal's life in Chennai.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative">
              <div className="w-12 h-12 bg-orange-100 text-accent rounded-2xl flex items-center justify-center font-bold text-lg mb-6">1</div>
              <h3 className="text-xl font-bold text-slate-900">Report SOS</h3>
              <p className="text-slate-600 mt-2 leading-relaxed">
                Spot a lost or injured stray. Pin the location and upload a photo — no account required for emergencies.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative">
              <div className="w-12 h-12 bg-emerald-100 text-primary rounded-2xl flex items-center justify-center font-bold text-lg mb-6">2</div>
              <h3 className="text-xl font-bold text-slate-900">Dispatch Responder</h3>
              <p className="text-slate-600 mt-2 leading-relaxed">
                Nearby registered NGO volunteers get notified, claim the report, and navigate to the location.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative">
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center font-bold text-lg mb-6">3</div>
              <h3 className="text-xl font-bold text-slate-900">Hospitalisation & Recovery</h3>
              <p className="text-slate-600 mt-2 leading-relaxed">
                The animal is safely transported to a partner vet clinic. Treatment is funded transparently by the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Clinics */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12">
            <div>
              <h2 className="text-3xl font-black text-slate-900">Featured Partner Clinics</h2>
              <p className="text-slate-600 mt-2">Verified veterinary partners supporting strays in Chennai.</p>
            </div>
            <Link
              href="/partners"
              className="text-primary font-bold hover:underline mt-4 sm:mt-0 flex items-center gap-1"
            >
              View all partners &rarr;
            </Link>
          </div>

          {loadingClinics ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : clinics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {clinics.map((clinic) => (
                <div key={clinic.id} className="border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-primary mb-4">
                      Clinic
                    </span>
                    <h3 className="font-bold text-lg text-slate-800 leading-tight mb-2">{clinic.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{clinic.address || "Chennai, Tamil Nadu"}</p>
                  </div>
                  <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold">{clinic.phone || "No phone listed"}</span>
                    {clinic.is24hr && <span className="text-accent font-bold">24 Hours</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-12 text-center text-slate-500">
              No partner clinics loaded. Run backend to fetch dynamic entries.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:flex md:justify-between md:text-left items-center">
          <div className="mb-6 md:mb-0">
            <span className="text-xl font-bold text-white">Finding Astro</span>
            <p className="text-xs text-slate-500 mt-2">&copy; {new Date().getFullYear()} Finding Astro. Chennai, India.</p>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/cases/new" className="hover:text-white transition-colors">Report Emergency</Link>
            <Link href="/animals" className="hover:text-white transition-colors">Browse Directory</Link>
            <Link href="/partners" className="hover:text-white transition-colors">Partner Network</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
