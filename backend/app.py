from flask import Flask, request, jsonify
from services.db_service import get_session, update_session, create_session, delete_session
from services.text_service import update_conversation_text
from dotenv import load_dotenv
import os
from flask_cors import CORS

# Load environment variables
load_dotenv()
claude_key = os.getenv("CLAUDE_API_KEY")

# Initialize Flask app
app = Flask(__name__)
CORS(app) 

#routes

@app.route("/")
def index():
    return "Backend is running!"

#creating new in database
@app.route("/create_session", methods=["POST"])
def create_session_route():
    session_id = create_session()
    return jsonify({"session_id": session_id}), 201

#updating text in database
@app.route("/update_mindmap", methods=["POST"])
def update_mindmap():
    # Extract from HTTP request
    session_id = request.form.get("session_id")
    file = request.files.get("file")
    
    if not session_id or file is None:
        return jsonify({"error": "Missing data"}), 400
    
    file_contents = file.read().decode("utf-8")
    
    # Call service (no HTTP stuff here)
    try:
        from services.claude_service import get_conversation_data, node_gen, save_mindmap_to_db
        
        # Update conversation text in database
        update_conversation_text(session_id, file_contents)
        
        # Get current conversation and nodes from database
        convo_string, json_string = get_conversation_data(session_id)
        
        # Generate updated nodes
        updated_nodes_string = node_gen(convo_string, json_string)
        
        # Save updated nodes back to database
        save_mindmap_to_db(session_id, updated_nodes_string)
        
        # Parse to JSON and return
        import json
        mindmap_json = json.loads(updated_nodes_string)
        return jsonify({"mindmap": mindmap_json}), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#start the server
if __name__ == "__main__":
    app.run(debug=True)

