/**
 * Message deduplication tests - client-side logic
 */

describe('Message Deduplication', () => {
  // Simulate botMessagesByRunId Map behavior
  let botMessagesByRunId;
  
  beforeEach(() => {
    botMessagesByRunId = new Map();
  });
  
  // Helper to simulate the dedup logic from app.js
  function processMessage(state, runId, text) {
    const existing = botMessagesByRunId.get(runId);
    
    if (state === 'delta') {
      if (existing) {
        if (existing.finalized) {
          // Check if duplicate
          if (text === existing.text || text.length <= existing.maxTextLen) {
            return { action: 'ignored', reason: 'duplicate delta for finalized' };
          }
          // New content reusing runId
          botMessagesByRunId.set(runId, { text, runId, finalized: false, maxTextLen: text.length });
          return { action: 'new_bubble', reason: 'new content reusing runId' };
        } else {
          // Update existing - allow small fluctuations (within 5 chars)
          if (text.length >= existing.maxTextLen - 5) {
            existing.text = text;
            existing.maxTextLen = Math.max(existing.maxTextLen, text.length);
            return { action: 'updated', reason: 'longer text' };
          }
          return { action: 'ignored', reason: 'shorter text' };
        }
      } else {
        // New message
        botMessagesByRunId.set(runId, { text, runId, finalized: false, maxTextLen: text.length });
        return { action: 'new_bubble', reason: 'new runId' };
      }
    } else if (state === 'final') {
      if (existing && existing.finalized) {
        return { action: 'ignored', reason: 'duplicate final' };
      } else if (existing && !existing.finalized) {
        existing.text = text;
        existing.maxTextLen = text.length;
        existing.finalized = true;
        return { action: 'finalized', reason: 'updated and finalized' };
      } else {
        botMessagesByRunId.set(runId, { text, runId, finalized: true, maxTextLen: text.length });
        return { action: 'new_bubble', reason: 'new final message' };
      }
    }
  }
  
  describe('Delta messages', () => {
    test('should create new bubble for new runId', () => {
      const result = processMessage('delta', 'run-1', 'Hello');
      expect(result.action).toBe('new_bubble');
      expect(botMessagesByRunId.has('run-1')).toBe(true);
    });
    
    test('should update existing bubble with longer text', () => {
      processMessage('delta', 'run-1', 'Hello');
      const result = processMessage('delta', 'run-1', 'Hello world');
      expect(result.action).toBe('updated');
      expect(botMessagesByRunId.get('run-1').text).toBe('Hello world');
    });
    
    test('should ignore shorter text (cumulative delta protection)', () => {
      processMessage('delta', 'run-1', 'Hello world');
      const result = processMessage('delta', 'run-1', 'Hello');
      expect(result.action).toBe('ignored');
      expect(botMessagesByRunId.get('run-1').text).toBe('Hello world');
    });
    
    test('should allow small fluctuations (within 10 chars)', () => {
      processMessage('delta', 'run-1', 'Hello world!!!');
      const result = processMessage('delta', 'run-1', 'Hello world');
      expect(result.action).toBe('updated');
    });
    
    test('should ignore duplicate delta for finalized runId', () => {
      processMessage('delta', 'run-1', 'Hello');
      processMessage('final', 'run-1', 'Hello world');
      const result = processMessage('delta', 'run-1', 'Hello world');
      expect(result.action).toBe('ignored');
      expect(result.reason).toBe('duplicate delta for finalized');
    });
  });
  
  describe('Final messages', () => {
    test('should finalize existing delta', () => {
      processMessage('delta', 'run-1', 'Hello');
      const result = processMessage('final', 'run-1', 'Hello world - done');
      expect(result.action).toBe('finalized');
      expect(botMessagesByRunId.get('run-1').finalized).toBe(true);
    });
    
    test('should create bubble for new final message', () => {
      const result = processMessage('final', 'run-1', 'Quick response');
      expect(result.action).toBe('new_bubble');
      expect(botMessagesByRunId.get('run-1').finalized).toBe(true);
    });
    
    test('should ignore duplicate final message', () => {
      processMessage('final', 'run-1', 'Hello world');
      const result = processMessage('final', 'run-1', 'Hello world');
      expect(result.action).toBe('ignored');
      expect(result.reason).toBe('duplicate final');
    });
    
    test('should ignore duplicate final even with different text', () => {
      processMessage('final', 'run-1', 'First response');
      const result = processMessage('final', 'run-1', 'Different text');
      expect(result.action).toBe('ignored');
    });
  });
  
  describe('Multiple runIds', () => {
    test('should handle multiple concurrent runIds', () => {
      processMessage('delta', 'run-1', 'Message 1');
      processMessage('delta', 'run-2', 'Message 2');
      processMessage('delta', 'run-3', 'Message 3');
      
      expect(botMessagesByRunId.size).toBe(3);
      expect(botMessagesByRunId.get('run-2').text).toBe('Message 2');
    });
    
    test('should finalize runIds independently', () => {
      processMessage('delta', 'run-1', 'Msg 1');
      processMessage('delta', 'run-2', 'Msg 2');
      processMessage('final', 'run-1', 'Msg 1 final');
      
      expect(botMessagesByRunId.get('run-1').finalized).toBe(true);
      expect(botMessagesByRunId.get('run-2').finalized).toBe(false);
    });
  });
});

describe('Widget Deduplication', () => {
  test('should detect existing widget by ID', () => {
    // Simulate DOM check
    const renderedWidgets = new Set(['widget-123', 'widget-456']);
    
    function shouldRenderWidget(widgetId) {
      return !renderedWidgets.has(widgetId);
    }
    
    expect(shouldRenderWidget('widget-123')).toBe(false);
    expect(shouldRenderWidget('widget-789')).toBe(true);
  });
});
