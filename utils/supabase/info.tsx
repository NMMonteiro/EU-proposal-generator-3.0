/**
 * Firebase Server Configuration
 * 
 * Target Project: eu-projects-generator-5-69dd0
 */

export const projectId = "eu-projects-generator-5-69dd0";

// For compatibility with previous imports in case any components use it
export const publicAnonKey = "firebase-authenticated-session";

export const isLocal = import.meta.env.DEV;

export const serverUrl = isLocal
  ? "http://localhost:5001/eu-projects-generator-5-69dd0/us-central1/server"
  : "https://server-m2g7qvz4va-uc.a.run.app";

export const functionsUrl = serverUrl;