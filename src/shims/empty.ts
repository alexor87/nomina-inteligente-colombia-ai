// No-op shim for '@elevenlabs/react' to prevent runtime/build issues if imported anywhere.
// This ensures the app keeps working even if a stray import remains.
export const Conversation = () => null;
export const VoiceProvider = ({ children }: { children?: any }) => children ?? null;
const ElevenLabsReactShim = {};
export default ElevenLabsReactShim;
