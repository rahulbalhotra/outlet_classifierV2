import webbrowser
import os

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(script_dir, "dashboard.html")

webbrowser.open(f"file://{html_path}")
print(f"Dashboard opened: {html_path}")
