"use client";

import { use } from "react";
import ChatPage from "../ChatPage";

export default function ChatAgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  return <ChatPage agentId={agentId} />;
}
