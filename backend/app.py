from flask import Flask, request, jsonify
from services.db_service import get_session, update_session
from services.claude_service import generate_updated_mindmap
from services.diff_service import get_json_diff 
from utils.prompt_builder import build_prompt
from dotenv import load_dotenv
import os


# Load environment variables
load_dotenv()
claude_key = os.getenv("CLAUDE_API_KEY")
print(claude_key)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # allows all origins, can restrict later

@app.route("/")
def index():
    return "Backend is running!"

if __name__ == "__main__":
    app.run(debug=True)