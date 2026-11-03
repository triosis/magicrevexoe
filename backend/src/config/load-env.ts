import path from 'node:path';
import dotenv from 'dotenv';

export const backendEnvPath = path.resolve(__dirname, '..', '..', '.env');

// Values already supplied by cPanel or the shell always win. The file is optional.
dotenv.config({ path: backendEnvPath, override: false, quiet: true });
