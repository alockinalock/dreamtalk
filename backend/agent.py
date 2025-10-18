from anthropic import Anthropic
import json 

# key: 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
class agent:
    def __init__(self, api_key: str):
        """Initialize the Anthropic client and model configuration."""
        self.api_key = api_key
        self.client = Anthropic(api_key=self.api_key)

    def node_gen(self, file_path: str) -> str:
        """Takes in a text file and outputs a node generation string using ChatGPT.
        
        Args:
            file_path (str): Path to the text file to process
            
        Returns:
            str: JSON string in the format {"ID": str, "connections": List[str], "content": str}
        """
        #-----------------------------------------------------------------------------
        try:
            # Read the input text file
            with open(file_path, 'r', encoding='utf-8') as file:
                text_content = file.read()
            
            # Create the prompt for ChatGPT
            prompt = f"""Analyze the following text and create a knowledge node with connections:
            Text: {text_content}
            
            Create a JSON response with:
            1. A unique identifier (ID)
            2. A list of key concepts this text connects to (connections)
            3. A concise summary of the main content
            
            Format: {{"ID": "unique_string", "connections": ["concept1", "concept2"], "content": "summary"}}"""
            #-----------------------------------------------------------------------------
            
            # Call Claude API
            response = self.client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=1000,
                system="You are a knowledge graph assistant that creates nodes and connections from text.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract and clean the response
            node_data = response.content[0].text.strip()
            # Remove markdown code block markers if present
            if node_data.startswith('```'):
                node_data = node_data.split('```')[1].strip()
                # If there's a language marker like 'json', remove it
                if node_data.lower().startswith('json'):
                    node_data = node_data[4:].strip()
            # Optionally print/log the raw response for debugging
            print("Raw Claude response:", node_data)
            # Ensure it's valid JSON
            json.loads(node_data)  # This will raise an error if the JSON is invalid
            return node_data
            
        except FileNotFoundError:
            raise FileNotFoundError(f"Could not find the file at {file_path}")
        except json.JSONDecodeError:
            raise ValueError("Claude response was not in valid JSON format")
        except Exception as e:
            raise Exception(f"Error generating node: {str(e)}")
    

