"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { LoadingState } from "../loading-state";
import { Mail, Phone, User, Link2, AlertCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { formatDateShort } from "../../lib/date-formatter";

interface ParentAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  lastLogin?: any;
  address?: string;
  city?: string;
  province?: string;
}

interface ParentAccountDisplayProps {
  parentId: string | null | undefined;
  onLink?: () => void;
  onUnlink?: () => void;
  canEdit?: boolean;
}

export function ParentAccountDisplay({ parentId, onLink, onUnlink, canEdit }: ParentAccountDisplayProps) {
  const [parent, setParent] = useState<ParentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchParentAccount = async () => {
      if (!parentId) {
        setLoading(false);
        return;
      }

      try {
        const parentDoc = await getDoc(doc(db, "users", parentId));
        if (parentDoc.exists()) {
          setParent({
            id: parentDoc.id,
            ...parentDoc.data(),
          } as ParentAccount);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching parent account:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchParentAccount();
  }, [parentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Linked Parent Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4">
            <LoadingState message="Loading parent account..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!parentId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Linked Parent Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">No Parent Account Linked</div>
              <div className="text-xs text-muted-foreground">
                Parent account was not created during enrollment
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !parent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Linked Parent Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <div className="text-sm font-medium text-red-900">Account Not Found</div>
              <div className="text-xs text-red-700">
                Parent account reference exists but account not found in database
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4 text-green-600" />
          Linked Parent Account
          <Badge variant="default" className="ml-auto">
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Parent Name</div>
              <div className="font-medium flex items-center gap-2">
                <User className="h-3 w-3" />
                {parent.name}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div>
                <Badge variant={parent.status === "active" ? "default" : "secondary"}>
                  {parent.status || "Active"}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <span className="text-sm">{parent.email}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="font-medium flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {parent.phone || "N/A"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last Login</div>
              <div className="font-medium">
                {parent.lastLogin?.toDate?.() 
                  ? formatDateShort(parent.lastLogin.toDate().toISOString())
                  : "Never"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Account ID</div>
              <div className="font-medium font-mono text-xs">{parent.id}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="w-2 h-2 rounded-full bg-green-600"></div>
            <span className="text-xs text-green-700">
              Parent account is successfully linked and can access student information
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}