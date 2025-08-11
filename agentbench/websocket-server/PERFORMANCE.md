# WebSocket Performance Testing and Optimization

This document provides comprehensive performance testing and optimization guidelines for the AgentBench WebSocket server.

## Test Suite Overview

The WebSocket test suite includes three main testing categories:

1. **Performance Testing** - Measures throughput, latency, and resource usage
2. **Connection Testing** - Tests connection establishment, reconnection, and stability
3. **Reliability Testing** - Evaluates message delivery, error handling, and fault tolerance

## Running Tests

### Individual Test Categories

```bash
# Run performance tests
npm run test:performance

# Run connection tests
npm run test:connection

# Run reliability tests
npm run test:reliability

# Run all tests
npm run test

# Run comprehensive test suite
npm run test:suite
```

### Test Configuration

Environment variables can be used to configure test behavior:

```bash
# Test configuration
export TEST_CLIENT_COUNT=50
export TEST_MESSAGES_PER_CLIENT=100
export TEST_DURATION=60000
export TEST_FAILURE_RATE=0.1
export TEST_ENABLE_LOGGING=true
export TEST_OUTPUT_DIR=./test-results
```

## Performance Testing

### Test Scenarios

1. **Small Load Test** - 10 clients, 100 messages each
2. **Medium Load Test** - 50 clients, 200 messages each
3. **High Load Test** - 100 clients, 500 messages each
4. **Stress Test** - 200 clients, 1000 messages each
5. **Latency Test** - 20 clients, 1000 small messages each

### Key Metrics

- **Messages per Second** - Throughput measurement
- **Average Latency** - Message delivery time
- **Memory Usage** - Server memory consumption
- **Connection Time** - Time to establish connections
- **Error Rate** - Percentage of failed operations

### Performance Optimization

#### Server-Side Optimizations

1. **Connection Pooling**
   - Reuse connections when possible
   - Implement connection limits
   - Use connection pooling libraries

2. **Message Processing**
   - Implement message batching
   - Use binary message formats
   - Optimize serialization/deserialization

3. **Resource Management**
   - Monitor memory usage
   - Implement garbage collection
   - Use efficient data structures

4. **Network Optimization**
   - Enable compression
   - Optimize buffer sizes
   - Use TCP_NODELAY

#### Client-Side Optimizations

1. **Connection Management**
   - Implement connection reuse
   - Use connection timeouts
   - Handle connection failures gracefully

2. **Message Handling**
   - Implement message queuing
   - Use async processing
   - Handle backpressure

## Connection Testing

### Test Scenarios

1. **Basic Connection Test** - Tests basic connection establishment
2. **High Volume Connection Test** - Tests multiple concurrent connections
3. **Reconnection Stress Test** - Tests reconnection under failure conditions

### Key Metrics

- **Connection Success Rate** - Percentage of successful connections
- **Connection Time** - Time to establish connection
- **Reconnection Success Rate** - Percentage of successful reconnections
- **Reconnection Time** - Time to reestablish connection

### Connection Optimization

#### Server Configuration

```typescript
// WebSocket server configuration
const wss = new WebSocket.Server({
  port: 3001,
  maxPayload: 16 * 1024 * 1024, // 16MB
  verifyClient: (info, cb) => {
    // Client verification logic
    cb(true);
  }
});
```

#### Client Configuration

```typescript
// WebSocket client configuration
const client = new WebSocket('ws://localhost:3001', {
  perMessageDeflate: {
    zlibDeflateOptions: {
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    threshold: 1024
  }
});
```

## Reliability Testing

### Test Scenarios

1. **Normal Operation Test** - Tests under normal conditions
2. **Low Failure Rate Test** - Tests with 5% failure rate
3. **High Failure Rate Test** - Tests with 15% failure rate
4. **Extreme Conditions Test** - Tests with 25% failure rate

### Key Metrics

- **Message Loss Rate** - Percentage of lost messages
- **Session Success Rate** - Percentage of successful sessions
- **Error Rate** - Percentage of errors
- **Delivery Time** - Time to deliver messages

### Reliability Enhancements

#### Message Reliability

1. **Acknowledgment System**
   - Implement message ACKs
   - Use message IDs
   - Track message delivery

2. **Retry Mechanism**
   - Implement exponential backoff
   - Set retry limits
   - Handle retry failures

3. **Message Ordering**
   - Use sequence numbers
   - Implement message ordering
   - Handle out-of-order messages

#### Error Handling

1. **Connection Errors**
   - Implement graceful degradation
   - Use fallback mechanisms
   - Log connection errors

2. **Message Errors**
   - Validate message format
   - Handle malformed messages
   - Implement error recovery

## Monitoring and Metrics

### Real-time Monitoring

```typescript
// Metrics collection
const metrics = {
  connectedClients: 0,
  activeSessions: 0,
  totalMessages: 0,
  messagesPerSecond: 0,
  averageLatency: 0,
  errorRate: 0,
  memoryUsage: process.memoryUsage()
};
```

### Performance Monitoring

1. **Connection Monitoring**
   - Track active connections
   - Monitor connection lifecycle
   - Alert on connection issues

2. **Message Monitoring**
   - Track message throughput
   - Monitor message latency
   - Alert on message loss

3. **Resource Monitoring**
   - Monitor memory usage
   - Track CPU usage
   - Monitor disk usage

## Production Deployment

### Production Configuration

```bash
# Environment variables for production
export NODE_ENV=production
export WS_PORT=3001
export MAX_CONNECTIONS=1000
export MAX_SESSIONS=1000
export SESSION_TIMEOUT=1800000
export ENABLE_METRICS=true
export ENABLE_LOGGING=false
export JWT_SECRET=your-production-secret-key
```

### Scaling Considerations

1. **Horizontal Scaling**
   - Use load balancers
   - Implement session sharing
   - Use distributed messaging

2. **Vertical Scaling**
   - Increase server resources
   - Optimize single-node performance
   - Use efficient algorithms

3. **High Availability**
   - Implement failover mechanisms
   - Use redundancy
   - Monitor system health

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check network connectivity
   - Verify server configuration
   - Monitor server resources

2. **High Latency**
   - Check network conditions
   - Optimize message processing
   - Monitor server load

3. **Memory Issues**
   - Monitor memory usage
   - Implement memory management
   - Check for memory leaks

### Debug Tools

1. **WebSocket Inspector**
   - Browser DevTools
   - Wireshark
   - Custom logging

2. **Performance Profiling**
   - Node.js Profiler
   - Chrome DevTools
   - Custom metrics

## Best Practices

### Code Quality

1. **TypeScript**
   - Use strict type checking
   - Implement interfaces
   - Use proper error handling

2. **Testing**
   - Write comprehensive tests
   - Use test coverage tools
   - Implement integration tests

3. **Documentation**
   - Document API endpoints
   - Provide usage examples
   - Maintain change logs

### Security

1. **Authentication**
   - Use JWT tokens
   - Implement proper validation
   - Rotate secrets regularly

2. **Authorization**
   - Implement role-based access
   - Use proper permissions
   - Audit access logs

3. **Data Protection**
   - Use encryption
   - Validate input data
   - Sanitize output data

## Conclusion

The WebSocket performance testing suite provides comprehensive tools for evaluating and optimizing the AgentBench WebSocket server. By following these guidelines and regularly running the test suite, you can ensure optimal performance, reliability, and scalability of your WebSocket implementation.

For more information about specific test scenarios or configuration options, refer to the individual test files in the `test/` directory.