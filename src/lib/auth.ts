import { randomBytes } from "node:crypto";
import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { betterAuth } from "better-auth";
import { oauthPopup } from "better-auth/plugins";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

type GoogleClientConfig = {
  web?: {
    client_id?: string;
    client_secret?: string;
  };
};

const googleConfigPath = path.join(process.cwd(), "gcalendercred.json");
let googleConfigError: Error | undefined;
let googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
let googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

try {
  const rawConfig = process.env.GOOGLE_CLIENT_CONFIG_JSON
    ?? (existsSync(googleConfigPath) ? readFileSync(googleConfigPath, "utf8") : undefined);
  if (rawConfig) {
    const config = JSON.parse(rawConfig) as GoogleClientConfig;
    googleClientId ||= config.web?.client_id ?? "";
    googleClientSecret ||= config.web?.client_secret ?? "";
  }
} catch (error) {
  googleConfigError = error instanceof Error ? error : new Error("Google OAuth configuration is invalid.");
}

function getLocalSecret() {
  const secretPath = path.join(process.cwd(), ".session_secret");
  try {
    return readFileSync(secretPath, "utf8").trim();
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }

  const secret = randomBytes(48).toString("base64url");
  try {
    writeFileSync(secretPath, secret, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return secret;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      throw error;
    }
    return readFileSync(secretPath, "utf8").trim();
  }
}

const isProduction = process.env.NODE_ENV === "production";
const localSecret = isProduction ? "" : getLocalSecret();

function resolveBaseURL(): string {
  let raw = process.env.BETTER_AUTH_URL ?? process.env.FRONTEND_ORIGIN;
  if (raw) {
    raw = raw.split("#")[0].trim();
  }

  if (process.env.VERCEL) {
    if (!raw || raw.includes("localhost") || raw.includes("127.0.0.1")) {
      const vercelHost =
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL ||
        "exammate.triizync.com";
      raw = `https://${vercelHost}`;
    }
  }

  if (!raw) {
    return isProduction ? "https://exammate.triizync.com" : "http://localhost:3000";
  }

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  try {
    const url = new URL(raw);
    if (isProduction && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      url.protocol = "https:";
    }
    return url.origin;
  } catch {
    return isProduction ? "https://exammate.triizync.com" : "http://localhost:3000";
  }
}

const baseURL = resolveBaseURL();
const productionSecret = process.env.BETTER_AUTH_SECRET ?? "";
if (isProduction && productionSecret.length < 32) {
  throw new Error("Set BETTER_AUTH_SECRET to a private random value of at least 32 characters in production.");
}
const secret = isProduction ? productionSecret : productionSecret || localSecret;
const databaseUri = process.env.DB_URI;
if (!databaseUri) {
  throw new Error("Set DB_URI to your MongoDB connection string.");
}

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
};
const mongoClient = databaseUri
  ? (globalForMongo.mongoClient ?? new MongoClient(databaseUri))
  : (null as unknown as MongoClient);
if (process.env.NODE_ENV !== "production" && databaseUri) {
  globalForMongo.mongoClient = mongoClient;
}

export const auth = betterAuth({
  appName: "ExamMate",
  baseURL,
  secret,
  plugins: [oauthPopup()],
  account: {
    encryptOAuthTokens: true,
    updateAccountOnSignIn: true,
    storeAccountCookie: false,
    storeStateStrategy: "database",
    accountLinking: {
      allowUnlinkingAll: true,
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
    },
  },
  trustedOrigins: isProduction
    ? [
        new URL(baseURL).origin,
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "",
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "",
      ].filter((origin): origin is string => Boolean(origin))
    : [
        process.env.BETTER_AUTH_URL,
        process.env.FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter((origin): origin is string => Boolean(origin)),
  rateLimit: {
    enabled: isProduction,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/social": { window: 60, max: 10 },
    },
  },
  database: mongodbAdapter(mongoClient.db()),
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      accessType: "offline",
      prompt: "select_account consent",
      disableDefaultScope: true,
      scope: [
        "openid",
        "email",
        "profile",
      ],
    },
  },
});

/** Shared Mongo database for server-side security controls and application data. */
export async function getAuthDatabase() {
  if (!databaseUri) throw new Error("DB_URI is required.");
  await mongoClient.connect();
  return mongoClient.db();
}
