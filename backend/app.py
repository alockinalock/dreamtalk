from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv
import openai

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