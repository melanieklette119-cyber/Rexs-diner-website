"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWebsiteConfig, type SoonProject } from '@/lib/user-data';

export default function DatenschutzPage() {
  const [seconds, setSeconds] = useState<number | null>(10); // Timer für automatische Weiterleitung
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState<string>(''); // Aktuelle Uhrzeit
  const [projects, setProjects] = useState<SoonProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const router = useRouter();

  const targetDate = projects.length > 0 ? new Date(projects[0].targetDate) : new Date('2026-03-15');

  // Countdown-Timer
  useEffect(() => {
    if (seconds !== null && seconds > 0) {
      const interval = setInterval(() => {
        setSeconds(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(interval);
    } else if (seconds === 0) {
      router.push('/');
    }
  }, [seconds, router]);

  // Projekte laden
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const config = await getWebsiteConfig();
        setProjects(config.soonProjects || []);
      } catch (error) {
        console.error("Failed to load soon projects:", error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // Berechnung verbleibender Tage
  useEffect(() => {
    const updateRemainingDays = () => {
      const now = new Date();
      const timeDiff = targetDate.getTime() - now.getTime();
      const days = Math.floor(timeDiff / (1000 * 3600 * 24));
      setDaysRemaining(days);
    };

    updateRemainingDays();
    const interval = setInterval(updateRemainingDays, 1000 * 60 * 60 * 24);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Aktuelle Uhrzeit setzen
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('de-DE');
      const formattedTime = now.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCurrentDateTime(`${formattedDate} ${formattedTime}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = () => setSeconds(null);

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg shadow-sm p-8 border border-border">
          <h1 className="text-3xl font-bold text-card-foreground mb-8">
            {loadingProjects
              ? "Projektübersicht lädt..."
              : projects.length > 0
                ? `Projektübersicht: ${projects.length} Projekte in Bearbeitung`
                : "Projektübersicht: Keine aktiven Projekte"}
          </h1>

          <div className="prose prose-gray max-w-none text-sm text-muted-foreground space-y-6">
            {loadingProjects ? (
              <p className="text-xl text-center font-semibold text-card-foreground">Lade Projekte...</p>
            ) : projects.length === 0 ? (
              <p className="text-xl text-center font-semibold text-card-foreground">
                Derzeit sind keine Projekte in Bearbeitung, da noch nichts geplant wurde.
              </p>
            ) : (
              <div className="space-y-4">
                {projects
                  .slice()
                  .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
                  .map(project => (
                    <div key={project.id} className="rounded-md border border-border p-4">
                      <h2 className="text-lg font-semibold text-card-foreground">{project.title}</h2>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                      <p className="text-sm text-card-foreground mt-1">
                        Geplantes Fertigstellungsdatum: {project.targetDate}
                      </p>
                      {project.status && (
                        <p className="text-sm text-muted-foreground">Status: {project.status}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {projects.length > 0 && daysRemaining !== null && (
              <div className="mt-8">
                <p className="text-xl text-center font-semibold text-card-foreground">
                  Nächste geplante Fertigstellung: <strong className="text-card-foreground">{projects[0]?.targetDate}</strong> (<strong>{daysRemaining} Tage</strong>)
                </p>
              </div>
            )}

            {/* Countdown oder Abbruch Nachricht */}
            <div className="mt-8 text-center">
              {seconds !== null ? (
                <p className="text-xl font-semibold text-card-foreground">
                  Weiterleitung zur Startseite in <span className="text-card-foreground">{seconds}</span> Sekunden.
                </p>
              ) : (
                <p className="text-xl font-semibold text-card-foreground">
                  Weiterleitung wurde abgebrochen. <br />
                  Wenn du zurück willst, drücke oben links auf Startseite oder unten auf Weiterleiten.
                </p>
              )}
            </div>

            {/* Buttons zum Weiterleiten / Abbrechen */}
            <div className="mt-8 flex justify-center gap-4">
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                onClick={() => router.push('/')}
              >
                Weiterleiten
              </button>
              {seconds !== null && (
                <button
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                  onClick={handleCancel}
                >
                  Abbrechen
                </button>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-border text-center text-sm text-muted-foreground">
              <p>
                Gültig ab: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p>Letzte Aktualisierung: {currentDateTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
