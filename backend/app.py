from flask import Flask, request, jsonify
from services.db_service import get_session, update_session
# from services.claude_service import generate_updated_mindmap
from services.merge_service import merge_mindmap 
# from utils.prompt_builder import build_prompt
from dotenv import load_dotenv
import os
from flask_cors import CORS

# Load environment variables
load_dotenv()
claude_key = os.getenv("CLAUDE_API_KEY")
print(claude_key)

# Initialize Flask app
app = Flask(__name__)
CORS(app) 

#routes

@app.route("/")
def index():
    return "Backend is running!"

@app.route("/update_text", methods=["POST"])
def update_text():
    session_id = request.form.get("session_id")
    file = request.files.get("file")

    if not session_id or file is None:
        return jsonify({"error": "session_id and file are required"}), 400

    # Read the contents of the uploaded .txt file
    file_contents = file.read().decode("utf-8") 

    # Make sure the session exists
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    # Store the new conversation text (overwrite existing)
    update_session(session_id, new_text=file_contents)

    return jsonify({"message": "Conversation text updated successfully"}), 200

#start the server
if __name__ == "__main__":
    app.run(debug=True)