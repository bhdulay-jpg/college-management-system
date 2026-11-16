"use client";

import { ArrowRight, BookOpen, CalendarDays, FileCheck2, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { ScrollAnimation } from "../scroll-animation";

interface HeroSectionProps {
  onEnrollClick?: () => void;
  onLoginClick?: () => void;
}

const platformAreas = [
  { icon: FileCheck2, title: "Admissions", detail: "Applications and review" },
  { icon: BookOpen, title: "Academic records", detail: "Courses and progress" },
  { icon: CalendarDays, title: "Scheduling", detail: "Classes and rooms" },
  { icon: Users, title: "Student services", detail: "Updates and support" },
];

export function HeroSection({ onEnrollClick, onLoginClick }: HeroSectionProps) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-muted text-foreground dark:bg-background">
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-48 left-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto grid min-h-[calc(100svh-4rem)] max-w-screen-2xl grid-cols-1 items-center gap-14 px-6 py-20 md:gap-16 md:px-10 md:py-24 lg:grid-cols-2 lg:gap-20 lg:px-12 lg:py-28">
        <div className="space-y-8 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-4 py-2 text-sm text-primary"
          >
            <GraduationCap className="h-4 w-4" />
            College Management System
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="space-y-6"
          >
            <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
              College operations,
              <span className="mt-2 block text-primary">working in harmony.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl lg:mx-0">
              Bring admissions, academic records, schedules, and student services together in one clear, coordinated workspace.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="flex flex-col justify-center gap-4 pt-2 sm:flex-row lg:justify-start"
          >
            <Button
              size="lg"
              onClick={onEnrollClick}
              className="group h-14 px-8 text-sm leading-none"
            >
              Apply for admission
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onLoginClick}
              className="h-14 min-w-[9rem] border-border bg-background/50 px-8 text-sm leading-none text-foreground hover:bg-background hover:text-foreground"
            >
              Portal sign in
            </Button>
          </motion.div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
            <ShieldCheck className="h-5 w-5" />
            Role-based tools for students, faculty, and administrators
          </div>
        </div>

        <ScrollAnimation direction="left" className="relative mx-auto w-full max-w-2xl">
          <div className="absolute -inset-5 rounded-[2rem] bg-blue-bayoux-400/10 blur-2xl" />
          <div className="relative rounded-2xl border border-white/15 bg-white p-6 text-foreground shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-5 border-b border-border/70 pb-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Platform overview</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">One connected workspace</h2>
                <p className="mt-2 text-base text-muted-foreground">Core academic and administrative workflows</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
              {platformAreas.map((area, index) => (
                <motion.div
                  key={area.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 + index * 0.08 }}
                  className="flex items-start gap-4 rounded-xl border border-border/70 bg-background/70 p-5"
                >
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <area.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium">{area.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{area.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-4 rounded-xl bg-muted px-5 py-4 text-base text-foreground">
              <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
              <span>Purposeful access and tools for each campus role</span>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
