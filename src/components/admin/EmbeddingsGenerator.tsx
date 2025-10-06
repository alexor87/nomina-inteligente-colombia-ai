import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, CheckCircle2 } from "lucide-react";

export const EmbeddingsGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    failed: number;
    total: number;
  } | null>(null);
  const { toast } = useToast();

  const generateEmbeddings = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('populate-knowledge-embeddings');

      if (error) throw error;

      if (data.success) {
        setResult(data);
        toast({
          title: "✅ Embeddings generados exitosamente",
          description: `Procesados: ${data.processed} | Fallidos: ${data.failed} | Total: ${data.total}`,
        });
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error: any) {
      console.error('Error generando embeddings:', error);
      toast({
        title: "❌ Error al generar embeddings",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Generador de Embeddings RAG
        </CardTitle>
        <CardDescription>
          Genera embeddings vectoriales para los documentos de la base de conocimiento legal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Esta herramienta procesará todos los documentos en <code>legal_knowledge_base</code> que no tienen embeddings y generará vectores semánticos usando Lovable AI.</p>
          <p className="mt-2">Los embeddings permiten a Maya realizar búsquedas semánticas precisas sobre legislación laboral colombiana.</p>
        </div>

        <Button 
          onClick={generateEmbeddings} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando embeddings...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Generar Embeddings
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Proceso completado
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Procesados</div>
                <div className="text-2xl font-bold text-green-600">{result.processed}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fallidos</div>
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">{result.total}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
