"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGateway = void 0;
// Test file to isolate the issue
const ws_1 = require("ws");
const http_1 = require("http");
const events_1 = require("events");
// Simple test class
class TestGateway extends events_1.EventEmitter {
    constructor(jwtSecret) {
        super();
        this.clients = new Map();
        this.jwtSecret = jwtSecret;
        // 创建HTTP服务器
        this.server = (0, http_1.createServer)();
        // 创建WebSocket服务器
        this.wss = new ws_1.WebSocketServer({
            server: this.server,
            maxPayload: 1024 * 1024 // 1MB
        });
        this.setupWebSocketServer();
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
    }
    handleConnection(ws, req) {
        try {
            const requestUrl = new URL(req.url, `http://${req.headers.host}`);
            const token = requestUrl.searchParams.get('token') ||
                req.headers['authorization']?.replace('Bearer ', '');
            if (!token) {
                ws.close(1008, 'Missing authentication token');
                return;
            }
            const clientId = 'test-client-id';
            // 创建客户端状态
            const clientState = {
                id: clientId,
                userId: 'test-user',
                user: { id: 'test-user', username: 'test' },
                connectedAt: Date.now(),
                lastPing: Date.now(),
                isActive: true,
                sessionIds: [],
                subscriptions: []
            };
            this.clients.set(clientId, clientState)(ws).clientId = clientId(ws).isAlive = true;
            console.log(`Client connected: ${clientId}`);
        }
        catch (error) {
            console.error('Connection error:', error);
            ws.close(1008, 'Connection failed');
        }
    }
}
exports.TestGateway = TestGateway;
