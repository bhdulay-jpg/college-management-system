"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { StatCard } from "./stat-card";
import { Button } from "../ui/button";
import { LoadingState } from "../loading-state";
import { DollarSign, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "../router";
import { toast } from "sonner@2.0.3";

export function BusinessDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPayments: 0,
    pendingVerification: 0,
    verifiedPayments: 0,
    rejectedPayments: 0,
  });
  const router = useRouter();

  useEffect(() => {
    let enrollmentStats = { total: 0, pending: 0, verified: 0, rejected: 0 };
    let portalPaymentStats = { total: 0, pending: 0, verified: 0, rejected: 0 };
    let enrollmentsLoaded = false;
    let portalPaymentsLoaded = false;

    const updateStats = () => {
      setStats({
        totalPayments: enrollmentStats.total + portalPaymentStats.total,
        pendingVerification: enrollmentStats.pending + portalPaymentStats.pending,
        verifiedPayments: enrollmentStats.verified + portalPaymentStats.verified,
        rejectedPayments: enrollmentStats.rejected + portalPaymentStats.rejected,
      });
      if (enrollmentsLoaded && portalPaymentsLoaded) setLoading(false);
    };

    const countStatuses = (statuses: string[], total = statuses.length) => ({
      total,
      pending: statuses.filter(status => status === "pending").length,
      verified: statuses.filter(status => status === "verified").length,
      rejected: statuses.filter(status => status === "rejected").length,
    });

    const unsubscribeEnrollments = onSnapshot(
      query(collection(db, "enrollments")),
      (snapshot) => {
        enrollmentStats = countStatuses(
          snapshot.docs.map(document => String(document.data().paymentStatus || "").toLowerCase()),
          snapshot.size
        );
        enrollmentsLoaded = true;
        updateStats();
      },
      (error) => {
        console.error("Error loading enrollment payments:", error);
        toast.error("Could not load enrollment payment totals.");
        enrollmentsLoaded = true;
        updateStats();
      }
    );

    const unsubscribePortalPayments = onSnapshot(
      query(collection(db, "payments")),
      (snapshot) => {
        const studentPayments = snapshot.docs
          .filter(document => document.data().submittedBy === "student");
        portalPaymentStats = countStatuses(
          studentPayments.map(document => String(document.data().status || "").toLowerCase())
        );
        portalPaymentsLoaded = true;
        updateStats();
      },
      (error) => {
        console.error("Error loading student portal payments:", error);
        toast.error("Could not load student portal payment totals.");
        portalPaymentsLoaded = true;
        updateStats();
      }
    );

    return () => {
      unsubscribeEnrollments();
      unsubscribePortalPayments();
    };
  }, []);

  const statCards = [
    { title: "Payments", value: stats.totalPayments, icon: DollarSign },
    { title: "Awaiting review", value: stats.pendingVerification, icon: Clock },
    { title: "Verified", value: stats.verifiedPayments, icon: CheckCircle },
    { title: "Rejected", value: stats.rejectedPayments, icon: XCircle },
  ];

  if (loading) {
    return (
      <DashboardLayout userRole="Business Office" userName="Business Office" notificationCount={0}>
        <div className="p-4 md:p-6">
          <LoadingState message="Loading payment data..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Business Office" userName="Business Office" notificationCount={stats.pendingVerification}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <header>
          <h1 className="text-2xl font-semibold">Business Office</h1>
          <p className="text-sm text-muted-foreground">Payments and student account management</p>
        </header>

        <section aria-label="Payment overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => <StatCard key={stat.title} {...stat} />)}
        </section>

        {stats.pendingVerification > 0 && (
          <section className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium">
                {stats.pendingVerification} payment{stats.pendingVerification === 1 ? "" : "s"} need review
              </h2>
              <p className="text-sm text-muted-foreground">Review submitted payment details and receipts.</p>
            </div>
            <Button onClick={() => router.navigate("dashboard/business/payments")}>
              Review payments
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </section>
        )}

        <section aria-label="Quick access">
          <h2 className="mb-3 text-lg font-semibold">Quick access</h2>
          <div className="divide-y rounded-lg border bg-card">
            {[
              { label: "Check payments", detail: "Review new payment submissions", route: "dashboard/business/payments" },
              { label: "Student balances", detail: "See balances and record payments", route: "dashboard/business/student-ledger" },
              { label: "Calculate student fees", detail: "Prepare or update a student's charges", route: "dashboard/business/student-assessment" },
              { label: "Tuition and school fees", detail: "Update rates, fees, and discounts", route: "dashboard/business/fee-configuration" },
            ].map((module) => (
              <button
                key={module.route}
                type="button"
                onClick={() => router.navigate(module.route)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span>
                  <span className="block font-medium">{module.label}</span>
                  <span className="text-sm text-muted-foreground">{module.detail}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
