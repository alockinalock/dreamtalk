# This is just for testing purposes and can be safly deleted later
from agent import agent

key = "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"

x = agent(api_key=key)
result = x.node_gen("backend/text.txt", "backend/nodes.json")

x.push(result)
print(result)