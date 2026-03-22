import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});
