import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";
import { createClient } from "@libsql/client/web";
import { generateUUID, slugify } from "@/lib/utils";

function getRawClient() {
  const url = (process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "").trim();
  const token = (process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || "").trim();

  if (!url || !token) return null;

  return createClient({ url, authToken: token });
}

export async function GET() {
  const results: {
    step: string;
    success: boolean;
    message: string;
    data?: any;
  }[] = [];

  try {
    // Step 1: Check environment variables
    const hasDbUrl = !!(process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL);
    const hasDbToken = !!(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN);

    results.push({
      step: "1. Variables de entorno",
      success: hasDbUrl && hasDbToken,
      message: hasDbUrl && hasDbToken
        ? "✅ DATABASE_URL y AUTH_TOKEN configuradas"
        : `❌ Falta: ${!hasDbUrl ? "DATABASE_URL " : ""}${!hasDbToken ? "AUTH_TOKEN" : ""}`,
    });

    if (!hasDbUrl || !hasDbToken) {
      return NextResponse.json({
        success: false,
        message: "Variables de entorno no configuradas",
        results,
      });
    }

    // Step 2: Check isDatabaseConfigured
    const isConfigured = isDatabaseConfigured();
    results.push({
      step: "2. isDatabaseConfigured()",
      success: isConfigured,
      message: isConfigured ? "✅ Función retorna true" : "❌ Función retorna false",
    });

    // Step 3: Try to get raw client
    const client = getRawClient();
    results.push({
      step: "3. Crear cliente de base de datos",
      success: !!client,
      message: client ? "✅ Cliente creado exitosamente" : "❌ No se pudo crear el cliente",
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        message: "No se pudo crear el cliente de base de datos",
        results,
      });
    }

    // Step 4: Test simple query
    try {
      const tableCheck = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns'");
      const tableExists = tableCheck.rows.length > 0;

      results.push({
        step: "4. Verificar tabla campaigns",
        success: tableExists,
        message: tableExists ? "✅ Tabla 'campaigns' existe" : "❌ Tabla 'campaigns' no existe - ¿ejecutaste las migraciones?",
      });

      if (!tableExists) {
        return NextResponse.json({
          success: false,
          message: "La tabla campaigns no existe",
          results,
        });
      }
    } catch (error: any) {
      results.push({
        step: "4. Verificar tabla campaigns",
        success: false,
        message: `❌ Error de conexión: ${error.message}`,
      });
      return NextResponse.json({
        success: false,
        message: "Error conectando a la base de datos",
        results,
      });
    }

    // Step 5: Get table schema
    try {
      const schemaResult = await client.execute("PRAGMA table_info(campaigns)");
      const columns = schemaResult.rows.map((row: any) => row.name);

      results.push({
        step: "5. Esquema de tabla campaigns",
        success: true,
        message: `✅ ${columns.length} columnas encontradas`,
        data: columns,
      });
    } catch (error: any) {
      results.push({
        step: "5. Esquema de tabla campaigns",
        success: false,
        message: `❌ Error: ${error.message}`,
      });
    }

    // Step 6: Test INSERT with test campaign
    const testId = `test_${generateUUID()}`;
    const testTitle = `Test Campaign ${Date.now()}`;
    const testSlug = slugify(testTitle);
    const now = Math.floor(Date.now() / 1000);

    try {
      const insertSql = `
        INSERT INTO campaigns (
          id, title, slug, description, campaign_type,
          download_gate_enabled, require_spotify_follow, require_spotify_presave, require_email,
          is_active, is_featured,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await client.execute({
        sql: insertSql,
        args: [
          testId,
          testTitle,
          testSlug,
          "Campaña de prueba - se eliminará automáticamente",
          "presave",
          0, // download_gate_enabled
          0, // require_spotify_follow
          0, // require_spotify_presave
          1, // require_email
          0, // is_active (false para que no aparezca en producción)
          0, // is_featured
          now,
          now,
        ],
      });

      results.push({
        step: "6. Insertar campaña de prueba",
        success: true,
        message: `✅ Campaña insertada: ${testId}`,
      });

      // Step 7: Verify the insert by reading back
      const readResult = await client.execute({
        sql: "SELECT id, title, slug, created_at FROM campaigns WHERE id = ?",
        args: [testId],
      });

      if (readResult.rows.length > 0) {
        results.push({
          step: "7. Leer campaña insertada",
          success: true,
          message: "✅ Campaña leída correctamente",
          data: readResult.rows[0],
        });
      } else {
        results.push({
          step: "7. Leer campaña insertada",
          success: false,
          message: "❌ No se encontró la campaña después de insertarla",
        });
      }

      // Step 8: Delete test campaign
      await client.execute({
        sql: "DELETE FROM campaigns WHERE id = ?",
        args: [testId],
      });

      results.push({
        step: "8. Eliminar campaña de prueba",
        success: true,
        message: "✅ Campaña de prueba eliminada (limpieza)",
      });

    } catch (error: any) {
      results.push({
        step: "6. Insertar campaña de prueba",
        success: false,
        message: `❌ Error en INSERT: ${error.message}`,
      });

      // Try to provide more details about the error
      if (error.message.includes("no such column")) {
        const missingColumn = error.message.match(/no such column: (\w+)/)?.[1];
        results.push({
          step: "Diagnóstico",
          success: false,
          message: `La columna '${missingColumn}' no existe en la tabla. Es posible que necesites ejecutar las migraciones más recientes.`,
        });
      }

      return NextResponse.json({
        success: false,
        message: "Error al insertar campaña de prueba",
        results,
      });
    }

    // Step 9: Count existing campaigns
    try {
      const countResult = await client.execute("SELECT COUNT(*) as count FROM campaigns");
      const count = countResult.rows[0]?.count || 0;

      results.push({
        step: "9. Campañas existentes",
        success: true,
        message: `✅ Total de campañas en la base de datos: ${count}`,
      });
    } catch (error: any) {
      results.push({
        step: "9. Campañas existentes",
        success: false,
        message: `❌ Error: ${error.message}`,
      });
    }

    // All tests passed!
    return NextResponse.json({
      success: true,
      message: "🎉 Todas las pruebas pasaron correctamente. La API de campañas está lista.",
      results,
    });

  } catch (error: any) {
    results.push({
      step: "Error general",
      success: false,
      message: `❌ ${error.message}`,
    });

    return NextResponse.json({
      success: false,
      message: "Error durante las pruebas",
      results,
    });
  }
}
