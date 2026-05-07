import { db, isDatabaseConfigured } from "@/db/client";
import { trustedContributors } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

// Helper function to check if a user is trusted
export async function checkTrustedContributor(
  email?: string | null,
  instagram?: string | null
): Promise<{ trusted: boolean; autoApproveMessages: boolean; autoApprovePhotos: boolean; autoFeature: boolean } | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!email && !instagram) {
    return null;
  }

  const conditions = [];

  if (email) {
    conditions.push(
      and(
        eq(trustedContributors.identifierType, "email"),
        eq(trustedContributors.identifierValue, email.toLowerCase().trim())
      )
    );
  }

  if (instagram) {
    const cleanInstagram = instagram.replace("@", "").toLowerCase().trim();
    conditions.push(
      and(
        eq(trustedContributors.identifierType, "instagram"),
        eq(trustedContributors.identifierValue, cleanInstagram)
      )
    );
  }

  try {
    const [contributor] = await db
      .select()
      .from(trustedContributors)
      .where(
        and(
          eq(trustedContributors.isActive, true),
          conditions.length > 1 ? or(...conditions) : conditions[0]
        )
      )
      .limit(1);

    if (contributor) {
      return {
        trusted: true,
        autoApproveMessages: contributor.autoApproveMessages ?? true,
        autoApprovePhotos: contributor.autoApprovePhotos ?? true,
        autoFeature: contributor.autoFeature ?? false,
      };
    }
  } catch (error) {
    console.error("[Trusted Contributors] Error checking:", error);
  }

  return null;
}
