from services.db_service import get_session, update_session
import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()
claude_key = os.getenv("CLAUDE_API_KEY")
client = anthropic.Anthropic(api_key=claude_key)

def get_conversation_data(session_id):
    """Retrieve conversation_text and nodes_json from database."""
    session = get_session(session_id)
    if not session:
        raise ValueError("Session not found")
    
    conversation_text = session.get("conversation_text", "")
    nodes_json = session.get("nodes_json", "")
    
    return conversation_text, nodes_json

def node_gen(convo_string: str, json_string: str) -> str:
    """Given conversation string and json string of existing nodes, generate updated node json string."""
    try:
        # Create the prompt for Claude
        prompt = f"""
        You are an AI that maintains a JSON-based mind map of an academic conversation between two people.
        The conversation text below includes all prior dialogue, and the last line represents the newest 10-second addition.
        Below is the current version of the mind map (JSON):
        {json_string}
        Full conversation text:
        {convo_string}
        (End of text)
        Step 1: Review and observe
        Examine the existing JSON to understand current nodes and their relationships.
        Read the conversation for context, but focus mainly on the final line to detect new or changed ideas.
        Step 2: Extract and interpret
        Identify new or evolved concepts from the final line only.
        If a concept already exists but gains new insights, extend its summary rather than creating duplicates.
        If a new concept appears, create a new node and connect it to relevant existing ones.
        Step 3: Update the graph
        Maintain all existing nodes and connections.
        Add or modify nodes as needed to reflect new developments in the conversation.
        Step 4: Output
        Return a fully updated JSON array using this schema:
        Format: {{"id": a number starting at 1 increment by 1, "name": "Name of the concept", "connections": [id of concept1, id of concept2], "longtext": "summary"}}
        Rules:
        Output must be valid JSON.
        Keep previous nodes intact.
        Add only truly new concepts or updated summaries."""
        
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=10000,
            system="You are a knowledge graph assistant that creates nodes and connections from text. Always respond with valid JSON. Finish all nodes you start.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        node_data = response.content[0].text.strip()
        print("\nOriginal response from Claude:", node_data)
        
        # Remove leading ```json or ``` if present
        if node_data.startswith('```json'):
            node_data = node_data[7:].strip()
        elif node_data.startswith('```'):
            node_data = node_data[3:].strip()
        # Remove trailing ``` if present
        if node_data.endswith('```'):
            node_data = node_data[:-3].strip()
        
        print("\nCleaned JSON string:", node_data)
        try:
            # Parse JSON to validate it
            parsed_json = json.loads(node_data)
            # Convert back to string with proper formatting
            node_data = json.dumps(parsed_json, ensure_ascii=False, indent=2)
            return node_data
        except json.JSONDecodeError as e:
            print(f"\nJSON Error details: {str(e)}")
            print(f"Error occurred at position {e.pos}")
            print(f"Line {e.lineno}, column {e.colno}")
            if e.pos < len(node_data):
                print(f"Context: ...{node_data[max(0, e.pos-50):min(len(node_data), e.pos+50)]}...")
            raise
    
    except Exception as e:
        raise Exception(f"Error generating node: {str(e)}")

def save_mindmap_to_db(session_id, nodes_json_string):
    """Update the database with new nodes_json string."""
    update_session(session_id, new_mindmap=nodes_json_string)