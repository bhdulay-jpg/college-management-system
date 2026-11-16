"use client";

import { PageHeader } from "../page-header";
import { PageFooter } from "../page-footer";
import { Card, CardContent } from "../ui/card";
import { Target, Heart, Lightbulb, Users, Award, Shield, TrendingUp, Globe2 } from "lucide-react";

export function AboutPage() {
  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "Empowering Philippine institutions with technology that enhances student success and operational excellence.",
    },
    {
      icon: Heart,
      title: "Student-Centered",
      description: "Every feature designed with Filipino students' success, engagement, and well-being as the priority.",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Continuously evolving to meet the changing needs of modern Philippine higher education.",
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "Fostering seamless communication across students, faculty, staff, and administration.",
    },
  ];

  const metrics = [
    { icon: Globe2, value: "100+", label: "Partner Institutions" },
    { icon: Users, value: "150,000+", label: "Active Students" },
    { icon: Award, value: "5+", label: "Years of Excellence" },
    { icon: TrendingUp, value: "99.9%", label: "Platform Uptime" },
  ];

  const achievements = [
    {
      title: "EdTech PH Award 2024",
      description: "Best College Management System",
    },
    {
      title: "CHED Recognized",
      description: "Compliant & Trusted Platform",
    },
    {
      title: "Innovation Excellence",
      description: "Technology in Education",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader variant="public" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-bayoux-200/20 dark:bg-blue-bayoux-800/20 blur-3xl" />
          </div>

          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-blue-bayoux-50 dark:bg-blue-bayoux-900/50 px-4 py-2 text-sm">
                <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300">About Us</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl">
                Transforming Philippine Higher Education
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                We're on a mission to modernize college management across the Philippines with 
                intuitive, powerful tools that bring together every stakeholder in the academic community.
              </p>
            </div>
          </div>
        </section>

        {/* Metrics Section */}
        <section className="py-16 bg-blue-bayoux-50/50 dark:bg-blue-bayoux-950/20">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {metrics.map((metric, index) => (
                <div key={index} className="text-center space-y-3">
                  <div className="inline-flex p-3 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-xl">
                    <metric.icon className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl text-blue-bayoux-600 dark:text-blue-bayoux-400 mb-1">
                      {metric.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{metric.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl lg:text-5xl">Our Story</h2>
                <div className="w-20 h-1 bg-blue-bayoux-600 dark:bg-blue-bayoux-400 mx-auto rounded-full" />
              </div>

              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  CollegeConnect was founded in 2019 by a team of Filipino educators and technologists 
                  who recognized the need for a comprehensive, user-friendly college management platform 
                  tailored specifically to the Philippine education system.
                </p>
                <p>
                  We've grown from serving a handful of colleges in Metro Manila to supporting over 100 
                  institutions and 150,000+ students across the Philippines, from Luzon to Mindanao.
                </p>
                <p>
                  Our platform combines best practices in Philippine higher education with cutting-edge 
                  technology, ensuring full CHED compliance while creating seamless experiences for 
                  students, faculty, parents, and administrators.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 md:py-28 bg-blue-bayoux-50/50 dark:bg-blue-bayoux-950/20">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl">Our Core Values</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <Card key={index} className="border-2 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 transition-all hover:shadow-xl">
                  <CardContent className="p-6 space-y-4">
                    <div className="inline-flex p-3 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-xl">
                      <value.icon className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg">{value.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Recognition Section */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="text-center mb-16 space-y-4">
              <div className="inline-flex p-3 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-xl mx-auto">
                <Award className="h-8 w-8 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl">Recognition & Trust</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Awarded and recognized for excellence in educational technology
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {achievements.map((achievement, index) => (
                <Card key={index} className="text-center border-2">
                  <CardContent className="p-8 space-y-3">
                    <Shield className="h-8 w-8 text-blue-bayoux-600 dark:text-blue-bayoux-400 mx-auto" />
                    <div>
                      <div className="text-lg mb-1">{achievement.title}</div>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
