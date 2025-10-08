import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2, Send, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MayaAvatar } from './MayaAvatar';
import { useMaya } from './MayaProvider';
import { MayaReactivationButton } from './MayaReactivationButton';
import { MayaActionExecutor } from './components/MayaActionExecutor';
import { MayaTypingIndicator } from './components/MayaTypingIndicator';
import { MayaQuickReplies } from './components/MayaQuickReplies';

export const MayaFloatingAssistant: React.FC = () => {
  const location = useLocation();
  const { 
    currentMessage, 
    isVisible, 
    hideMessage, 
    showMessage,
    chatHistory,
    sendMessage,
    addActionMessage,
    isChatMode,
    setChatMode,
    clearConversation,
    advanceFlow,
    activeFlow
  } = useMaya();
  const [isMinimized, setIsMinimized] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // No mostrar el flotante si estamos en la página de MAYA
  if (location.pathname === '/maya') {
    return null;
  }

  // Conditional return AFTER all hooks
  if (!isVisible || !currentMessage) {
    return <MayaReactivationButton />;
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const message = userInput.trim();
    setUserInput('');
    setIsLoading(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChatMode = () => {
    setChatMode(!isChatMode);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, x: 50 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 100, x: 50 }}
      className="fixed bottom-6 right-6 z-50 max-w-sm"
    >
      <Card className="overflow-hidden shadow-2xl border-2 border-primary/20 bg-white/95 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <div className="flex items-center gap-3">
            <MayaAvatar 
              emotionalState={currentMessage?.emotionalState || 'neutral'} 
              isVisible={true}
              size="sm"
            />
            <div>
              <p className="font-semibold text-sm text-gray-900">MAYA</p>
              <p className="text-xs text-gray-600">
                {isChatMode ? 'Chat Interactivo' : 'Asistente de Nómina'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChatMode}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title={isChatMode ? 'Modo Información' : 'Modo Chat'}
            >
              <MessageSquare className={`h-4 w-4 ${isChatMode ? 'text-primary' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearConversation()}
              className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
              title="Limpiar conversación"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={hideMessage}
              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isChatMode ? (
                /* Chat Mode */
                <div className="h-80 flex flex-col">
                   {/* Chat Messages */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-3">
                     {chatHistory.length > 0 ? chatHistory.map((msg, index) => (
                       <div key={msg.id || index}>
                         <div
                           className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                         >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {msg.content}
                            </div>
                         </div>
                         
                          {/* Quick Replies for structured fields */}
                          {msg.role === 'assistant' && msg.quickReplies && msg.quickReplies.length > 0 && (
                            <div className="mt-2 pl-4">
                              <MayaQuickReplies
                                options={msg.quickReplies}
                                onSelect={async (selectedValue) => {
                                  console.log('🔘 Quick Reply Selected:', { 
                                    selectedValue, 
                                    isFlowMessage: msg.isFlowMessage,
                                    flowId: msg.flowId,
                                    stepId: msg.stepId,
                                    activeFlow: activeFlow?.flowId 
                                  });
                                  
                                  // If this is a flow message, advance the flow
                                  if (msg.isFlowMessage && activeFlow) {
                                    setIsLoading(true);
                                    try {
                                      await advanceFlow(selectedValue);
                                    } catch (error) {
                                      console.error('Error advancing flow:', error);
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  } else {
                                    // Standard chat mode behavior
                                    const selectedOption = msg.quickReplies?.find(opt => opt.value === selectedValue);
                                    const userResponse = selectedOption?.label || selectedValue;
                                    
                                    const updatedState = {
                                      ...(msg.conversationState || {}),
                                      [msg.fieldName || 'field']: selectedValue
                                    };
                                    
                                    setIsLoading(true);
                                    try {
                                      await sendMessage(userResponse, updatedState);
                                    } catch (error) {
                                      console.error('Error sending message:', error);
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  }
                                }}
                                disabled={isLoading}
                              />
                            </div>
                          )}
                          
                          {/* Executable Actions for Assistant Messages */}
                          {msg.role === 'assistant' && Array.isArray(msg.executableActions) && msg.executableActions.length > 0 && (
                            <div className="mt-2 pl-4">
                              <div className="mb-2">
                                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                  Acciones disponibles:
                                </p>
                              </div>
                              <MayaActionExecutor 
                                actions={msg.executableActions}
                                onActionExecuted={(action, result) => {
                                  console.log('🎯 Action executed (chat):', action.type, result);
                                  
                                  // Handle expand_periods responses
                                  if (action.type === 'expand_periods' && result?.data?.executableActions) {
                                    const employeeName = action.parameters?.employeeName || 'el empleado';
                                    addActionMessage(
                                      `Aquí tienes más opciones de períodos para ${employeeName}:`,
                                      result.data.executableActions
                                    );
                                  } else {
                                    // Handle all other action results with in-chat messages
                                    if (result.success) {
                                      addActionMessage(`✅ ${result.message}`, []);
                                    } else {
                                      addActionMessage(`❌ ${result.message}`, []);
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                       </div>
                    )) : (
                      <div className="text-center text-gray-500 text-sm mt-8">
                        <MayaAvatar emotionalState="neutral" isVisible={true} size="md" />
                        <p className="mt-2">¡Hola! Pregúntame lo que necesites sobre nómina.</p>
                      </div>
                     )}
                     
                     {/* Indicador de "Maya pensando" */}
                     {isLoading && (
                       <div className="flex justify-start">
                         <MayaTypingIndicator />
                       </div>
                     )}
                     
                     <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="border-t p-3">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={isLoading ? "Maya está pensando..." : "Escribe tu pregunta..."}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!userInput.trim() || isLoading}
                        className="px-3"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                /* Information Mode */
                <div className="p-4">
                  {currentMessage && (
                    <>
                      {/* Message */}
                       <div className="mb-3">
                         <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                           {currentMessage.message}
                         </p>
                       </div>

                       {/* Executable Actions */}
                       {Array.isArray(currentMessage.executableActions) && currentMessage.executableActions.length > 0 && (
                         <div>
                             <MayaActionExecutor 
                               actions={currentMessage.executableActions}
                               onActionExecuted={(action, result) => {
                                 console.log('🎯 Action executed (info):', action.type, result);
                                 
                                 // Handle expand_periods responses
                                 if (action.type === 'expand_periods' && result?.data?.executableActions) {
                                   const employeeName = action.parameters?.employeeName || 'el empleado';
                                   addActionMessage(
                                     `Aquí tienes más opciones de períodos para ${employeeName}:`,
                                     result.data.executableActions
                                   );
                                   
                                   // Switch to chat mode to show the new message
                                   if (!isChatMode) {
                                     setChatMode(true);
                                   }
                                 } else {
                                   // Handle all other action results with in-chat messages
                                   if (result.success) {
                                     addActionMessage(`✅ ${result.message}`, []);
                                   } else {
                                     addActionMessage(`❌ ${result.message}`, []);
                                   }
                                   
                                   // Switch to chat mode to show the feedback
                                   if (!isChatMode) {
                                     setChatMode(true);
                                   }
                                 }
                               }}
                             />
                         </div>
                       )}

                      {/* Contextual Actions (fallback) */}
                      {(!currentMessage.executableActions || currentMessage.executableActions.length === 0) && 
                       currentMessage.contextualActions && currentMessage.contextualActions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            Sugerencias:
                          </p>
                          {currentMessage.contextualActions.map((action, index) => (
                            <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded-md p-2">
                              {action}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          {new Date(currentMessage.timestamp).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Chat Mode Suggestion - Only show if no chat history */}
                  {chatHistory.length === 0 && (
                    <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs text-primary font-medium mb-2">💬 ¿Tienes preguntas?</p>
                      <p className="text-xs text-gray-600 mb-2">
                        Activa el modo chat para preguntarme directamente
                      </p>
                      <Button
                        onClick={toggleChatMode}
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                      >
                        Iniciar Chat
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Minimized State - Only Avatar */}
      {isMinimized && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -left-2 cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="relative">
            <MayaAvatar 
              emotionalState={currentMessage?.emotionalState || 'neutral'} 
              isVisible={true}
              size="md"
            />
            {isChatMode && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white">
                <MessageSquare className="h-2 w-2 text-white" />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};