import subprocess
import time
import os
import sys

def start_backend():
    backend_dir = os.path.join(os.getcwd(), "outlet-classifier", "backend")
    print(f"Starting Python Backend in {backend_dir}...")
    return subprocess.Popen([sys.executable, "backend.py"], cwd=backend_dir)

def start_frontend():
    frontend_dir = os.path.join(os.getcwd(), "outlet-classifier")
    print(f"Starting Next.js Frontend in {frontend_dir}...")
    # Use shell=True for npm on Windows
    return subprocess.Popen("npm run dev", cwd=frontend_dir, shell=True)

if __name__ == "__main__":
    try:
        backend_proc = start_backend()
        time.sleep(5) # Give it time to load the large CSV
        frontend_proc = start_frontend()
        
        print("\n" + "="*50)
        print("Whirlpool Assistant with Segmented Analytics is starting!")
        print("Frontend: http://localhost:3000")
        print("Backend API: http://localhost:8001")
        print("="*50 + "\n")
        
        # Keep the script running
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("Backend process died. Restarting...")
                backend_proc = start_backend()
            if frontend_proc.poll() is not None:
                print("Frontend process died. Restarting...")
                frontend_proc = start_frontend()
                
    except KeyboardInterrupt:
        print("\nShutting down processes...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)
