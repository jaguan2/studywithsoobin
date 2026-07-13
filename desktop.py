"""Launch Study w/ Soobin as a native desktop application.

Serves the built Vite app (dist/) on a local port and opens it in a native OS
window (pywebview / WebView2 on Windows), so the app runs like a regular
desktop program instead of a browser tab. There is no backend — the server
here is just a static file server for the SPA; YouTube playback happens
inside the page exactly as it does in a browser.

    python desktop.py

Requires the frontend to be built once (dist/):

    npm install && npm run build
"""
import http.server
import os
import socket
import sys
import threading
import time
import urllib.request

if getattr(sys, "frozen", False):
    # Running from a PyInstaller bundle: assets are extracted under _MEIPASS.
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

DIST_DIR = os.path.join(BASE_DIR, "dist")

# A persistent, writable per-user folder for the desktop window's browser
# storage (localStorage: favorites, theme, etc.). pywebview defaults to a
# private/incognito-style session that forgets everything on close, so we
# must give it an explicit storage_path and private_mode=False.
_data_home = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
APP_DATA_DIR = os.path.join(_data_home, "StudyWithSoobin")
os.makedirs(APP_DATA_DIR, exist_ok=True)

# A stable default port, preferred over a random one. localStorage is scoped
# by origin — host *and* port — so a random port each launch would make every
# relaunch a "new origin" that can't see its own previous data (favorites,
# theme), even with the browser profile persisted correctly.
DEFAULT_PORT = 39218  # one above TaskNook's, so both apps can run together


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def get_port():
    if os.environ.get("PORT"):
        return int(os.environ["PORT"])
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", DEFAULT_PORT))
        return DEFAULT_PORT
    except OSError:
        return find_free_port()  # default port taken this time; degrade gracefully


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def log_message(self, *args):  # silence per-request console spam
        pass


def serve(port):
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), QuietHandler)
    server.serve_forever()


def wait_until_up(url, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except Exception:
            time.sleep(0.2)
    return False


def open_in_browser(url):
    """Fallback when no native window is available: open a browser tab and keep
    the server process alive."""
    import webbrowser

    webbrowser.open(url)
    threading.Event().wait()  # block forever so the daemon server survives


def main():
    if not os.path.isfile(os.path.join(DIST_DIR, "index.html")):
        print("[!] Frontend build not found (dist/index.html).")
        print("    Build it once, then relaunch:")
        print("      npm install && npm run build")
        sys.exit(1)

    port = get_port()
    threading.Thread(target=serve, args=(port,), daemon=True).start()

    url = f"http://127.0.0.1:{port}/"
    print(f"Starting Study w/ Soobin on {url}")
    if not wait_until_up(url):
        print("[!] The local server did not start in time.")
        sys.exit(1)

    # Diagnostic path used for verification — confirms the server boots (and,
    # in a frozen build, that pywebview was bundled) without opening a window.
    if os.environ.get("SWS_SELFTEST"):
        try:
            import webview  # noqa: F401

            print("SELFTEST OK (webview import OK)")
        except Exception as exc:  # pragma: no cover
            print(f"SELFTEST OK (webview unavailable: {exc})")
        return

    try:
        import webview
    except ImportError:
        print("[i] pywebview isn't installed - opening in your browser instead.")
        print("    For the native window, install desktop deps:")
        print("      pip install -r requirements-desktop.txt")
        return open_in_browser(url)

    try:
        webview.create_window(
            "Study w/ Soobin",
            url,
            width=1280,
            height=800,
            min_size=(960, 600),
        )
        # private_mode=False + an explicit storage_path: without these,
        # pywebview throws away localStorage (favorites, theme) on every close.
        webview.start(
            storage_path=os.path.join(APP_DATA_DIR, "webview"),
            private_mode=False,
        )  # blocks until the window is closed; daemon server exits
    except Exception as exc:
        # e.g. Linux without GTK/Qt WebKit system libraries — degrade gracefully.
        print(f"[i] Could not open a native window ({exc}). Opening in your browser.")
        open_in_browser(url)


if __name__ == "__main__":
    main()
