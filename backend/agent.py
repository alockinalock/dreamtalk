from anthropic import Anthropic
import json 

# key: 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
class agent:
    def __init__(self, api_key: str):
        """Initialize the Anthropic client and model configuration."""
        self.api_key = api_key
        self.client = Anthropic(api_key=self.api_key)


    def first_node(self, convo_file_path: str):
        """will always generate one node, the general topic"""

        try:
            with open(convo_file_path, 'r', encoding='utf-8') as file:
                text_content = file.read()

            # Create the prompt for ChatGPT
            prompt = f"""The following text represents an academic conversation between two people, with each speaker change signified by |. 
                First, determine a list of keywords representing the topics. Use these keywords to generate a flow of ideas similar to a node graph. 
                The idea is that these can be visualized to represent the conversation. Define a connection as a link between two keywords or a topic and subtopic.
                Text: {text_content}
                
                (Text end)
                Use the following JSON file to compare your list of keywords and connections. Discard any keywords that are identical to the ones already in the JSON file
                (identical entails same/similar keyword with exactly the same connections and same/similar summary).
                JSON: {"empty"}
            
                With the remaining keywords, output the following information for each keyword:
                1. The keyword
                2. A comma separated list of connections
                3. A concise summary of the discussion regarding the main concept
            
                Format: {{“id”: a number starting at 1 increment by 1, "name": "Name of the concept", "connections": [id of concept1, id of concept2], "longtext": "summary"}}"""
                #-----------------------------------------------------------------------------
                
                # Call Claude API
            response = self.client.messages.create(
                    model="claude-sonnet-4-5",
                    max_tokens=500,
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
            print("Raw Claude response:", node_data) # for testing purposes remove later
            # Ensure it's valid JSON
            json.loads(node_data)  # This will raise an error if the JSON is invalid
            return node_data
        
        except FileNotFoundError:
            raise FileNotFoundError(f"Could not find the file at {convo_file_path}.")
        

    def node_gen(self, convo_string: str, json_string: str ) -> str:
        """Given conversation string and json string of existing nodes, generate updated node json string."""
        try:
            # Create the prompt for ChatGPT
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

            Format: {{“id”: a number starting at 1 increment by 1, "name": "Name of the concept", "connections": [id of concept1, id of concept2], "longtext": "summary"}}


            Rules:

            Output must be valid JSON.

            Keep previous nodes intact.

            Add only truly new concepts or updated summaries."""
            #-----------------------------------------------------------------------------
            
            response = self.client.messages.create(
                            model="claude-sonnet-4-5",
                            max_tokens=10000,
                            system="You are a knowledge graph assistant that creates nodes and connections from text. Always respond with valid JSON. Finish all nodes you start.", 
                            messages=[
                                {"role": "user", "content": prompt}
                            ]
                        )
                        
            node_data = response.content[0].text.strip()
            print("\nOriginal response from Claude:", node_data)  # Debug print

            # Remove leading ```json or ``` if present
            if node_data.startswith('```json'):
                node_data = node_data[7:].strip()
            elif node_data.startswith('```'):
                node_data = node_data[3:].strip()
            # Remove trailing ``` if present
            if node_data.endswith('```'):
                node_data = node_data[:-3].strip()
            
            print("\nCleaned JSON string:", node_data)  # Debug print

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


    def node_gen(self, convo_file_path: str, json_file_path: str) -> str:
        """Takes in a text file and outputs a node generation string using ChatGPT.
        
        Args:
            file_path (str): Path to the text file to process
            
        Returns:
            str: JSON string in the format {"ID": str, "connections": List[str], "content": str}
        """
        #-----------------------------------------------------------------------------
        try:
            # Read the input text file
            with open(convo_file_path, 'r', encoding='utf-8') as file:
                text_content = file.read()
            
            # Reads the existing nodes from the json file
            with open(json_file_path, 'r', encoding='utf-8') as jf:
                try:
                    content = jf.read().strip()
                    if not content:
                        existing_nodes = []
                    else:
                        existing_nodes = json.loads(content)
                except json.JSONDecodeError:
                    existing_nodes = []
            
            # Text: {text_content, existing_nodes}

            # Create the prompt for ChatGPT
            prompt = f"""
            You are an AI that maintains a JSON-based mind map of an academic conversation between two people.
            The conversation text below includes all prior dialogue, and the last line represents the newest 10-second addition.

            Below is the current version of the mind map (JSON):
            {content}

            Full conversation text:
            {text_content}
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

            Format: {{“id”: a number starting at 1 increment by 1, "name": "Name of the concept", "connections": [id of concept1, id of concept2], "longtext": "summary"}}


            Rules:

            Output must be valid JSON.

            Keep previous nodes intact.

            Add only truly new concepts or updated summaries."""
            #-----------------------------------------------------------------------------
            
            # Call Claude API
            response = self.client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=10000,
                system="You are a knowledge graph assistant that creates nodes and connections from text. Always respond with valid JSON. Finish all nodes you start.", 
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract and clean the response
            node_data = response.content[0].text.strip()
            print("\nOriginal response from Claude:", node_data)  # Debug print

            # Remove leading ```json or ``` if present
            if node_data.startswith('```json'):
                node_data = node_data[7:].strip()
            elif node_data.startswith('```'):
                node_data = node_data[3:].strip()
            # Remove trailing ``` if present
            if node_data.endswith('```'):
                node_data = node_data[:-3].strip()
            
            print("\nCleaned JSON string:", node_data)  # Debug print

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
            
        except FileNotFoundError:
            raise FileNotFoundError(f"Could not find the file at {convo_file_path} or {json_file_path}.")
        except json.JSONDecodeError:
            raise ValueError("Claude response was not in valid JSON format")
        except Exception as e:
            raise Exception(f"Error generating node: {str(e)}")

    def push(self, node_json: str):
        """Adds generated node to node.json file
            Args:
                output to be added to node.json
            Returns:
                nothing
        """
        try:
            with open('backend/node.json', 'w', encoding='utf-8') as f:
                f.write(node_json + '\n')

        except FileNotFoundError:
            raise FileNotFoundError("The file node.json could not be found.")

    

