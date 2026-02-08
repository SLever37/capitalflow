
import React from 'react';
import { CalendarView } from '../../features/calendar/CalendarView';
import { UserProfile } from '../../types';
import { useToast } from '../../hooks/useToast';

interface AgendaModalProps {
    onClose: () => void;
    activeUser: UserProfile | null;
    onSystemAction: (type: string, meta: any) => void;
}

export const AgendaModal: React.FC<AgendaModalProps> = ({ onClose, activeUser, onSystemAction }) => {
    const { showToast } = useToast();

    // Agora renderiza diretamente o CalendarView que possui seu próprio overlay fixo (fixed inset-0)
    return (
        <CalendarView 
            activeUser={activeUser}
            showToast={showToast}
            onClose={onClose}
            onSystemAction={onSystemAction}
        />
    );
};
