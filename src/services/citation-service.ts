import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const EnhanceCitationInputSchema = z.object({
  caseName: z.string().describe('The name of the case to find citation for'),
});

const EnhanceCitationOutputSchema = z.object({
  citation: z.string().describe('The full and accurate citation for the case'),
});

type EnhanceCitationInput = z.infer<typeof EnhanceCitationInputSchema>;
type EnhanceCitationOutput = z.infer<typeof EnhanceCitationOutputSchema>;

// Define the prompt for citation enhancement
const enhanceCitationPrompt = ai.definePrompt({
  name: 'enhanceCitationPrompt',
  input: { schema: EnhanceCitationInputSchema },
  output: { schema: EnhanceCitationOutputSchema },
  prompt: `You are a legal citation expert specializing in Indian court cases.
  
Your task is to provide the full and accurate citation for the following Indian court case:

{{{caseName}}}

Please return ONLY the citation in the standard Indian legal citation format. 
If you cannot find the exact citation, provide the most likely citation format based on similar cases.
Do not include explanations or additional text - only return the citation itself.`,
});

// Define the flow for citation enhancement
const enhanceCitationFlow = ai.defineFlow(
  {
    name: 'enhanceCitationFlow',
    inputSchema: EnhanceCitationInputSchema,
    outputSchema: EnhanceCitationOutputSchema,
  },
  async (input) => {
    const { output } = await enhanceCitationPrompt(input);
    return output || { citation: 'Citation not found' };
  }
);

// Cache for storing previously looked-up citations
const citationCache = new Map<string, string>();

export async function enhanceCitation(caseName: string): Promise<string> {
  // Check cache first
  if (citationCache.has(caseName)) {
    return citationCache.get(caseName)!;
  }
  
  try {
    const result = await enhanceCitationFlow({ caseName });
    const enhancedCitation = result.citation;
    
    // Cache the result
    citationCache.set(caseName, enhancedCitation);
    
    return enhancedCitation;
  } catch (error) {
    console.error('Error enhancing citation:', error);
    return 'Citation enhancement failed';
  }
}

// Function to enhance multiple citations in parallel
export async function enhanceCitations(caseNames: string[]): Promise<Map<string, string>> {
  const uniqueCaseNames = [...new Set(caseNames)];
  const results = new Map<string, string>();
  
  // Process citations in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < uniqueCaseNames.length; i += batchSize) {
    const batch = uniqueCaseNames.slice(i, i + batchSize);
    const promises = batch.map(caseName => {
      return enhanceCitation(caseName).then(citation => {
        results.set(caseName, citation);
      });
    });
    
    await Promise.all(promises);
  }
  
  return results;
}