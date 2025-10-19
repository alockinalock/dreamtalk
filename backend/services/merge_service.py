def merge_mindmap(current_map, delta_map):

    # Merge delta JSON into the current mindmap JSON.
    # Updates existing nodes if they exist, adds new nodes if not.

    # Create a dictionary of current nodes keyed by id
    current_nodes = {node["id"]: node for node in current_map.get("nodes", [])}

    # Process each node in the delta
    for node in delta_map.get("nodes", []):
        current_nodes[node["id"]] = node  # update if exists, add if new

    # Convert back to list for storing in MongoDB
    merged_map = {"nodes": list(current_nodes.values())}

    return merged_map
