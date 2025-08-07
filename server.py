import http.server
import socketserver
import webbrowser
import socket

PORT = 8000

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

Handler = http.server.SimpleHTTPRequestHandler
local_ip = get_local_ip()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at:")
    print(f"Local: http://localhost:{PORT}")
    print(f"Network: http://{local_ip}:{PORT}")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
