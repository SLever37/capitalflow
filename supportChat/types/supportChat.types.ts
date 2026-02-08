
export type MessageType = 'text' | 'image' | 'audio' | 'file' | 'location' | 'system' | 'call_start' | 'call_end';

export type TicketStatus = 'OPEN' | 'CLOSED';

export interface ChatAttachment {
    id: string;
    url: string;
    type: 'image' | 'video' | 'file' | 'audio';
    name: string;
    size?: number;
}

export interface SupportMessage {
    id: string;
    loan_id: string;
    profile_id: string; // Quem enviou
    sender_type: 'CLIENT' | 'OPERATOR' | 'SYSTEM';
    content: string; // Texto ou URL (se for mídia)
    file_url?: string;
    type: MessageType;
    metadata?: {
        duration?: number; // Para áudio
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
        callId?: string;
    };
    read_at?: string;
    created_at: string;
}

export interface SupportTicket {
    id: string;
    loan_id: string;
    status: TicketStatus;
    created_at: string;
    closed_at?: string;
    closed_by?: string;
}

export interface CallState {
    status: 'IDLE' | 'CALLING' | 'RINGING' | 'IN_CALL' | 'ENDED';
    type: 'AUDIO' | 'VIDEO';
    roomId: string;
    remoteStream?: MediaStream;
}