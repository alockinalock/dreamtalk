from services.db_service import get_session, update_session

def update_conversation_text(session_id, text_content):
    """Update conversation text in database."""
    session = get_session(session_id)
    if not session:
        raise ValueError("Session not found")
    
    update_session(session_id, new_text=text_content)