import requests

# Create a session
response = requests.post("http://localhost:5000/create_session")
data = response.json()
session_id = data["session_id"]

print(f"Created session: {session_id}")

# Update text
with open("test.txt", "w") as f:
    f.write("Hello, this is a test conversation.")

files = {"file": open("test.txt", "rb")}
form_data = {"session_id": session_id}

response = requests.post("http://localhost:5000/update_text", data=form_data, files=files)
print(response.json())