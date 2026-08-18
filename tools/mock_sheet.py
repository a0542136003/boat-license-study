"""Local stand-in for the Apps Script web app (for testing sync without Google).
Run: python tools/mock_sheet.py  ->  http://localhost:8766/exec"""
import json, http.server, time, os
LOG = []
class H(http.server.BaseHTTPRequestHandler):
    def _send(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_OPTIONS(self):
        self.send_response(204); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); self.end_headers()
    def do_GET(self):
        if 'action=stats' in self.path:
            stats = {}
            for ev in sorted(LOG, key=lambda e: e.get('ts', 0)):
                s = stats.setdefault(ev['qid'], {'seen': 0, 'right': 0, 'wrong': 0, 'skipped': 0, 'streak': 0, 'last': 0})
                s['seen'] += 1
                if ev['result'] == 'right': s['right'] += 1; s['streak'] += 1
                elif ev['result'] == 'wrong': s['wrong'] += 1; s['streak'] = 0
                elif ev['result'] == 'skipped': s['skipped'] += 1; s['streak'] = 0
                s['last'] = max(s['last'], ev.get('ts', 0))
            return self._send({'ok': True, 'stats': stats})
        return self._send({'ok': True, 'rows': len(LOG), 'sheet': 'MOCK'})
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); body = json.loads(self.rfile.read(n) or b'{}')
        LOG.extend(body.get('events', [])); print('added', len(body.get('events', [])), 'total', len(LOG))
        return self._send({'ok': True, 'added': len(body.get('events', [])), 'rows': len(LOG)})
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
if __name__ == '__main__':
    print('mock sheet on http://localhost:8766/exec'); http.server.ThreadingHTTPServer(('127.0.0.1', 8766), H).serve_forever()
