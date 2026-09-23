import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { initSocket, closeSocket } from './app/utils/socket';
import { startCourierAutoSync } from './app/modules/courier/courier.cron';

process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
    console.error(error.message);
    process.exit(1);
});

// ── MongoDB Connection Caching ────────────────────────────────────
interface CachedConnection {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var mongooseCache: CachedConnection | undefined;
}

const cached: CachedConnection = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) global.mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const opts: mongoose.ConnectOptions = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        console.log('🔌 Connecting to MongoDB...');
        cached.promise = mongoose.connect(config.database_url, opts).then((m) => {
            // Log the host only — the connection string carries the DB password.
            console.log('✅ MongoDB Connected:', m.connection.host);
            return m;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        console.error('❌ MongoDB Connection Error:', error);
        throw error;
    }

    return cached.conn;
}

// ── Connect immediately ───────────────────────────────────────────
connectDB().catch((err) => console.error('❌ Initial MongoDB connection failed:', err));

// ── Start Server ─────────────────────────────────────────────────
const server = app.listen(config.port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║                                                  ║');
    console.log('║   🛒 Shohoz Kitchen API Server Started!             ║');
    console.log('║                                                  ║');
    console.log(`║   🌐 URL: http://localhost:${config.port}                  ║`);
    console.log(`║   🔧 Env:  ${String(config.env).padEnd(37)}║`);
    console.log('║                                                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
});

// ── Real-time Messaging (Socket.IO) ───────────────────────────────
initSocket(server);

// ── Steadfast courier auto status-sync (opt-in via STEADFAST_AUTO_SYNC) ──
startCourierAutoSync();

// Shut down for real, and within a bounded time.
//
// `server.close()` only fires its callback once every open connection has
// ended, and Socket.IO holds long-lived ones — so on its own it never
// completes. That is what left the API listening-but-dead on 2026-09-23: the
// process stayed alive with its listener closed, Docker saw a running
// container, and every request got a 502 for hours.
//
// So: close the Socket.IO server too, drop any remaining connections, and keep
// a hard timer that exits regardless.
const SHUTDOWN_GRACE_MS = 5000;

const shutdown = (reason: string, code: number) => {
    console.log(`${reason} Shutting down…`);

    const forced = setTimeout(() => {
        console.error('⏱️  Connections did not close in time — exiting anyway.');
        process.exit(code);
    }, SHUTDOWN_GRACE_MS);
    forced.unref();

    try {
        closeSocket();
    } catch (err) {
        console.error('Socket.IO shutdown failed:', err);
    }

    server.close(() => {
        clearTimeout(forced);
        console.log('💤 Process terminated.');
        process.exit(code);
    });

    // Node 18.2+: end idle keep-alive sockets so close() can actually finish.
    server.closeIdleConnections?.();
};

process.on('unhandledRejection', (error: Error) => {
    console.error('💥 UNHANDLED REJECTION!');
    console.error(error?.stack || error?.message || error);
    shutdown('', 1);
});

process.on('SIGTERM', () => shutdown('👋 SIGTERM received.', 0));
process.on('SIGINT', () => shutdown('👋 SIGINT received.', 0));

export default app;
