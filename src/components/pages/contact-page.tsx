"use client";

import { PageHeader } from "../page-header";
import { PageFooter } from "../page-footer";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { useState } from "react";
import { formatPhoneNumber } from "../../lib/phone-formatter";

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Visit Us",
      details: ["123 Education Boulevard", "Quezon City, Metro Manila", "Philippines 1100"],
    },
    {
      icon: Phone,
      title: "Call Us",
      details: ["Main: (02) 8123-4567", "Admissions: (02) 8123-4568", "Support: (02) 8123-4569"],
    },
    {
      icon: Mail,
      title: "Email Us",
      details: ["info@collegeconnect.ph", "admissions@collegeconnect.ph", "support@collegeconnect.ph"],
    },
    {
      icon: Clock,
      title: "Office Hours",
      details: ["Monday - Friday: 8:00 AM - 5:00 PM", "Saturday: 9:00 AM - 1:00 PM", "Sunday: Closed"],
    },
  ];

  const subjects = [
    "General Inquiry",
    "Admissions Information",
    "Technical Support",
    "Financial Aid",
    "Academic Programs",
    "Partnership Opportunities",
    "Other",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader variant="public" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-1/3 h-[500px] w-[500px] rounded-full bg-blue-bayoux-200/20 dark:bg-blue-bayoux-800/20 blur-3xl" />
          </div>

          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-blue-bayoux-50 dark:bg-blue-bayoux-900/50 px-4 py-2 text-sm">
                <span className="text-blue-bayoux-700 dark:text-blue-bayoux-300">Get in Touch</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl">
                We're Here to Help
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Have questions about CollegeConnect? Our team is ready to assist you. 
                Reach out through any channel below.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20 max-w-6xl mx-auto">
              {contactInfo.map((info, index) => (
                <Card key={index} className="border-2 hover:border-blue-bayoux-400 dark:hover:border-blue-bayoux-600 transition-all hover:shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <div className="inline-flex p-3 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-xl">
                      <info.icon className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-lg">{info.title}</h3>
                      <div className="space-y-1">
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Contact Form */}
            <div className="max-w-3xl mx-auto">
              <Card className="border-2">
                <CardHeader className="text-center space-y-2">
                  <CardTitle className="text-2xl md:text-3xl">Send Us a Message</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Fill out the form below and we'll respond within 24 hours
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="Juan Dela Cruz"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="juan@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+63 912 345 6789"
                          value={formatPhoneNumber(formData.phone)}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Select
                          value={formData.subject}
                          onValueChange={(value) => setFormData({ ...formData, subject: value })}
                          required
                        >
                          <SelectTrigger id="subject">
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="How can we help you?"
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full md:w-auto">
                      <Send className="mr-2 h-5 w-5" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-16 bg-blue-bayoux-50/50 dark:bg-blue-bayoux-950/20">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="max-w-5xl mx-auto">
              <Card className="border-2 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-blue-bayoux-100 to-blue-bayoux-200 dark:from-blue-bayoux-900 dark:to-blue-bayoux-800 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="inline-flex p-4 bg-white dark:bg-blue-bayoux-950 rounded-full shadow-lg">
                        <MapPin className="h-12 w-12 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                      </div>
                      <div>
                        <p className="text-lg mb-2">Find Us Here</p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          123 Education Boulevard, Quezon City, Metro Manila, Philippines
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Quick Response CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-screen-2xl">
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 bg-gradient-to-br from-blue-bayoux-50 to-white dark:from-blue-bayoux-950 dark:to-blue-bayoux-900/50">
                <CardContent className="p-12 text-center space-y-6">
                  <div className="inline-flex p-4 bg-blue-bayoux-100 dark:bg-blue-bayoux-900 rounded-full">
                    <Clock className="h-8 w-8 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl md:text-3xl">Need Immediate Assistance?</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      For urgent inquiries, call our hotline or chat with our support team. 
                      We're available Monday to Saturday during office hours.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button size="lg" variant="default">
                      <Phone className="mr-2 h-5 w-5" />
                      Call Now
                    </Button>
                    <Button size="lg" variant="outline">
                      <Mail className="mr-2 h-5 w-5" />
                      Email Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
