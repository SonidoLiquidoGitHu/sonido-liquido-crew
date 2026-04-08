"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Trophy,
  Percent,
  Eye,
  MousePointer,
  Target,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Plus,
  FlaskConical,
  Sparkles,
  Clock,
} from "lucide-react";

interface ABTestVariant {
  id: string;
  name: string;
  key: string;
  impressions: number;
  clicks: number;
  conversions: number;
  engagementTime: number;
  clickRate: number;
  conversionRate: number;
  isWinning: boolean;
  confidence: number;
}

interface ABTestResults {
  testId: string;
  testName: string;
  totalImpressions: number;
  totalConversions: number;
  overallConversionRate: number;
  variants: ABTestVariant[];
  significanceLevel: number;
  hasWinner: boolean;
  winnerVariant?: string;
}

interface ABTest {
  id: string;
  name: string;
  testType: string;
  status: string;
  startDate: string;
  endDate?: string;
  winnerVariant?: string;
}

interface ABTestDashboardProps {
  className?: string;
}

const TEMPLATE_COLORS: Record<string, string> = {
  countdown: "bg-blue-500",
  "artwork-pulse": "bg-purple-500",
  "vinyl-spin": "bg-pink-500",
  particles: "bg-yellow-500",
  waveform: "bg-green-500",
  "text-reveal": "bg-orange-500",
  glitch: "bg-red-500",
  minimal: "bg-gray-500",
};

export function ABTestDashboard({ className = "" }: ABTestDashboardProps) {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [activeTest, setActiveTest] = useState<{ id: string; name: string; variants: any[] } | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [results, setResults] = useState<ABTestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New test form
  const [showNewTest, setShowNewTest] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const VIDEO_TEMPLATES = [
    { key: "countdown", name: "Countdown" },
    { key: "artwork-pulse", name: "Artwork Pulse" },
    { key: "vinyl-spin", name: "Vinyl Spin" },
    { key: "particles", name: "Particles" },
    { key: "waveform", name: "Waveform" },
    { key: "text-reveal", name: "Text Reveal" },
    { key: "glitch", name: "Glitch" },
    { key: "minimal", name: "Minimal" },
  ];

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTestId) {
      fetchTestResults(selectedTestId);
    }
  }, [selectedTestId]);

  async function fetchTests() {
    try {
      const res = await fetch("/api/admin/ab-tests");
      const data = await res.json();

      if (data.success) {
        setTests(data.data.tests || []);
        setActiveTest(data.data.activeTest);

        // Auto-select active test
        if (data.data.activeTest && !selectedTestId) {
          setSelectedTestId(data.data.activeTest.id);
        }
      }
    } catch (err) {
      setError("Error al cargar tests");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTestResults(testId: string) {
    try {
      const res = await fetch(`/api/admin/ab-tests?testId=${testId}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.data.results);
      }
    } catch (err) {
      console.error("Error fetching results:", err);
    }
  }

  async function createTest() {
    if (!newTestName || selectedTemplates.length < 2) {
      setError("Nombre y al menos 2 templates son requeridos");
      return;
    }

    try {
      const res = await fetch("/api/admin/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTestName,
          variants: selectedTemplates.map((key) => ({
            key,
            name: VIDEO_TEMPLATES.find((t) => t.key === key)?.name || key,
            weight: Math.floor(100 / selectedTemplates.length),
          })),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowNewTest(false);
        setNewTestName("");
        setSelectedTemplates([]);
        fetchTests();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function completeTest(testId: string, winnerId?: string) {
    try {
      const res = await fetch("/api/admin/ab-tests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          winnerVariantId: winnerId,
          action: "complete",
        }),
      });

      if ((await res.json()).success) {
        fetchTests();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function toggleTemplate(key: string) {
    setSelectedTemplates((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald text-xl uppercase flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            A/B Testing de Videos
          </h3>
          <p className="text-sm text-slc-muted mt-1">
            Prueba diferentes templates y mide su rendimiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchTests}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowNewTest(!showNewTest)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Test
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">×</button>
        </div>
      )}

      {/* New test form */}
      {showNewTest && (
        <div className="p-4 bg-slc-card border border-primary/20 rounded-xl space-y-4">
          <h4 className="font-oswald text-sm uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Crear Nuevo Test A/B
          </h4>

          <div>
            <label className="block text-sm font-medium mb-2">Nombre del Test</label>
            <input
              type="text"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              placeholder="Ej: Test Templates Q1 2026"
              className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Selecciona Templates a Comparar (mínimo 2)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VIDEO_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => toggleTemplate(template.key)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedTemplates.includes(template.key)
                      ? "border-primary bg-primary/10"
                      : "border-slc-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${TEMPLATE_COLORS[template.key]}`} />
                    <span className="text-sm font-medium">{template.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={createTest} disabled={!newTestName || selectedTemplates.length < 2}>
              Crear Test
            </Button>
            <Button variant="ghost" onClick={() => setShowNewTest(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Test selector */}
      {tests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tests.map((test) => (
            <button
              key={test.id}
              onClick={() => setSelectedTestId(test.id)}
              className={`px-4 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                selectedTestId === test.id
                  ? "border-primary bg-primary/10"
                  : "border-slc-border hover:border-primary/50"
              }`}
            >
              {test.status === "active" ? (
                <Play className="w-3 h-3 text-green-500" />
              ) : (
                <Pause className="w-3 h-3 text-slc-muted" />
              )}
              {test.name}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slc-muted">Impresiones</span>
              </div>
              <p className="text-2xl font-oswald">{results.totalImpressions.toLocaleString()}</p>
            </div>

            <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-xs text-slc-muted">Conversiones</span>
              </div>
              <p className="text-2xl font-oswald">{results.totalConversions.toLocaleString()}</p>
            </div>

            <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-slc-muted">Tasa Conversión</span>
              </div>
              <p className="text-2xl font-oswald">{results.overallConversionRate.toFixed(2)}%</p>
            </div>

            <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slc-muted">Variantes</span>
              </div>
              <p className="text-2xl font-oswald">{results.variants.length}</p>
            </div>
          </div>

          {/* Winner banner */}
          {results.hasWinner && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <Trophy className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-oswald uppercase text-green-500">
                  ¡Tenemos un ganador!
                </p>
                <p className="text-sm text-slc-muted">
                  {results.variants.find((v) => v.id === results.winnerVariant)?.name} tiene
                  una tasa de conversión significativamente mayor con{" "}
                  {results.variants.find((v) => v.id === results.winnerVariant)?.confidence.toFixed(1)}%
                  de confianza estadística.
                </p>
              </div>
            </div>
          )}

          {/* Variant comparison */}
          <div className="space-y-4">
            <h4 className="font-oswald text-sm uppercase">Rendimiento por Variante</h4>

            <div className="space-y-3">
              {results.variants
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .map((variant, index) => {
                  const maxConversionRate = Math.max(...results.variants.map((v) => v.conversionRate));
                  const barWidth = maxConversionRate > 0 ? (variant.conversionRate / maxConversionRate) * 100 : 0;

                  return (
                    <div
                      key={variant.id}
                      className={`p-4 rounded-xl border ${
                        variant.isWinning
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-slc-card border-slc-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${TEMPLATE_COLORS[variant.key] || "bg-gray-500"}`} />
                          <span className="font-medium">{variant.name}</span>
                          {variant.isWinning && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs">
                              <Trophy className="w-3 h-3" />
                              Líder
                            </span>
                          )}
                          {index === 0 && !variant.isWinning && (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs">
                              Mejor rendimiento
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-oswald text-lg">{variant.conversionRate.toFixed(2)}%</p>
                          <p className="text-xs text-slc-muted">conversión</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-slc-dark rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full transition-all ${TEMPLATE_COLORS[variant.key] || "bg-primary"}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-sm font-oswald">{variant.impressions.toLocaleString()}</p>
                          <p className="text-xs text-slc-muted">Impresiones</p>
                        </div>
                        <div>
                          <p className="text-sm font-oswald">{variant.clicks.toLocaleString()}</p>
                          <p className="text-xs text-slc-muted">Clicks</p>
                        </div>
                        <div>
                          <p className="text-sm font-oswald">{variant.conversions.toLocaleString()}</p>
                          <p className="text-xs text-slc-muted">Conversiones</p>
                        </div>
                        <div>
                          <p className="text-sm font-oswald">{variant.clickRate.toFixed(2)}%</p>
                          <p className="text-xs text-slc-muted">CTR</p>
                        </div>
                      </div>

                      {/* Confidence indicator */}
                      {variant.confidence > 0 && (
                        <div className="mt-3 pt-3 border-t border-slc-border">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-slc-muted" />
                            <span className="text-xs text-slc-muted">
                              Confianza estadística: {variant.confidence.toFixed(1)}%
                            </span>
                            {variant.confidence >= 95 && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {results.hasWinner && (
              <Button
                onClick={() => completeTest(results.testId, results.winnerVariant)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalizar Test con Ganador
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => completeTest(results.testId)}
            >
              Finalizar Sin Ganador
            </Button>
          </div>
        </>
      )}

      {/* No tests */}
      {tests.length === 0 && !showNewTest && (
        <div className="text-center py-12">
          <FlaskConical className="w-12 h-12 mx-auto mb-4 text-slc-muted opacity-50" />
          <h3 className="font-oswald text-lg uppercase mb-2">No hay tests activos</h3>
          <p className="text-sm text-slc-muted mb-4">
            Crea un test A/B para comparar el rendimiento de diferentes templates de video.
          </p>
          <Button onClick={() => setShowNewTest(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primer Test
          </Button>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-slc-card/50 rounded-xl border border-slc-border">
        <h4 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Tips para A/B Testing
        </h4>
        <ul className="text-sm text-slc-muted space-y-2">
          <li>• <strong>Mínimo 30 impresiones</strong> por variante para resultados significativos</li>
          <li>• <strong>95% de confianza</strong> indica un ganador estadísticamente válido</li>
          <li>• Prueba templates con estilos muy diferentes para resultados más claros</li>
          <li>• Los tests funcionan mejor con alto volumen de tráfico</li>
        </ul>
      </div>
    </div>
  );
}

export default ABTestDashboard;
