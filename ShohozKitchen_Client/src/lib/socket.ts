import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Derive the socket origin from the REST API base URL by stripping a trailing /api.
function getSocketUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    return apiUrl.replace(/\/api\/?$/, '');
}

function readToken(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('token') || undefined;
}

/**
 * Connect (or reconnect) the singleton socket using the given token,
 * falling back to the token stored in localStorage. SSR-safe.
 */
export function connectSocket(token?: string): Socket | null {
    if (typeof window === 'undefined') return null;

    const authToken = token || readToken();

    // Reuse an already-connected socket with the same auth.
    if (socket) {
        if (socket.connected) return socket;
        socket.auth = { token: authToken };
        socket.connect();
        return socket;
    }

    socket = io(getSocketUrl(), {
        auth: { token: authToken },
        autoConnect: true,
        transports: ['websocket', 'polling'],
    });

    return socket;
}

/**
 * Return the existing socket, creating/connecting one if necessary. SSR-safe.
 */
export function getSocket(): Socket | null {
    if (typeof window === 'undefined') return null;
    if (!socket) return connectSocket();
    return socket;
}

/**
 * Disconnect and dispose the singleton socket.
 */
export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
