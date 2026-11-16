/**
 * Notification Service for CollegeConnect
 * Handles account credential management and activity logging
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface AccountCredentials {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentId: string;
  studentPassword: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentPassword: string;
  collegeName: string;
  loginUrl: string;
}

/**
 * Log activity to Firestore for Admin Dashboard
 */
export async function logActivity(activity: {
  type: string;
  title: string;
  description: string;
  metadata?: any;
}): Promise<void> {
  try {
    await addDoc(collection(db, "activities"), {
      ...activity,
      timestamp: serverTimestamp(),
      read: false,
    });
  } catch (error: any) {
    console.error("Error logging activity:", error);
    // Silently fail - activity logging is not critical for account creation
    // This can happen if Firebase security rules restrict write access
    if (error?.code === "permission-denied") {
      console.warn("Activity logging skipped due to permission restrictions. Update Firebase security rules to enable activity logging.");
    }
  }
}

/**
 * Log account creation for both student and parent
 */
export async function logAccountCreation(credentials: AccountCredentials): Promise<void> {
  const hasParentAccount = Boolean(credentials.parentEmail);

  try {
    await logActivity({
      type: "accounts_created",
      title: hasParentAccount ? "Student & Parent Accounts Created" : "Student Account Created",
      description: hasParentAccount
        ? `Created accounts for ${credentials.studentName} (${credentials.studentId}) and parent ${credentials.parentName}. Credentials ready for manual distribution.`
        : `Created a student account for ${credentials.studentName} (${credentials.studentId}). Credentials ready for manual distribution.`,
      metadata: {
        studentEmail: credentials.studentEmail,
        ...(hasParentAccount && { parentEmail: credentials.parentEmail }),
        studentId: credentials.studentId,
      },
    });
  } catch (error) {
    console.error("Failed to log account creation activity:", error);
    // Don't throw error - logging failure shouldn't stop account creation
  }
}

/**
 * Format credentials message for display and manual sending
 */
export function formatCredentialsMessage(credentials: AccountCredentials): string {
  const parentSection = credentials.parentEmail
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍👩‍👧 PARENT ACCOUNT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${credentials.parentName}
Email: ${credentials.parentEmail}
Password: ${credentials.parentPassword}
Phone: ${credentials.parentPhone}
`
    : "";
  const recipients = credentials.parentEmail
    ? "- Student's personal email/SMS\n  - Parent's personal email/SMS"
    : "- Student's personal email/SMS";
  const accountStatus = credentials.parentEmail
    ? "Both accounts are active and linked."
    : "The student account is active.";

  return `
✅ ${credentials.parentEmail ? "Student & Parent Accounts" : "Student Account"} Created Successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 STUDENT ACCOUNT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Student ID: ${credentials.studentId}
Email: ${credentials.studentEmail}
Password: ${credentials.studentPassword}
Phone: ${credentials.studentPhone}

${parentSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Copy these credentials and send manually to:
  ${recipients}
• ${accountStatus}
• Save these credentials securely as backup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

/**
 * Generate email template for student (to be sent manually)
 */
export function generateStudentEmailTemplate(credentials: AccountCredentials): string {
  return `
Subject: Your CollegeConnect Student Account - Login Credentials

Dear ${credentials.studentName},

Congratulations! Your student account has been successfully created at ${credentials.collegeName}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 YOUR STUDENT ACCOUNT CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Student ID: ${credentials.studentId}
Email: ${credentials.studentEmail}
Password: ${credentials.studentPassword}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 HOW TO LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Visit: ${credentials.loginUrl}
2. Click "Login" button
3. Select "Student" as your role
4. Enter your email and password
5. Click "Sign In"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 STUDENT DASHBOARD FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ View your grades and academic records
✓ Track your attendance
✓ Check your class schedule
✓ View school announcements
✓ Monitor your enrollment status
✓ Access course materials

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANT SECURITY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Keep your password secure and do not share it with anyone
• Change your password after your first login
• If you forget your password, use the "Forgot Password" link
• Contact the registrar's office if you have any issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 NEED HELP?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any questions or need assistance, please contact:
• Registrar's Office
• Email: registrar@${credentials.collegeName.toLowerCase().replace(/\s+/g, '')}.edu.ph
• Phone: (Available during office hours)

Welcome to ${credentials.collegeName}!

Best regards,
${credentials.collegeName} Registrar's Office

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply to this email.
  `.trim();
}

/**
 * Generate email template for parent (to be sent manually)
 */
export function generateParentEmailTemplate(credentials: AccountCredentials): string {
  return `
Subject: Your CollegeConnect Parent Account - Monitor Your Child's Education

Dear ${credentials.parentName},

Welcome to ${credentials.collegeName}'s Parent Portal! Your parent account has been created to help you monitor your child's academic progress.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍👩‍👧 YOUR PARENT ACCOUNT CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: ${credentials.parentEmail}
Password: ${credentials.parentPassword}

Linked Student: ${credentials.studentName}
Student ID: ${credentials.studentId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 HOW TO LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Visit: ${credentials.loginUrl}
2. Click "Login" button
3. Select "Parent" as your role
4. Enter your email and password
5. Click "Sign In"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PARENT DASHBOARD FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Monitor your child's progress in real-time:

✓ View grades and academic performance
✓ Track daily attendance records
✓ Monitor financial obligations and payments
✓ Receive important school announcements
✓ Check enrollment status
✓ Stay informed about school activities

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 REAL-TIME NOTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You will receive automatic notifications for:

• New grades posted
• Attendance alerts (absences/tardiness)
• New financial charges
• Payment confirmations
• Important announcements
• Enrollment updates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANT SECURITY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Keep your password secure and confidential
• Change your password after your first login
• Use the "Forgot Password" link if needed
• Contact the registrar's office for assistance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 NEED HELP?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For questions or technical support:
• Registrar's Office
• Email: registrar@${credentials.collegeName.toLowerCase().replace(/\s+/g, '')}.edu.ph
• Phone: (Available during office hours)

Thank you for partnering with us in your child's education!

Best regards,
${credentials.collegeName} Registrar's Office

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply to this email.
  `.trim();
}

/**
 * Generate SMS template for student (to be sent manually)
 */
export function generateStudentSMSTemplate(credentials: AccountCredentials): string {
  return `
CollegeConnect - Student Account Created

Welcome ${credentials.studentName}!

Student ID: ${credentials.studentId}
Email: ${credentials.studentEmail}
Password: ${credentials.studentPassword}

Login: ${credentials.loginUrl}

Keep credentials secure. Change password after first login.

- ${credentials.collegeName}
  `.trim();
}

/**
 * Generate SMS template for parent (to be sent manually)
 */
export function generateParentSMSTemplate(credentials: AccountCredentials): string {
  return `
CollegeConnect - Parent Account Created

Dear ${credentials.parentName},

Your parent portal account is ready!

Email: ${credentials.parentEmail}
Password: ${credentials.parentPassword}

Linked Student: ${credentials.studentName} (${credentials.studentId})

Login: ${credentials.loginUrl}

Monitor grades, attendance & payments in real-time.

- ${credentials.collegeName}
  `.trim();
}