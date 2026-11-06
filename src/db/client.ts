import { createClient, type Client } from "@libsql/client";
import "dotenv/config";

let singletonClient: Client | null = null;

function readRequiredEnv(name: "TURSO_DATABASE_URL" | "TURSO_AUTH_TOKEN"): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.example a .env y completa las credenciales de Turso.`,
    );
  }

  return value;
}

/**
 * Crea (y reutiliza) el cliente de Turso para toda la aplicación.
 * El cliente es seguro de compartir entre módulos.
 */
export function getDbClient(): Client {
  if (singletonClient) {
    return singletonClient;
  }

  const url = readRequiredEnv("TURSO_DATABASE_URL");
  const authToken = readRequiredEnv("TURSO_AUTH_TOKEN");

  singletonClient = createClient({ url, authToken });
  return singletonClient;
}

/** Útil en scripts y pruebas para cerrar la conexión al finalizar. */
export function closeDbClient(): void {
  if (!singletonClient) {
    return;
  }

  singletonClient.close();
  singletonClient = null;
}
