from openai import OpenAI
import json 


class agent:
    def __init__(self, api_key: str):
        """Initialize the OpenAI client and model configuration."""
        self.api_key = api_key
    

