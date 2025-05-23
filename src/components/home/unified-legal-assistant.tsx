// src/components/home/unified-legal-assistant.tsx
'use client';

import React, {useState, useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {ScrollArea} from '@/components/ui/scroll-area';
import {useToast} from '@/hooks/use-toast';
import { Switch } from "@/components/ui/switch";
import { Loader2, Scale, FileText, ListChecks, Library, PlusCircle, BookOpenText } from 'lucide-react';

import {identifyLaws, type IdentifyLawsOutput} from '@/ai/flows/identify-laws-flow';
import {retrievePrecedent, type RetrievePrecedentOutput} from '@/ai/flows/precedent-retrieval';
import {generateChecklist, type GenerateChecklistOutput} from '@/ai/flows/generate-checklist-flow';
import {summarizeDocument, type SummarizeDocumentOutput} from '@/ai/flows/document-summarization';
import {addDocumentToCustomLibrary, type AddDocumentInput} from '@/ai/flows/add-custom-document-flow';
import {fetchCloudflareRag, type FetchCloudflareRagResult} from '@/app/actions/fetch-cloudflare-rag';
import {parseStructuredLegalInfo, type ParseStructuredLegalInfoOutput} from '@/ai/flows/parse-structured-legal-info-flow';
import { useAuth } from '@/contexts/auth-context';
import { useHistory } from '@/contexts/history-context';
import { saveQueryHistory } from '@/services/history-service';



export function UnifiedLegalAssistant() {
  const { user, isDemo, endDemo } = useAuth();
  const { triggerRefresh } = useHistory();
  const {toast} = useToast();

  // Main query states
  const [mainQuery, setMainQuery] = useState('');
  const [isProcessingQuery, setIsProcessingQuery] = useState(false);
  const [lawsResult, setLawsResult] = useState<IdentifyLawsOutput | null>(null);
  const [precedentsResult, setPrecedentsResult] = useState<Omit<RetrievePrecedentOutput, 'sourceType'> & { sourceType: string } | null>(null);
  const [checklistResult, setChecklistResult] = useState<GenerateChecklistOutput | null>(null);
  const [useCustomLibrary, setUseCustomLibrary] = useState(false);


  // Document summarization states
  const [documentTextForSummary, setDocumentTextForSummary] = useState('');
  const [documentFileForSummary, setDocumentFileForSummary] = useState<File | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummarizeDocumentOutput | null>(null);

  // Custom RAG states
  const [customRagFile, setCustomRagFile] = useState<File | null>(null);
  const [customRagFileContent, setCustomRagFileContent] = useState<string | null>(null);
  const [isAddingToLibrary, setIsAddingToLibrary] = useState(false);


  React.useEffect(() => {
    const handleRestoreHistory = (event: CustomEvent) => {
      const { query, lawsResult, precedentsResult, checklistResult } = event.detail;

      // Restore the query and results
      setMainQuery(query);
      if (lawsResult) setLawsResult(lawsResult);
      if (precedentsResult) setPrecedentsResult(precedentsResult);
      if (checklistResult) setChecklistResult(checklistResult);

      // Scroll to the query input area
      const queryInputElement = document.querySelector('.assistant-card');
      if (queryInputElement) {
        queryInputElement.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Add event listener
    window.addEventListener('restore-query-history', handleRestoreHistory as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('restore-query-history', handleRestoreHistory as EventListener);
    };
  }, []);


  const handleFileChangeForSummary = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocumentFileForSummary(file);
      const reader = new FileReader();
      reader.onload = async e => {
        const text = e.target?.result as string;
        setDocumentTextForSummary(text);
      };
      reader.readAsText(file);
    }
  };

  const handleCustomRagFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomRagFile(file);
      const reader = new FileReader();
      reader.onload = async e => {
        const text = e.target?.result as string;
        setCustomRagFileContent(text);
      };
      reader.readAsText(file);
      toast({ title: "File Selected", description: `${file.name} ready to be added to your library.` });
    } else {
      setCustomRagFile(null);
      setCustomRagFileContent(null);
    }
  };

  const handleAddCustomRagDocument = useCallback(async () => {
    if (!customRagFileContent) {
      toast({ title: "No Content", description: "Please select a document file and ensure it has content.", variant: "destructive" });
      return;
    }
    setIsAddingToLibrary(true);
    try {
      const input: AddDocumentInput = { documentText: customRagFileContent };
      const result = await addDocumentToCustomLibrary(input);
      toast({
        title: "Library Updated",
        description: `${result.message} Library now contains ${result.librarySize} document(s).`
      });
      setCustomRagFile(null);
      setCustomRagFileContent(null);
      const fileInput = document.getElementById('custom-rag-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Error adding document to custom library:', error);
      toast({ title: "Error Adding Document", description: error.message || 'Failed to add document.', variant: "destructive" });
    } finally {
      setIsAddingToLibrary(false);
    }
  }, [customRagFileContent, toast]);


  const handleGetInsights = useCallback(async () => {
    if (!mainQuery.trim()) {
      toast({title: 'Input Required', description: 'Please enter a legal query.', variant: 'destructive'});
      return;
    }
    setIsProcessingQuery(true);
    setLawsResult(null);
    setPrecedentsResult(null);
    setChecklistResult(null);

    try {
      if (useCustomLibrary) {
        // Use existing Genkit flows for custom library
        const [lawsData, precedentsData, checklistData] = await Promise.all([
          identifyLaws({query: mainQuery}).catch(e => {
            console.error('Error identifying laws (custom):', e);
            toast({title: 'Error Identifying Laws', description: e.message || 'An unknown error occurred.', variant: 'destructive'});
            return null;
          }),
          retrievePrecedent({legalQuestion: mainQuery, useCustomLibrary: true}).catch(e => {
            console.error('Error retrieving precedents (custom):', e);
            toast({title: 'Error Retrieving Precedents', description: e.message || 'An unknown error occurred.', variant: 'destructive'});
            return null;
          }),
          generateChecklist({query: mainQuery, jurisdiction: 'India'}).catch(e => {
            console.error('Error generating checklist (custom):', e);
            toast({title: 'Error Generating Checklist', description: e.message || 'An unknown error occurred.', variant: 'destructive'});
            return null;
          }),
        ]);

        if (lawsData) setLawsResult(lawsData);
        if (precedentsData) setPrecedentsResult(precedentsData);
        if (checklistData) setChecklistResult(checklistData);
        if (lawsData || precedentsData || checklistData) {
          toast({title: 'Insights Generated (Custom Library)', description: 'Legal insights from your library have been processed.'});
        } else {
          toast({title: 'No Insights (Custom Library)', description: 'Could not generate insights from your custom library.', variant: 'destructive'});
        }

        // Save query history for custom library results
        if (user && !isDemo && (lawsData || precedentsData || checklistData)) {
          try {
            await saveQueryHistory({
              userId: user.uid,
              query: mainQuery,
              lawsResult: lawsData || null,
              precedentsResult: precedentsData || null,
              checklistResult: checklistData || null,
            });
            triggerRefresh(); // Refresh history after saving
          } catch (error) {
            console.error('Error saving query history:', error);
          }
        }
      } else {
        // Use Cloudflare AutoRAG and Genkit parser for default queries
        const cloudflareResult: FetchCloudflareRagResult = await fetchCloudflareRag({ userQuery: mainQuery });

        if (cloudflareResult.type === 'error') {
          console.error('Cloudflare RAG Error:', cloudflareResult.message, cloudflareResult.details);
          toast({ title: 'Cloudflare RAG Error', description: cloudflareResult.message, variant: 'destructive' });
          setIsProcessingQuery(false); // ensure button is re-enabled
          return;
        }

        if (!cloudflareResult.rawTextResponse.trim()) {
          toast({ title: 'Empty Response from Cloudflare', description: 'Cloudflare AutoRAG returned an empty response.', variant: 'destructive' });
          setLawsResult({ laws: [] });
          setPrecedentsResult({ precedents: [], sourceType: "Cloudflare AutoRAG (Empty)" });
          setChecklistResult({ checklist: [] });
          setIsProcessingQuery(false); // ensure button is re-enabled
          return;
        }

        const parsedData: ParseStructuredLegalInfoOutput = await parseStructuredLegalInfo({ rawText: cloudflareResult.rawTextResponse });

        setLawsResult({ laws: parsedData.laws || [] });
        setPrecedentsResult({ precedents: parsedData.precedents || [], sourceType: "Cloudflare AutoRAG" });
        setChecklistResult({ checklist: parsedData.checklist || [] });

        if (parsedData.laws.length > 0 || parsedData.precedents.length > 0 || parsedData.checklist.length > 0) {
          toast({title: 'Insights Generated (Cloudflare)', description: 'Legal insights via Cloudflare AutoRAG have been processed.'});
        } else {
          toast({title: 'No Structured Insights (Cloudflare)', description: 'Could not structure insights from Cloudflare response. The raw response might be incomplete or not in the expected format.', variant: 'destructive'});
        }

        // Save query history for Cloudflare results
        if (user && !isDemo) {
          try {
            await saveQueryHistory({
              userId: user.uid,
              query: mainQuery,
              lawsResult: { laws: parsedData.laws || [] },
              precedentsResult: { precedents: parsedData.precedents || [], sourceType: "Cloudflare AutoRAG" },
              checklistResult: { checklist: parsedData.checklist || [] },
            });
            triggerRefresh(); // Refresh history after saving
          } catch (error) {
            console.error('Error saving query history:', error);
          }
        }
      }

      if (isDemo) {
        // Show a toast notification that demo is complete
        toast({
          title: 'Demo Complete',
          description: 'Sign in to continue using NYAI and save your query history.',
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('Error processing query:', error);
      toast({title: 'Error', description: error.message || 'An unknown error occurred.', variant: 'destructive'});
    } finally {
      setIsProcessingQuery(false);
    }
  }, [mainQuery, toast, useCustomLibrary, user, isDemo, triggerRefresh]);

  const handleSummarizeDocument = useCallback(async () => {
    if (!documentTextForSummary.trim()) {
      toast({title: 'Input Required', description: 'Please upload or paste a document to summarize.', variant: 'destructive'});
      return;
    }
    setIsSummarizing(true);
    setSummaryResult(null);
    try {
      const result = await summarizeDocument({documentText: documentTextForSummary});
      setSummaryResult(result);
      toast({title: 'Document Summarized', description: 'The document has been successfully summarized.'});
    } catch (error: any) {
      console.error('Error summarizing document:', error);
      toast({title: 'Summarization Error', description: error.message || 'Failed to summarize the document.', variant: 'destructive'});
    } finally {
      setIsSummarizing(false);
    }
  }, [documentTextForSummary, toast]);

  const renderLoadingState = () => (
      <div className="flex flex-1 justify-center items-center h-full p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
  );

  const renderEmptyState = (message: string) => (
      <div className="flex flex-1 justify-center items-center h-full p-4">
        <p className="text-muted-foreground text-sm text-center">{message}</p>
      </div>
  );


  return (
      <ScrollArea className="flex-1 h-full bg-background">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-screen-2xl">
          <Card className="assistant-card">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl font-lora">Legal Query Input</CardTitle>
              <CardDescription>Enter your legal question or describe your case details below. Uses Cloudflare AutoRAG by default, or your custom library if switched on.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                  placeholder="Describe your legal situation, case, or question here..."
                  value={mainQuery}
                  onChange={e => setMainQuery(e.target.value)}
                  rows={4}
                  className="text-base"
              />
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                    id="custom-library-switch"
                    checked={useCustomLibrary}
                    onCheckedChange={setUseCustomLibrary}
                    aria-label="Toggle custom case library"
                />
                <Label htmlFor="custom-library-switch" className="text-sm">
                  Reference My Custom Case Library (Uses Gemini)
                </Label>
              </div>
              <Button onClick={handleGetInsights} disabled={isProcessingQuery} size="lg" className="w-full text-base bg-primary text-primary-foreground hover:bg-primary/90">
                {isProcessingQuery ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing Insights...
                    </>
                ) : (
                    'Get Legal Insights'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Legal Analysis covering the full width */}
          <Card className="assistant-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-lora"><Scale className="mr-2 h-5 w-5 text-primary" />Legal Analysis</CardTitle>
              {precedentsResult && <CardDescription className="text-xs pt-1">Precedents sourced from: {precedentsResult.sourceType}</CardDescription>}
            </CardHeader>
            <CardContent className="min-h-[450px] flex-1 flex flex-col">
              {isProcessingQuery && !lawsResult && !precedentsResult && !checklistResult && renderLoadingState()}
              <ScrollArea className="flex-1">
                <div className="space-y-6">
                  {/* Applicable Laws Section */}
                  <div>
                    <h3 className="font-semibold mb-2">Applicable Laws:</h3>
                    {lawsResult ? (
                        lawsResult.laws.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                              {lawsResult.laws.map((law, index) => (
                                  <li key={index}>{law}</li>
                              ))}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground">No specific laws or articles identified.</p>
                    ) : !isProcessingQuery ? <p className="text-sm text-muted-foreground">Applicable laws and articles will appear here.</p> : null}
                  </div>

                  {/* Similar Precedents Section */}
                  <div>
                    <h3 className="font-semibold mb-2">Similar Precedents:</h3>
                    {precedentsResult ? (
                        precedentsResult.precedents.length > 0 ? (
                            <div className="space-y-3">
                              {precedentsResult.precedents.map((p, index) => (
                                  <div key={index} className="p-3 border border-border/70 rounded-lg bg-background/40">
                                    <p className="font-semibold text-base font-lora">{p.caseName}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Citation: {p.citation}</p>
                                    <p className="text-sm mt-2">{p.summary}</p>
                                    {p.differences && (
                                        <div className="mt-2 pt-2 border-t border-border/50">
                                          <p className="text-xs font-semibold text-accent">Notable Differences:</p>
                                          <p className="text-xs text-accent/80">{p.differences}</p>
                                        </div>
                                    )}
                                  </div>
                              ))}
                            </div>
                        ) : <p className="text-sm text-muted-foreground">No relevant precedents found.</p>
                    ) : !isProcessingQuery ? <p className="text-sm text-muted-foreground">Relevant past court cases will appear here.</p> : null}
                  </div>

                  {/* Procedural Checklist Section */}
                  <div>
                    <h3 className="font-semibold mb-2">Procedural Checklist:</h3>
                    {checklistResult ? (
                        checklistResult.checklist.length > 0 ? (
                            <ul className="list-decimal pl-5 space-y-1 text-sm">
                              {checklistResult.checklist.map((item, index) => (
                                  <li key={index}>{item}</li>
                              ))}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground">No procedural checklist generated.</p>
                    ) : !isProcessingQuery ? <p className="text-sm text-muted-foreground">A procedural checklist based on your query will appear here.</p> : null}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Side-by-side layout for Custom Library and Document Simplification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="assistant-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-lora"><Library className="mr-2 h-5 w-5 text-primary" />My Custom Case Library</CardTitle>
                <CardDescription className="text-xs pt-1">Upload your documents (.txt, .md) to create a personalized knowledge base for the AI to reference.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="custom-rag-upload" className="text-sm font-medium">Upload Document</Label>
                  <Input id="custom-rag-upload" type="file" onChange={handleCustomRagFileChange} accept=".txt,.md" className="mt-1"/>
                </div>
                <Button onClick={handleAddCustomRagDocument} disabled={!customRagFile || isAddingToLibrary} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {isAddingToLibrary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {isAddingToLibrary ? 'Adding...' : 'Add to My Library'}
                </Button>
                <div className="mt-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    {customRagFile ? `Selected: ${customRagFile.name}` : "No document selected."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="assistant-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-lora"><BookOpenText className="mr-2 h-5 w-5 text-primary" />Simplify Document</CardTitle>
                <CardDescription className="text-xs pt-1">Upload or paste text from a single document (.txt, .md) to get a simplified summary.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="document-upload" className="text-sm font-medium">Upload Document</Label>
                  <Input id="document-upload" type="file" onChange={handleFileChangeForSummary} accept=".txt,.md" className="mt-1"/>
                </div>
                <Textarea
                    placeholder="Or paste document text here..."
                    value={documentTextForSummary}
                    onChange={e => {
                      setDocumentTextForSummary(e.target.value);
                      if (documentFileForSummary) setDocumentFileForSummary(null);
                    }}
                    rows={6}
                    className="text-sm"
                />
                <Button onClick={handleSummarizeDocument} disabled={isSummarizing || !documentTextForSummary.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {isSummarizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Summarizing...
                      </>
                  ) : (
                      'Summarize Document'
                  )}
                </Button>
                {isSummarizing && !summaryResult && renderLoadingState()}
                {summaryResult && (
                    <ScrollArea className="h-[150px] mt-4 pr-1">
                      <div className="p-3 border border-border/70 rounded-lg bg-background/40">
                        <p className="font-semibold text-base font-lora">Summary:</p>
                        <p className="text-sm whitespace-pre-wrap">{summaryResult.summary}</p>
                      </div>
                    </ScrollArea>
                )}
                {!isSummarizing && !summaryResult && !documentTextForSummary.trim() && (
                    <div className="flex justify-center items-center pt-2">
                      <p className="text-muted-foreground text-sm text-center">Upload or paste a document to get a summary.</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
  );
}
