from pymongo import MongoClient
import os
from dotenv import load_dotenv
from bson.objectid import ObjectId 

# Load environment variables from .env
load_dotenv()

# Get the connection string
MONGO_URI = os.getenv("MONGO_URI")

# Connect to MongoDB
client = MongoClient(MONGO_URI)

# Select the database and collection
db = client["dreamtalk_db"]      # database name (whatever you named it in URI)
sessions = db["sessions"]        # collection name for user sessions

# Create a new session
def create_session():
    session_data = {
        "conversation_text": "",
        "nodes_json": "",  
    }
    result = sessions.insert_one(session_data)
    return str(result.inserted_id)

# Get a session by ID
def get_session(session_id):
    session = sessions.find_one({"_id": ObjectId(session_id)})
    if session:
        session["_id"] = str(session["_id"])  # convert ObjectId to string
    return session

# Update session data
def update_session(session_id, new_text=None, new_mindmap=None):
    update_fields = {}
    if new_text is not None:
        update_fields["conversation_text"] = new_text
    if new_mindmap is not None:
        update_fields["nodes_json"] = new_mindmap 

    sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": update_fields}
    )

# delete a session
def delete_session(session_id):
    sessions.delete_one({"_id": ObjectId(session_id)})
