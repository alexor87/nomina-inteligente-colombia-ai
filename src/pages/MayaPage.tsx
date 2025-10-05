import React from 'react';
import { MayaChatArea } from '@/components/maya-page/MayaChatArea';
import { MayaInputArea } from '@/components/maya-page/MayaInputArea';

export default function MayaPage() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden px-4 md:px-8 pb-4">
        <div className="max-w-5xl mx-auto h-full flex flex-col">
          <MayaChatArea />
          <MayaInputArea />
        </div>
      </div>
    </div>
  );
}
