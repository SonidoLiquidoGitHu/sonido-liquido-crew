// ===========================================
// A/B TESTING SERVICE
// ===========================================

import { db } from "@/db/client";
import { abTests, abTestVariants, abTestEvents } from "@/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export type VideoTemplate =
  | "countdown"
  | "artwork-pulse"
  | "vinyl-spin"
  | "particles"
  | "waveform"
  | "text-reveal"
  | "glitch"
  | "minimal";

export interface ABTestConfig {
  id: string;
  name: string;
  variants: {
    id: string;
    name: string;
    key: VideoTemplate | string;
    weight: number;
  }[];
}

export interface ABTestResults {
  testId: string;
  testName: string;
  totalImpressions: number;
  totalConversions: number;
  overallConversionRate: number;
  variants: {
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
  }[];
  significanceLevel: number;
  hasWinner: boolean;
  winnerVariant?: string;
}

class ABTestingService {
  /**
   * Create a new A/B test for video templates
   */
  async createVideoTemplateTest(
    name: string,
    templates: { name: string; key: VideoTemplate; weight?: number }[]
  ): Promise<string> {
    // Create the test
    const [test] = await db
      .insert(abTests)
      .values({
        name,
        description: `Video template A/B test: ${templates.map((t) => t.name).join(" vs ")}`,
        testType: "video_template",
        status: "active",
      })
      .returning({ id: abTests.id });

    // Create variants
    for (const template of templates) {
      await db.insert(abTestVariants).values({
        testId: test.id,
        name: template.name,
        variantKey: template.key,
        weight: template.weight || Math.floor(100 / templates.length),
      });
    }

    console.log(`[AB Test] Created test "${name}" with ${templates.length} variants`);
    return test.id;
  }

  /**
   * Get active A/B test for video templates
   */
  async getActiveVideoTest(): Promise<ABTestConfig | null> {
    const tests = await db
      .select()
      .from(abTests)
      .where(
        and(
          eq(abTests.testType, "video_template"),
          eq(abTests.status, "active")
        )
      )
      .orderBy(desc(abTests.createdAt))
      .limit(1);

    if (tests.length === 0) return null;

    const test = tests[0];
    const variants = await db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.testId, test.id));

    return {
      id: test.id,
      name: test.name,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        key: v.variantKey as VideoTemplate,
        weight: v.weight || 50,
      })),
    };
  }

  /**
   * Get a random variant based on weights
   */
  getRandomVariant<T extends { id: string; weight: number }>(variants: T[]): T {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  /**
   * Record an A/B test event
   */
  async recordEvent(
    testId: string,
    variantId: string,
    eventType: "impression" | "click" | "conversion" | "engagement",
    metadata?: {
      sessionId?: string;
      userAgent?: string;
      engagementTime?: number;
      additionalData?: Record<string, unknown>;
    }
  ): Promise<void> {
    await db.insert(abTestEvents).values({
      testId,
      variantId,
      eventType,
      sessionId: metadata?.sessionId,
      userAgent: metadata?.userAgent,
      metadata: metadata?.additionalData
        ? JSON.stringify({
            ...metadata.additionalData,
            engagementTime: metadata.engagementTime,
          })
        : metadata?.engagementTime
        ? JSON.stringify({ engagementTime: metadata.engagementTime })
        : null,
    });
  }

  /**
   * Get test results with statistics
   */
  async getTestResults(testId: string): Promise<ABTestResults> {
    const test = await db
      .select()
      .from(abTests)
      .where(eq(abTests.id, testId))
      .limit(1);

    if (test.length === 0) {
      throw new Error("Test not found");
    }

    const variants = await db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.testId, testId));

    // Get event counts for each variant
    const variantResults = await Promise.all(
      variants.map(async (variant) => {
        const impressions = await db
          .select({ count: sql<number>`count(*)` })
          .from(abTestEvents)
          .where(
            and(
              eq(abTestEvents.variantId, variant.id),
              eq(abTestEvents.eventType, "impression")
            )
          );

        const clicks = await db
          .select({ count: sql<number>`count(*)` })
          .from(abTestEvents)
          .where(
            and(
              eq(abTestEvents.variantId, variant.id),
              eq(abTestEvents.eventType, "click")
            )
          );

        const conversions = await db
          .select({ count: sql<number>`count(*)` })
          .from(abTestEvents)
          .where(
            and(
              eq(abTestEvents.variantId, variant.id),
              eq(abTestEvents.eventType, "conversion")
            )
          );

        // Get engagement time from metadata
        const engagementEvents = await db
          .select({ metadata: abTestEvents.metadata })
          .from(abTestEvents)
          .where(
            and(
              eq(abTestEvents.variantId, variant.id),
              eq(abTestEvents.eventType, "engagement")
            )
          );

        let totalEngagementTime = 0;
        for (const event of engagementEvents) {
          if (event.metadata) {
            try {
              const data = JSON.parse(event.metadata);
              totalEngagementTime += data.engagementTime || 0;
            } catch {}
          }
        }

        const impressionCount = impressions[0]?.count || 0;
        const clickCount = clicks[0]?.count || 0;
        const conversionCount = conversions[0]?.count || 0;

        return {
          id: variant.id,
          name: variant.name,
          key: variant.variantKey,
          impressions: impressionCount,
          clicks: clickCount,
          conversions: conversionCount,
          engagementTime: totalEngagementTime,
          clickRate: impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0,
          conversionRate: impressionCount > 0 ? (conversionCount / impressionCount) * 100 : 0,
          isWinning: false,
          confidence: 0,
        };
      })
    );

    // Calculate totals
    const totalImpressions = variantResults.reduce((sum, v) => sum + v.impressions, 0);
    const totalConversions = variantResults.reduce((sum, v) => sum + v.conversions, 0);
    const overallConversionRate = totalImpressions > 0
      ? (totalConversions / totalImpressions) * 100
      : 0;

    // Determine winner (highest conversion rate with minimum sample size)
    const minSampleSize = 30;
    const qualifiedVariants = variantResults.filter((v) => v.impressions >= minSampleSize);

    let hasWinner = false;
    let winnerVariant: string | undefined;

    if (qualifiedVariants.length >= 2) {
      // Sort by conversion rate
      qualifiedVariants.sort((a, b) => b.conversionRate - a.conversionRate);

      const best = qualifiedVariants[0];
      const secondBest = qualifiedVariants[1];

      // Calculate statistical significance (simplified z-test)
      const pooledRate = (best.conversions + secondBest.conversions) /
                         (best.impressions + secondBest.impressions);
      const pooledStdErr = Math.sqrt(
        pooledRate * (1 - pooledRate) *
        (1 / best.impressions + 1 / secondBest.impressions)
      );

      const zScore = pooledStdErr > 0
        ? (best.conversionRate / 100 - secondBest.conversionRate / 100) / pooledStdErr
        : 0;

      // 95% confidence = z-score > 1.96
      const confidence = Math.min(99.9, Math.abs(zScore) / 1.96 * 95);

      if (confidence >= 95) {
        hasWinner = true;
        winnerVariant = best.id;
        best.isWinning = true;
        best.confidence = confidence;
      }

      // Update confidence for all variants
      for (const v of variantResults) {
        if (v.id === best.id) {
          v.confidence = confidence;
        }
      }
    }

    return {
      testId,
      testName: test[0].name,
      totalImpressions,
      totalConversions,
      overallConversionRate,
      variants: variantResults,
      significanceLevel: 95,
      hasWinner,
      winnerVariant,
    };
  }

  /**
   * Complete a test and declare a winner
   */
  async completeTest(testId: string, winnerVariantId?: string): Promise<void> {
    await db
      .update(abTests)
      .set({
        status: "completed",
        endDate: new Date().toISOString(),
        winnerVariant: winnerVariantId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(abTests.id, testId));
  }

  /**
   * Get all tests
   */
  async getAllTests(): Promise<(typeof abTests.$inferSelect)[]> {
    return db
      .select()
      .from(abTests)
      .orderBy(desc(abTests.createdAt));
  }

  /**
   * Get test stats for last N days
   */
  async getTestStatsByDay(
    testId: string,
    days: number = 30
  ): Promise<
    {
      date: string;
      variantId: string;
      variantName: string;
      impressions: number;
      conversions: number;
    }[]
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const variants = await db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.testId, testId));

    const results: {
      date: string;
      variantId: string;
      variantName: string;
      impressions: number;
      conversions: number;
    }[] = [];

    for (const variant of variants) {
      const events = await db
        .select({
          date: sql<string>`date(${abTestEvents.createdAt})`,
          eventType: abTestEvents.eventType,
          count: sql<number>`count(*)`,
        })
        .from(abTestEvents)
        .where(
          and(
            eq(abTestEvents.variantId, variant.id),
            gte(abTestEvents.createdAt, startDate.toISOString())
          )
        )
        .groupBy(sql`date(${abTestEvents.createdAt})`, abTestEvents.eventType);

      // Group by date
      const byDate: Record<string, { impressions: number; conversions: number }> = {};

      for (const event of events) {
        if (!byDate[event.date]) {
          byDate[event.date] = { impressions: 0, conversions: 0 };
        }
        if (event.eventType === "impression") {
          byDate[event.date].impressions = event.count;
        } else if (event.eventType === "conversion") {
          byDate[event.date].conversions = event.count;
        }
      }

      for (const [date, stats] of Object.entries(byDate)) {
        results.push({
          date,
          variantId: variant.id,
          variantName: variant.name,
          impressions: stats.impressions,
          conversions: stats.conversions,
        });
      }
    }

    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Initialize default video template test if none exists
   */
  async initializeDefaultTest(): Promise<string | null> {
    const existing = await this.getActiveVideoTest();
    if (existing) return existing.id;

    return this.createVideoTemplateTest("Video Template Performance Test", [
      { name: "Countdown", key: "countdown", weight: 25 },
      { name: "Artwork Pulse", key: "artwork-pulse", weight: 25 },
      { name: "Vinyl Spin", key: "vinyl-spin", weight: 25 },
      { name: "Particles", key: "particles", weight: 25 },
    ]);
  }
}

export const abTestingService = new ABTestingService();
