
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade, connection',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;

  socket.onopen = async () => {
    console.log('🔌 Client WebSocket connected');
    
    try {
      const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
      if (!ELEVENLABS_API_KEY) {
        socket.send(JSON.stringify({
          type: 'error',
          error: 'ELEVENLABS_API_KEY not configured'
        }));
        socket.close();
        return;
      }

      // Connect to OpenAI Realtime API
      const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
      openAISocket = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${ELEVENLABS_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      openAISocket.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime API');
        
        // Send session configuration
        openAISocket?.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'Eres Ana, asistente especializada en nómina colombiana. Hablas en español colombiano natural y ayudas con consultas sobre empleados, nómina y navegación en el sistema.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: 'function',
                name: 'getActiveEmployees',
                description: 'Obtiene información de empleados activos de la empresa'
              },
              {
                type: 'function', 
                name: 'getPayrollPeriods',
                description: 'Obtiene información sobre períodos de nómina'
              },
              {
                type: 'function',
                name: 'getCompanyInfo', 
                description: 'Obtiene información general de la empresa'
              },
              {
                type: 'function',
                name: 'navigateToSection',
                description: 'Navega a una sección específica del sistema',
                parameters: {
                  type: 'object',
                  properties: {
                    section: { 
                      type: 'string',
                      description: 'La sección a la que navegar (empleados, nomina, reportes, etc.)'
                    }
                  },
                  required: ['section']
                }
              }
            ],
            tool_choice: 'auto',
            temperature: 0.8
          }
        }));

        // Notify client that connection is ready
        socket.send(JSON.stringify({
          type: 'session.created',
          session: { id: 'session_' + Date.now() }
        }));
      };

      openAISocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 OpenAI message:', data.type);
        
        // Forward message to client
        socket.send(JSON.stringify(data));
      };

      openAISocket.onerror = (error) => {
        console.error('❌ OpenAI WebSocket error:', error);
        socket.send(JSON.stringify({
          type: 'error',
          error: 'OpenAI connection error'
        }));
      };

      openAISocket.onclose = () => {
        console.log('🔌 OpenAI WebSocket closed');
        socket.close();
      };

    } catch (error) {
      console.error('❌ Error setting up OpenAI connection:', error);
      socket.send(JSON.stringify({
        type: 'error',
        error: 'Failed to connect to OpenAI'
      }));
      socket.close();
    }
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📤 Client message:', data.type);
    
    // Forward message to OpenAI
    if (openAISocket?.readyState === WebSocket.OPEN) {
      openAISocket.send(JSON.stringify(data));
    }
  };

  socket.onclose = () => {
    console.log('🔌 Client WebSocket closed');
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error('❌ Client WebSocket error:', error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});
