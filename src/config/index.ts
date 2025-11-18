import dotenv from 'dotenv';

dotenv.config();

interface Config {
  telegram: {
    botToken: string;
  };
  openrouter: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  googleDocs: {
    documentIds: string[];
    serviceAccountPath: string;
  };
  textProcessing: {
    maxContextTokens: number;
    chunkSize: number;
    chunkOverlap: number;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

export const config: Config = {
  telegram: {
    botToken: getEnvVar('TELEGRAM_BOT_TOKEN'),
  },
  openrouter: {
    apiKey: getEnvVar('OPENROUTER_API_KEY'),
    model: getEnvVar('OPENROUTER_MODEL', 'anthropic/claude-3.5-sonnet'),
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  googleDocs: {
    documentIds: (process.env.GOOGLE_DOC_IDS || process.env.GOOGLE_DOC_ID || '')
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0),
    serviceAccountPath: getEnvVar('GOOGLE_SERVICE_ACCOUNT_PATH', './google-credentials.json'),
  },
  textProcessing: {
    maxContextTokens: parseInt(getEnvVar('MAX_CONTEXT_TOKENS', '8000')),
    chunkSize: parseInt(getEnvVar('CHUNK_SIZE', '1000')),
    chunkOverlap: parseInt(getEnvVar('CHUNK_OVERLAP', '200')),
  },
};
