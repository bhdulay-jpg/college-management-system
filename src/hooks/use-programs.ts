"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { PROGRAMS, type Program } from "../lib/program-service";

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>(PROGRAMS);
  const [documentIdByCode, setDocumentIdByCode] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "programs"),
      (snapshot) => {
        const programByCode = new Map(
          PROGRAMS.map((program) => [program.code.toUpperCase(), program])
        );
        const documentIds = new Map<string, string>();

        snapshot.docs.forEach((programDoc) => {
          const data = programDoc.data();
          const code = typeof data.code === "string" ? data.code.trim().toUpperCase() : programDoc.id.toUpperCase();
          const name = typeof data.name === "string" ? data.name.trim() : "";

          if (!code || !name) {
            console.warn(`Skipping incomplete program document: programs/${programDoc.id}`);
            return;
          }

          const totalUnits = typeof data.totalUnits === "number" && Number.isFinite(data.totalUnits)
            ? data.totalUnits
            : 0;

          programByCode.set(code, {
            code,
            name,
            department: typeof data.department === "string" ? data.department : "",
            duration: typeof data.duration === "string" ? data.duration : "",
            totalUnits,
            description: typeof data.description === "string" ? data.description : "",
            hasCurriculum: typeof data.hasCurriculum === "boolean" ? data.hasCurriculum : false,
          });
          documentIds.set(code, programDoc.id);
        });

        setPrograms(Array.from(programByCode.values()).sort((a, b) => a.code.localeCompare(b.code)));
        setDocumentIdByCode(documentIds);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Error loading programs:", snapshotError);
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { programs, documentIdByCode, loading, error };
}
