from services.merge_service import merge_mindmap
import json

# Sample current mindmap
current_map = {
    "nodes": [
        {"id": 1, "text": "Topic A"},
        {"id": 2, "text": "Topic B"}
    ]
}

# Sample delta mindmap from Claude
delta_map = {
    "nodes": [
        {"id": 2, "text": "Updated Topic B"},  # updated
        {"id": 3, "text": "Topic C"}           # new
    ]
}

# Merge delta into current
merged_map = merge_mindmap(current_map, delta_map)

# Print results
print("Current Mindmap:", json.dumps(current_map, indent=2))
print("Delta Mindmap:", json.dumps(delta_map, indent=2))
print("Merged Mindmap:", json.dumps(merged_map, indent=2))
